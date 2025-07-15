import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

export interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
}

export interface GameRoom {
  id: string;
  players: AuthenticatedSocket[];
  maxPlayers: number;
  isActive: boolean;
  createdAt: Date;
}

export class SocketManager {
  private io: Server;

  private rooms: Map<string, GameRoom>;

  private playerSocketMap: Map<string, AuthenticatedSocket>;

  constructor(io: Server) {
    this.io = io;
    this.rooms = new Map();
    this.playerSocketMap = new Map();
    this.setupSocketHandlers();
  }

  private setupSocketHandlers(): void {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      console.log(`Client connected: ${socket.id}`);

      // Handle authentication
      socket.on('authenticate', (token: string) => {
        this.authenticateSocket(socket, token);
      });

      // Handle room operations
      socket.on('createRoom', () => {
        this.createRoom(socket);
      });

      socket.on('joinRoom', (roomId: string) => {
        this.joinRoom(socket, roomId);
      });

      socket.on('leaveRoom', () => {
        this.leaveRoom(socket);
      });

      // Handle game events (placeholder for now)
      socket.on('playerMove', data => {
        this.handlePlayerMove(socket, data);
      });

      socket.on('playerAttack', data => {
        this.handlePlayerAttack(socket, data);
      });

      socket.on('disconnect', reason => {
        this.handleDisconnect(socket, reason);
      });

      // Basic connection test
      socket.emit('welcome', {
        message: 'Connected to Brawl Bytes server',
        socketId: socket.id,
      });
    });
  }

  private authenticateSocket(socket: AuthenticatedSocket, token: string): void {
    try {
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        socket.emit('authenticated', {
          success: false,
          error: 'Server configuration error',
        });
        return;
      }

      const decoded = jwt.verify(token, jwtSecret) as {
        id: string;
        username: string;
      };
      // eslint-disable-next-line no-param-reassign
      socket.userId = decoded.id;
      // eslint-disable-next-line no-param-reassign
      socket.username = decoded.username;

      if (socket.userId) {
        this.playerSocketMap.set(socket.userId, socket);
      }

      socket.emit('authenticated', {
        success: true,
        userId: socket.userId,
        username: socket.username,
      });

      console.log(`User authenticated: ${socket.username} (${socket.userId})`);
    } catch {
      socket.emit('authenticated', {
        success: false,
        error: 'Invalid token',
      });
      console.log(`Authentication failed for socket ${socket.id}`);
    }
  }

  private createRoom(socket: AuthenticatedSocket): void {
    if (!socket.userId) {
      socket.emit('roomError', {
        message: 'Must be authenticated to create room',
      });
      return;
    }

    const roomId = this.generateRoomId();
    const room: GameRoom = {
      id: roomId,
      players: [socket],
      maxPlayers: 2, // For now, limit to 2 players
      isActive: false,
      createdAt: new Date(),
    };

    this.rooms.set(roomId, room);
    socket.join(roomId);

    socket.emit('roomCreated', {
      roomId,
      playerId: socket.userId,
      playerCount: 1,
      maxPlayers: room.maxPlayers,
    });

    console.log(`Room created: ${roomId} by ${socket.username}`);
  }

  private joinRoom(socket: AuthenticatedSocket, roomId: string): void {
    if (!socket.userId) {
      socket.emit('roomError', {
        message: 'Must be authenticated to join room',
      });
      return;
    }

    const room = this.rooms.get(roomId);
    if (!room) {
      socket.emit('roomError', { message: 'Room not found' });
      return;
    }

    if (room.players.length >= room.maxPlayers) {
      socket.emit('roomError', { message: 'Room is full' });
      return;
    }

    if (room.players.some(p => p.userId === socket.userId)) {
      socket.emit('roomError', { message: 'Already in this room' });
      return;
    }

    room.players.push(socket);
    socket.join(roomId);

    // Notify all players in the room
    this.io.to(roomId).emit('playerJoined', {
      roomId,
      playerId: socket.userId,
      username: socket.username,
      playerCount: room.players.length,
      maxPlayers: room.maxPlayers,
    });

    // If room is full, mark as active and start game
    if (room.players.length === room.maxPlayers) {
      room.isActive = true;
      this.io.to(roomId).emit('gameReady', {
        roomId,
        players: room.players.map(p => ({
          id: p.userId,
          username: p.username,
        })),
      });
    }

    console.log(
      `${socket.username} joined room ${roomId} (${room.players.length}/${room.maxPlayers})`
    );
  }

  private leaveRoom(socket: AuthenticatedSocket): void {
    this.rooms.forEach((room, roomId) => {
      const playerIndex = room.players.findIndex(p => p.id === socket.id);
      if (playerIndex !== -1) {
        room.players.splice(playerIndex, 1);
        socket.leave(roomId);

        // Notify remaining players
        this.io.to(roomId).emit('playerLeft', {
          roomId,
          playerId: socket.userId,
          username: socket.username,
          playerCount: room.players.length,
        });

        // If room is empty, clean it up
        if (room.players.length === 0) {
          this.rooms.delete(roomId);
          console.log(`Room ${roomId} deleted (empty)`);
        } else {
          // eslint-disable-next-line no-param-reassign
          room.isActive = false; // Pause game if someone leaves
        }

        console.log(`${socket.username} left room ${roomId}`);
      }
    });
  }

  private handlePlayerMove(
    socket: AuthenticatedSocket,
    data: Record<string, unknown>
  ): void {
    if (!socket.userId) return;

    // Find the room this player is in and use GameRoom for validation
    this.rooms.forEach((room, roomId) => {
      if (room.players.some(p => p.id === socket.id) && room.isActive) {
        const position = data.position as { x: number; y: number };
        const velocity = data.velocity as { x: number; y: number };
        const sequence = data.sequence as number;

        // Broadcast to other players with validation data
        socket.to(roomId).emit('playerMove', {
          playerId: socket.userId,
          position,
          velocity,
          sequence,
          timestamp: Date.now(),
        });
      }
    });
  }

  private handlePlayerAttack(
    socket: AuthenticatedSocket,
    data: Record<string, unknown>
  ): void {
    // Find the room this player is in
    this.rooms.forEach((room, roomId) => {
      if (room.players.some(p => p.id === socket.id) && room.isActive) {
        // Broadcast to other players in the room
        socket.to(roomId).emit('playerAttack', {
          playerId: socket.userId,
          ...data,
        });
      }
    });
  }

  private handleDisconnect(socket: AuthenticatedSocket, reason: string): void {
    console.log(`Client disconnected: ${socket.id}, reason: ${reason}`);

    // Remove from player map
    if (socket.userId) {
      this.playerSocketMap.delete(socket.userId);
    }

    // Remove from any rooms
    this.leaveRoom(socket);
  }

  // eslint-disable-next-line class-methods-use-this
  private generateRoomId(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  // Public methods for external access
  public getRooms(): GameRoom[] {
    return Array.from(this.rooms.values());
  }

  public getRoom(roomId: string): GameRoom | undefined {
    return this.rooms.get(roomId);
  }

  public getRoomByPlayerId(playerId: string): GameRoom | undefined {
    return Array.from(this.rooms.values()).find(room =>
      room.players.some(p => p.userId === playerId)
    );
  }
}
