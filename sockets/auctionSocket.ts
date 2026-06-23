import { Server, Socket } from 'socket.io';
import SeatAuction from '../models/SeatAuction';

export function setupAuctionSockets(io: Server) {
  io.on('connection', (socket: Socket) => {
    // Join a specific showtime auction room
    socket.on('join_auction', async ({ showtimeId }) => {
      try {
        if (!showtimeId) return;
        socket.join(`auction_${showtimeId}`);
        console.log(`🎟️ Socket ${socket.id} joined auction room for showtime: ${showtimeId}`);
        
        // Return current active auctions for this showtime
        const activeAuctions = await SeatAuction.find({ 
          showtimeId, 
          status: 'open',
          expiresAt: { $gt: new Date() }
        }).populate('ownerId', 'name profileImage');
        
        socket.emit('initial_auctions', activeAuctions);
      } catch (err) {
        console.error('Error in join_auction socket event:', err);
      }
    });

    // Notify other buyers when a new bid is placed
    socket.on('new_bid_placed', ({ showtimeId, auctionId, highestBid, highestBidderName }) => {
      if (!showtimeId || !auctionId) return;
      
      // Broadcast to other users in the showtime room
      socket.to(`auction_${showtimeId}`).emit('bid_updated', {
        auctionId,
        highestBid,
        highestBidderName
      });
      console.log(`📈 Real-time: New bid of ${highestBid} on auction ${auctionId} by ${highestBidderName}`);
    });

    // Propose direct seat swap to another user
    socket.on('propose_seat_swap', ({ showtimeId, ownerId, targetSeat, proposerSeat, proposerName }) => {
      if (!showtimeId || !ownerId || !targetSeat) return;
      
      // Broadcast swap suggestion to the showtime room
      socket.to(`auction_${showtimeId}`).emit('swap_proposed', {
        ownerId,
        targetSeat,
        proposerSeat,
        proposerName
      });
      console.log(`🔄 Real-time swap proposal: ${proposerName} wants to swap seat ${proposerSeat} for ${targetSeat}`);
    });

    // Confirm swap
    socket.on('confirm_seat_swap', async ({ showtimeId, auctionId, finalSeatOwner, proposerSeat }) => {
      if (!showtimeId || !auctionId) return;
      
      try {
        await SeatAuction.findByIdAndUpdate(auctionId, { status: 'completed' });
        
        // Broadcast confirmation to the showtime room
        io.to(`auction_${showtimeId}`).emit('swap_confirmed', {
          auctionId,
          finalSeatOwner,
          proposerSeat
        });
        console.log(`✅ Swap confirmed for auction ${auctionId}: seat ${proposerSeat} swapped.`);
      } catch (err) {
        console.error('Error confirming swap via socket:', err);
      }
    });
  });
}
