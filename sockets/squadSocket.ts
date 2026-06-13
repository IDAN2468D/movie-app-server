import { Server, Socket } from 'socket.io';
import SquadSession from '../models/SquadSession';

export function setupSquadSockets(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log(`🔌 New Socket connection: ${socket.id}`);

    // Join a squad session room
    socket.on('join-squad', async ({ squadCode, userId, userName, email }) => {
      try {
        const roomName = `squad_${squadCode.toUpperCase()}`;
        socket.join(roomName);
        console.log(`👥 Socket ${socket.id} (User: ${userName}) joined room: ${roomName}`);

        // Update squad session member's socketId in MongoDB
        const session = await SquadSession.findOne({ squadCode: squadCode.toUpperCase() });
        if (session) {
          const memberIndex = session.members.findIndex(m => m.userId === userId);
          if (memberIndex !== -1) {
            (session.members[memberIndex] as any).socketId = socket.id;
          } else {
            session.members.push({
              userId,
              name: userName,
              email: email || '',
              socketId: socket.id,
              joinedAt: new Date()
            });
          }
          await session.save();

          // Broadcast updated squad details to the entire room
          io.to(roomName).emit('squad-update', session);
        }
      } catch (err) {
        console.error('Error in socket join-squad:', err);
      }
    });

    // Broadcast seat hovering
    socket.on('seat-hover', ({ squadCode, userId, userName, row, number, isHovering }) => {
      const roomName = `squad_${squadCode.toUpperCase()}`;
      // Broadcast to other users in room
      socket.to(roomName).emit('seat-hover-broadcast', {
        userId,
        userName,
        row,
        number,
        isHovering
      });
    });

    // Broadcast live cursor movements inside the group seat map
    socket.on('cursor-move', ({ squadCode, userId, userName, x, y }) => {
      const roomName = `squad_${squadCode.toUpperCase()}`;
      socket.to(roomName).emit('cursor-update', {
        userId,
        userName,
        x,
        y
      });
    });

    // Update member's snacks co-order tray state in MongoDB and broadcast to room
    socket.on('snack-update', async ({ squadCode, userId, snacks }) => {
      try {
        const roomName = `squad_${squadCode.toUpperCase()}`;
        const session = await SquadSession.findOne({ squadCode: squadCode.toUpperCase() });
        if (!session) return;

        const memberIndex = session.members.findIndex(m => m.userId === userId);
        if (memberIndex !== -1 && session.members[memberIndex]) {
          session.members[memberIndex].snacks = snacks;
          await session.save();
          io.to(roomName).emit('squad-update', session);
        }
      } catch (err) {
        console.error('Error in socket snack-update:', err);
      }
    });

    // Toggle seat reservation within the squad
    socket.on('seat-toggle', async ({ squadCode, userId, row, number }) => {
      try {
        const roomName = `squad_${squadCode.toUpperCase()}`;
        const session = await SquadSession.findOne({ squadCode: squadCode.toUpperCase() });
        if (!session) return;

        // Check if the seat is already locked by someone else
        const lockedByOtherIndex = session.lockedSeats.findIndex(
          s => s.row === row && s.number === number && s.userId !== userId
        );

        if (lockedByOtherIndex !== -1) {
          // Seat is already locked by another member, ignore or send error
          socket.emit('seat-toggle-error', { message: 'מושב זה כבר נתפס על ידי חבר אחר!' });
          return;
        }

        const seatIndex = session.lockedSeats.findIndex(
          s => s.row === row && s.number === number && s.userId === userId
        );

        if (seatIndex !== -1) {
          // User already locked it, unlock it now
          session.lockedSeats.splice(seatIndex, 1);
        } else {
          // Lock the seat
          session.lockedSeats.push({
            row,
            number,
            userId,
            lockedAt: new Date()
          });
        }

        await session.save();

        // Broadcast updated session data to the room
        io.to(roomName).emit('squad-update', session);
      } catch (err) {
        console.error('Error in socket seat-toggle:', err);
      }
    });

    // User explicitly leaving the squad
    socket.on('leave-squad', async ({ squadCode, userId }) => {
      try {
        const roomName = `squad_${squadCode.toUpperCase()}`;
        const session = await SquadSession.findOne({ squadCode: squadCode.toUpperCase() });
        if (session) {
          // Remove member
          session.members = session.members.filter(m => m.userId !== userId);
          // Unlock their seats
          session.lockedSeats = session.lockedSeats.filter(s => s.userId !== userId);

          await session.save();

          // Leave room
          socket.leave(roomName);
          console.log(`🚪 User ${userId} left room: ${roomName}`);

          // Broadcast update
          io.to(roomName).emit('squad-update', session);
        }
      } catch (err) {
        console.error('Error in socket leave-squad:', err);
      }
    });

    // Handle disconnect (automatic cleanup)
    socket.on('disconnect', async () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
      try {
        // Find squad session containing this socket
        const sessions = await SquadSession.find({ 'members.socketId': socket.id });
        
        for (const session of sessions) {
          const member = session.members.find(m => m.socketId === socket.id);
          if (member) {
            const roomName = `squad_${session.squadCode}`;
            
            // Clean up: set socketId to null or remove user if they were a guest,
            // or just clean their locks after a short grace period.
            // For CineBook premium simplicity, we'll release their locked seats and notify the group.
            session.lockedSeats = session.lockedSeats.filter(s => s.userId !== member.userId);
            
            // Set socketId to undefined/null to indicate offline status
            const memberIndex = session.members.findIndex(m => m.socketId === socket.id);
            if (memberIndex !== -1) {
              (session.members[memberIndex] as any).socketId = undefined;
            }

            await session.save();
            io.to(roomName).emit('squad-update', session);
            console.log(`🧹 Cleaned up locks/sockets for user ${member.name} in squad ${session.squadCode}`);
          }
        }
      } catch (err) {
        console.error('Error handling socket disconnect cleanup:', err);
      }
    });
  });
}
