import { Server, Socket } from 'socket.io';
import LoungeMessage from '../models/LoungeMessage';

export function setupLoungeSockets(io: Server) {
  io.on('connection', (socket: Socket) => {
    // Join a movie spoiler/after-credit lounge room
    socket.on('join_room', async ({ room }) => {
      try {
        if (!room) return;
        
        socket.join(room);
        console.log(`💬 Socket ${socket.id} joined lounge room: ${room}`);

        // Fetch past messages from MongoDB for this room
        const messages = await LoungeMessage.find({ room }).sort({ createdAt: 1 }).limit(50);
        
        // Map database fields to the format expected by the frontend
        const history = messages.map(msg => ({
          id: msg._id.toString(),
          user: msg.user,
          text: msg.text,
          isSystem: msg.isSystem,
          createdAt: msg.createdAt
        }));

        // Send chat history back to the user who just joined
        socket.emit('chat_history', history);
      } catch (err) {
        console.error('Error in socket join_room:', err);
      }
    });

    // Handle sending a message in the lounge
    socket.on('send_message', async (data) => {
      try {
        const { user, text, isSystem, room } = data;
        if (!room || !text) return;

        // Save message to MongoDB
        const newMessage = new LoungeMessage({
          user: user || 'אורח',
          text,
          isSystem: !!isSystem,
          room
        });

        await newMessage.save();

        const broadcastMsg = {
          id: newMessage._id.toString(),
          user: newMessage.user,
          text: newMessage.text,
          isSystem: newMessage.isSystem,
          room: newMessage.room,
          createdAt: newMessage.createdAt
        };

        // Broadcast to all other sockets in the room (excludes the sender to prevent duplication)
        socket.to(room).emit('receive_message', broadcastMsg);
      } catch (err) {
        console.error('Error in socket send_message:', err);
      }
    });
  });
}
