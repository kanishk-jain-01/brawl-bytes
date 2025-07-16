import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { MatchmakingQueue, MatchPreferences } from '../game/MatchmakingQueue';
import { GameRoom as ActualGameRoom } from '../game/GameRoom';

export interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
}

// Legacy interface for backward compatibility - will be phased out
export interface LegacyGameRoom {
  id: string;
  players: AuthenticatedSocket[];
  maxPlayers: number;
  isActive: boolean;
  createdAt: Date;
}

export class SocketManager {
  private io: Server;

  private legacyRooms: Map<string, LegacyGameRoom>;

  private gameRooms: Map<string, ActualGameRoom>;

  private playerSocketMap: Map<string, AuthenticatedSocket>;

  private matchmakingQueue: MatchmakingQueue;

  constructor(io: Server) {
    this.io = io;
    this.legacyRooms = new Map();
    this.gameRooms = new Map();
    this.playerSocketMap = new Map();
    this.matchmakingQueue = MatchmakingQueue.getInstance();

    // Set up the room registration callback for matchmaking
    this.matchmakingQueue.setRoomRegistrationCallback((roomId, gameRoom) => {
      this.registerGameRoom(roomId, gameRoom);
    });

    this.setupSocketHandlers();
  }

  /**
   * Register a GameRoom created by matchmaking
   */
  private registerGameRoom(roomId: string, gameRoom: ActualGameRoom): void {
    this.gameRooms.set(roomId, gameRoom);
    console.log(`Registered new game room: ${roomId}`);
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

      // Handle matchmaking events
      socket.on('joinMatchmakingQueue', (preferences?: MatchPreferences) => {
        this.joinMatchmakingQueue(socket, preferences);
      });

      socket.on('leaveMatchmakingQueue', () => {
        this.leaveMatchmakingQueue(socket);
      });

      socket.on('getQueueStatus', () => {
        this.getQueueStatus(socket);
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
    const room: LegacyGameRoom = {
      id: roomId,
      players: [socket],
      maxPlayers: 2, // For now, limit to 2 players
      isActive: false,
      createdAt: new Date(),
    };

    this.legacyRooms.set(roomId, room);
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

    const room = this.legacyRooms.get(roomId);
    if (!room) {
      socket.emit('roomError', { message: 'Room not found' });
      return;
    }

    if (room.players.length >= room.maxPlayers) {
      socket.emit('roomError', { message: 'Room is full' });
      return;
    }

    if (
      room.players.some((p: AuthenticatedSocket) => p.userId === socket.userId)
    ) {
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
        players: room.players.map((p: AuthenticatedSocket) => ({
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
    this.legacyRooms.forEach((room: LegacyGameRoom, roomId: string) => {
      const playerIndex = room.players.findIndex(
        (p: AuthenticatedSocket) => p.id === socket.id
      );
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
          this.legacyRooms.delete(roomId);
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
    this.legacyRooms.forEach((room: LegacyGameRoom, roomId: string) => {
      if (
        room.players.some((p: AuthenticatedSocket) => p.id === socket.id) &&
        room.isActive
      ) {
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
    this.legacyRooms.forEach((room: LegacyGameRoom, roomId: string) => {
      if (
        room.players.some((p: AuthenticatedSocket) => p.id === socket.id) &&
        room.isActive
      ) {
        // Broadcast to other players in the room
        socket.to(roomId).emit('playerAttack', {
          playerId: socket.userId,
          ...data,
        });
      }
    });
  }

  private joinMatchmakingQueue(
    socket: AuthenticatedSocket,
    preferences?: MatchPreferences
  ): void {
    if (!socket.userId) {
      socket.emit('matchmakingError', {
        message: 'Must be authenticated to join matchmaking queue',
      });
      return;
    }

    // Check if player is already in a room
    const currentRoom = this.getRoomByPlayerId(socket.userId);
    if (currentRoom) {
      socket.emit('matchmakingError', {
        message: 'Cannot join queue while in a room',
      });
      return;
    }

    const result = this.matchmakingQueue.addPlayer(socket, preferences);
    if (result.success) {
      socket.emit('queueJoined', {
        message: 'Successfully joined matchmaking queue',
        preferences,
      });
      console.log(`${socket.username} joined matchmaking queue`);
    } else {
      socket.emit('matchmakingError', {
        message: result.error || 'Failed to join queue',
      });
    }
  }

  private leaveMatchmakingQueue(socket: AuthenticatedSocket): void {
    if (!socket.userId) {
      socket.emit('matchmakingError', {
        message: 'Must be authenticated to leave matchmaking queue',
      });
      return;
    }

    const result = this.matchmakingQueue.removePlayer(socket.userId);
    if (result.success) {
      socket.emit('queueLeft', {
        message: 'Successfully left matchmaking queue',
      });
      console.log(`${socket.username} left matchmaking queue`);
    } else {
      socket.emit('matchmakingError', {
        message: 'Player was not in queue',
      });
    }
  }

  private getQueueStatus(socket: AuthenticatedSocket): void {
    if (!socket.userId) {
      socket.emit('matchmakingError', {
        message: 'Must be authenticated to get queue status',
      });
      return;
    }

    const status = this.matchmakingQueue.getPlayerQueueStatus(socket.userId);
    if (status) {
      socket.emit('queueStatusUpdate', status);
    } else {
      socket.emit('queueStatusUpdate', {
        status: 'not_in_queue',
        message: 'Player is not in matchmaking queue',
      });
    }
  }

  private handleDisconnect(socket: AuthenticatedSocket, reason: string): void {
    console.log(`Client disconnected: ${socket.id}, reason: ${reason}`);

    // Remove from player map
    if (socket.userId) {
      this.playerSocketMap.delete(socket.userId);
    }

    // Remove from matchmaking queue if in it
    if (socket.userId && this.matchmakingQueue.isPlayerInQueue(socket.userId)) {
      this.matchmakingQueue.removePlayer(socket.userId);
      console.log(
        `Removed ${socket.username} from matchmaking queue due to disconnect`
      );
    }

    // Remove from any rooms
    this.leaveRoom(socket);
  }

  // eslint-disable-next-line class-methods-use-this
  private generateRoomId(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  // Public methods for external access
  public getLegacyRooms(): LegacyGameRoom[] {
    return Array.from(this.legacyRooms.values());
  }

  public getGameRooms(): ActualGameRoom[] {
    return Array.from(this.gameRooms.values());
  }

  public getLegacyRoom(roomId: string): LegacyGameRoom | undefined {
    return this.legacyRooms.get(roomId);
  }

  public getGameRoom(roomId: string): ActualGameRoom | undefined {
    return this.gameRooms.get(roomId);
  }

  public getRoomByPlayerId(playerId: string): LegacyGameRoom | undefined {
    return Array.from(this.legacyRooms.values()).find((room: LegacyGameRoom) =>
      room.players.some((p: AuthenticatedSocket) => p.userId === playerId)
    );
  }

  // Matchmaking methods for external access
  public getMatchmakingQueue(): MatchmakingQueue {
    return this.matchmakingQueue;
  }

  public getQueueStats() {
    return this.matchmakingQueue.getQueueStats();
  }

  public cleanupDisconnectedPlayers(): void {
    this.matchmakingQueue.cleanupDisconnectedPlayers();
  }
}
