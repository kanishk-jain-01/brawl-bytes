import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import passport from './auth/passport';
import authRoutes from './routes/auth';
import gameConstantsRoutes from './routes/gameConstants';
import charactersRoutes from './routes/characters';
import stagesRoutes from './routes/stages';
import { SocketManager } from './networking/SocketManager';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);

// Configure CORS for Socket.io
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  })
);

app.use(express.json());

// Initialize Passport
app.use(passport.initialize());

// Routes
app.use('/auth', authRoutes);
app.use('/api/constants', gameConstantsRoutes);
app.use('/api/characters', charactersRoutes);
app.use('/api/stages', stagesRoutes);

// Basic health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'brawl-bytes-backend',
  });
});

// Initialize Socket Manager for game room handling
const socketManager = new SocketManager(io);

// Set up periodic cleanup for disconnected players
const CLEANUP_INTERVAL = 30000; // 30 seconds
setInterval(() => {
  try {
    socketManager.cleanupDisconnectedPlayers();

    // Log cleanup stats
    const stats = socketManager.getDisconnectionStats();
    if (stats.totalDisconnectedPlayers > 0) {
      console.log(
        `🧹 Cleanup: ${stats.totalDisconnectedPlayers} disconnected players across ${stats.roomsWithDisconnectedPlayers} rooms`
      );
    }
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
}, CLEANUP_INTERVAL);

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`🚀 Brawl Bytes server running on port ${PORT}`);
  console.log(`📡 Socket.io server ready for connections`);
  console.log(`🧹 Cleanup interval set to ${CLEANUP_INTERVAL}ms`);
  console.log(
    `🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`
  );
});

export { app, server, io, socketManager };
