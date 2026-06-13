import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import authRoutes from './routes/auth';
import ticketRoutes from './routes/tickets';
import userRoutes from './routes/users';
import reviewRoutes from './routes/reviews';
import snackRoutes from './routes/snacks';
import squadRoutes from './routes/squad';
import cinemaRoutes from './routes/cinema';
import vaultRoutes from './routes/vault';
import debateRoutes from './routes/debate';
import legacyRoutes from './routes/legacy';
import directorRoutes from './routes/director';
import http from 'http';
import { Server } from 'socket.io';
import { setupSquadSockets } from './sockets/squadSocket';
import { setupLoungeSockets } from './sockets/loungeSocket';

console.log('📧 Email Config:', process.env.EMAIL_USER ? `Loaded (${process.env.EMAIL_USER})` : 'Not loaded');


const app = express();
const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});
setupSquadSockets(io);
setupLoungeSockets(io);

// Middleware
app.use(cors());
app.use(express.json());

// Request Logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Routes


app.use('/api/auth', authRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/snacks', snackRoutes);
app.use('/api/squad', squadRoutes);
app.use('/api/cinema', cinemaRoutes);
app.use('/api/vault', vaultRoutes);
app.use('/api/debate', debateRoutes);
app.use('/api/legacy', legacyRoutes);
app.use('/api/director', directorRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// Error Handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error('🔥 Server Error:', err);
  res.status(err.status || 500).json({ 
    success: false, 
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/CineBook';

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB');
    server.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
  });
