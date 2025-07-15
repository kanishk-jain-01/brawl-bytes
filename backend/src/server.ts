import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import passport from './auth/passport';

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

// Basic health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'brawl-bytes-backend',
  });
});

// Socket.io connection handling
io.on('connection', socket => {
  console.log(`Client connected: ${socket.id}`);

  // Basic connection test
  socket.emit('welcome', {
    message: 'Connected to Brawl Bytes server',
    socketId: socket.id,
  });

  socket.on('disconnect', reason => {
    console.log(`Client disconnected: ${socket.id}, reason: ${reason}`);
  });

  // Placeholder for game events
  socket.on('ping', callback => {
    if (callback) {
      callback({ pong: Date.now() });
    }
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`🚀 Brawl Bytes server running on port ${PORT}`);
  console.log(`📡 Socket.io server ready for connections`);
  console.log(
    `🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`
  );
});

export { app, server, io };
