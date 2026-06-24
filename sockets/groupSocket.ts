import { Server, Socket } from 'socket.io';
import SquadBooking from '../models/SquadBooking';
import CineQuizLobby from '../models/CineQuizLobby';
import mongoose from 'mongoose';

export function setupGroupSockets(io: Server) {
  io.on('connection', (socket: Socket) => {
    // ── Collaborative Seating Sync ──
    socket.on('join_squad_booking', async ({ squadToken, userId, name }) => {
      try {
        if (!squadToken || !userId || !name || typeof name !== 'string') return;
        const roomName = `squad_${squadToken.toUpperCase()}`;
        socket.join(roomName);

        console.log(`👥 Socket ${socket.id} joined squad booking: ${squadToken}`);

        const colors = ['#FF1464', '#E5FF00', '#0AEFFF', '#8A2BE2', '#00FF66'];
        const userColor = colors[Math.floor(Math.random() * colors.length)];

        // Add user to squad members in DB if not exists
        const squad = await SquadBooking.findOne({ squadToken: squadToken.toUpperCase() });
        if (squad) {
          const exists = squad.members.some(m => m.userId.toString() === userId);
          if (!exists) {
            squad.members.push({
              userId: new mongoose.Types.ObjectId(userId),
              name,
              colorCode: userColor,
            } as any);
            await squad.save();
          }
          // Broadcast membership update
          io.to(roomName).emit('squad_members_updated', squad.members);
          // Send initial locked seats
          socket.emit('squad_initial_locks', squad.lockedSeats);
        }
      } catch (err) {
        console.error('Error in join_squad_booking:', err);
      }
    });

    socket.on('lock_seat', async ({ squadToken, seatNumber, userId }) => {
      try {
        if (!squadToken || !seatNumber || !userId) return;
        const roomName = `squad_${squadToken.toUpperCase()}`;

        const squad = await SquadBooking.findOne({ squadToken: squadToken.toUpperCase() });
        if (squad) {
          // Check if seat is already locked by someone else
          const alreadyLocked = squad.lockedSeats.some(s => s.seatNumber === seatNumber && s.lockedBy.toString() !== userId);
          if (alreadyLocked) {
            socket.emit('seat_lock_error', { seatNumber, message: 'המושב תפוס על ידי חבר קבוצה אחר' });
            return;
          }

          // Lock the seat in DB if not already locked by this user
          const myLock = squad.lockedSeats.some(s => s.seatNumber === seatNumber && s.lockedBy.toString() === userId);
          if (!myLock) {
            squad.lockedSeats.push({
              seatNumber,
              lockedBy: new mongoose.Types.ObjectId(userId),
              lockedAt: new Date(),
            });
            await squad.save();
          }

          io.to(roomName).emit('seat_locked_broadcast', { seatNumber, lockedBy: userId });
        }
      } catch (err) {
        console.error('Error in lock_seat:', err);
      }
    });

    socket.on('unlock_seat', async ({ squadToken, seatNumber, userId }) => {
      try {
        if (!squadToken || !seatNumber || !userId) return;
        const roomName = `squad_${squadToken.toUpperCase()}`;

        const squad = await SquadBooking.findOne({ squadToken: squadToken.toUpperCase() });
        if (squad) {
          squad.lockedSeats = squad.lockedSeats.filter(
            s => !(s.seatNumber === seatNumber && s.lockedBy.toString() === userId)
          );
          await squad.save();

          io.to(roomName).emit('seat_unlocked_broadcast', { seatNumber, unlockedBy: userId });
        }
      } catch (err) {
        console.error('Error in unlock_seat:', err);
      }
    });

    // ── CineQuiz Live Multiplayer Sync ──
    socket.on('join_quiz_room', async ({ lobbyToken, userId, name }) => {
      try {
        if (!lobbyToken || !userId) return;
        const roomName = `quiz_${lobbyToken.toUpperCase()}`;
        socket.join(roomName);

        console.log(`🎮 Socket ${socket.id} joined quiz lobby: ${lobbyToken}`);

        const lobby = await CineQuizLobby.findOne({ lobbyToken: lobbyToken.toUpperCase() });
        if (lobby) {
          io.to(roomName).emit('quiz_players_updated', lobby.players);
        }
      } catch (err) {
        console.error('Error in join_quiz_room:', err);
      }
    });

    socket.on('player_ready', async ({ lobbyToken, userId }) => {
      try {
        if (!lobbyToken || !userId) return;
        const roomName = `quiz_${lobbyToken.toUpperCase()}`;

        const lobby = await CineQuizLobby.findOne({ lobbyToken: lobbyToken.toUpperCase() });
        if (lobby) {
          const player = lobby.players.find(p => p.userId.toString() === userId);
          if (player) {
            player.ready = true;
            await lobby.save();
          }

          // Check if all players are ready and start game
          const allReady = lobby.players.every(p => p.ready);
          if (allReady && lobby.players.length > 0) {
            lobby.status = 'active';
            await lobby.save();
            io.to(roomName).emit('quiz_started', { questions: lobby.questions });
          } else {
            io.to(roomName).emit('quiz_players_updated', lobby.players);
          }
        }
      } catch (err) {
        console.error('Error in player_ready:', err);
      }
    });

    socket.on('submit_answer', async ({ lobbyToken, userId, scoreDelta }) => {
      try {
        if (!lobbyToken || !userId) return;
        const roomName = `quiz_${lobbyToken.toUpperCase()}`;

        const lobby = await CineQuizLobby.findOne({ lobbyToken: lobbyToken.toUpperCase() });
        if (lobby) {
          const player = lobby.players.find(p => p.userId.toString() === userId);
          if (player) {
            player.score += scoreDelta;
            await lobby.save();
          }

          io.to(roomName).emit('quiz_players_updated', lobby.players);
        }
      } catch (err) {
        console.error('Error in submit_answer:', err);
      }
    });

    socket.on('next_question', async ({ lobbyToken }) => {
      try {
        if (!lobbyToken) return;
        const roomName = `quiz_${lobbyToken.toUpperCase()}`;

        const lobby = await CineQuizLobby.findOne({ lobbyToken: lobbyToken.toUpperCase() });
        if (lobby) {
          if (lobby.currentQuestionIndex < lobby.questions.length - 1) {
            lobby.currentQuestionIndex += 1;
            await lobby.save();
            io.to(roomName).emit('quiz_next_question', { currentQuestionIndex: lobby.currentQuestionIndex });
          } else {
            lobby.status = 'finished';
            await lobby.save();
            io.to(roomName).emit('quiz_finished', { players: lobby.players });
          }
        }
      } catch (err) {
        console.error('Error in next_question:', err);
      }
    });
  });
}
