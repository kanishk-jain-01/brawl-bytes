import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { MatchmakingQueue, MatchPreferences } from '../game/MatchmakingQueue';
import { GameRoom as ActualGameRoom, PlayerState } from '../game/GameRoom';

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

    // Set the SocketManager instance for GameRoom creation
    this.matchmakingQueue.setSocketManager(this);

    this.setupSocketHandlers();
  }

  public getIO(): Server {
    return this.io;
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
        console.log(
          `Received authentication request from socket ${socket.id} with token: ${token ? 'present' : 'missing'}`
        );
        this.authenticateSocket(socket, token);

        // After authentication, check for reconnection opportunities
        if (socket.userId) {
          const reconnectionResult = this.handlePlayerReconnection(socket);
          if (reconnectionResult.success) {
            socket.emit('automaticReconnection', {
              success: true,
              gameRoom: reconnectionResult.gameRoom,
            });
          }
        }
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

      // Handle lobby events
      socket.on('selectCharacter', data => {
        this.handleSelectCharacter(socket, data);
      });

      socket.on('selectStage', data => {
        this.handleSelectStage(socket, data);
      });

      socket.on('playerReadyChanged', data => {
        this.handlePlayerReady(socket, data);
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

      // Handle reconnection attempts
      socket.on('attemptReconnection', () => {
        const reconnectionResult = this.handlePlayerReconnection(socket);
        socket.emit('reconnectionAttemptResult', reconnectionResult);
      });

      // Handle reconnection info requests
      socket.on('getReconnectionInfo', () => {
        if (socket.userId) {
          const stats = this.getDisconnectionStats();
          socket.emit('reconnectionInfo', stats);
        }
      });

      // Handle room state requests
      socket.on('requestRoomState', () => {
        this.handleRoomStateRequest(socket);
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
        userId: string;
        username: string;
        email: string;
      };
      // eslint-disable-next-line no-param-reassign
      socket.userId = decoded.userId;
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

  private handleSelectCharacter(
    socket: AuthenticatedSocket,
    data: { character: string }
  ): void {
    if (!socket.userId) {
      socket.emit('error', { message: 'Must be authenticated' });
      return;
    }

    // Find the GameRoom this player is in
    const targetRoom =
      Array.from(this.gameRooms.values()).find(gameRoom =>
        gameRoom.hasPlayer(socket.userId!)
      ) || null;

    if (!targetRoom) {
      socket.emit('error', { message: 'Not in a game room' });
      return;
    }

    // Set character in the game room
    const result = targetRoom.setPlayerCharacter(socket.userId, data.character);
    if (!result.success) {
      socket.emit('error', { message: result.error });
      return;
    }

    // Broadcast character selection to all players in the room
    targetRoom.broadcastToRoom('characterSelected', {
      playerId: socket.userId,
      character: data.character,
    });

    // Broadcast updated lobby state
    this.broadcastLobbyState(targetRoom);

    console.log(`${socket.username} selected character: ${data.character}`);
  }

  private handleSelectStage(
    socket: AuthenticatedSocket,
    data: { stage: string }
  ): void {
    if (!socket.userId) {
      socket.emit('error', { message: 'Must be authenticated' });
      return;
    }

    // Find the GameRoom this player is in
    const targetRoom =
      Array.from(this.gameRooms.values()).find(gameRoom =>
        gameRoom.hasPlayer(socket.userId!)
      ) || null;

    if (!targetRoom) {
      socket.emit('error', { message: 'Not in a game room' });
      return;
    }

    // Check if player is host (only host can select stage)
    const player = targetRoom.getPlayer(socket.userId);
    if (!player || !player.isHost) {
      socket.emit('error', { message: 'Only host can select stage' });
      return;
    }

    // Set stage in the game room
    const result = targetRoom.setStage(data.stage);
    if (!result.success) {
      socket.emit('error', { message: result.error });
      return;
    }

    // Broadcast stage selection to all players in the room
    targetRoom.broadcastToRoom('stageSelected', {
      stage: data.stage,
    });

    // Broadcast updated lobby state
    this.broadcastLobbyState(targetRoom);

    // If everyone is already ready, selecting a stage might be the last step
    // needed before the match can start. Re-evaluate start conditions.
    this.checkAndStartGame(targetRoom);

    console.log(`${socket.username} (host) selected stage: ${data.stage}`);
  }

  private handlePlayerReady(
    socket: AuthenticatedSocket,
    data: { ready: boolean }
  ): void {
    if (!socket.userId) {
      socket.emit('error', { message: 'Must be authenticated' });
      return;
    }

    console.log(
      `Player ${socket.username} ready status changed to: ${data.ready}`
    );

    // Find the GameRoom this player is in
    const targetRoom =
      Array.from(this.gameRooms.values()).find(gameRoom =>
        gameRoom.hasPlayer(socket.userId!)
      ) || null;

    if (!targetRoom) {
      socket.emit('error', { message: 'Not in a game room' });
      return;
    }

    // Set ready state in the game room
    const result = targetRoom.setPlayerReady(socket.userId, data.ready);
    if (!result.success) {
      socket.emit('error', { message: result.error });
      return;
    }

    // Broadcast ready state change to all players in the room
    targetRoom.broadcastToRoom('playerReadyChanged', {
      playerId: socket.userId,
      ready: data.ready,
    });

    // Broadcast updated lobby state
    this.broadcastLobbyState(targetRoom);

    // Check if all players are ready and start the game
    this.checkAndStartGame(targetRoom);

    console.log(`${socket.username} is ${data.ready ? 'ready' : 'not ready'}`);
  }

  private checkAndStartGame(gameRoom: ActualGameRoom): void {
    // Ensure we have the minimum required data before starting the match
    const config = gameRoom.getConfig();

    // 1. A stage must be selected (host should call selectStage before ready-up)
    if (!config.stage) {
      console.warn(
        `Aborting game start for room ${gameRoom.getId()} – stage has not been selected.`
      );

      // Notify players so the UI can instruct the host to pick a stage
      gameRoom.broadcastToRoom('missingStageSelection', {
        message: 'The host must select a stage before the game can start.',
        roomId: gameRoom.getId(),
      });

      return;
    }

    // 2. All players must be ready AND the room must be full
    if (gameRoom.areAllPlayersReady() && gameRoom.isFull()) {
      const players = gameRoom.getPlayers();
      const config = gameRoom.getConfig();

      // Log active game rooms count
      console.log(`Active game rooms: ${this.gameRooms.size}`);

      // Prepare game start data with player assignments and stage
      const gameStartData = {
        message: 'All players are ready! Starting game...',
        timestamp: Date.now(),
        roomId: gameRoom.getId(),
        stage: config.stage,
        players: players.map(player => ({
          userId: player.userId,
          username: player.username,
          character: player.character,
          isHost: player.isHost,
        })),
        gameConfig: {
          maxPlayers: config.maxPlayers,
          gameMode: config.gameMode,
          timeLimit: config.timeLimit,
          stockCount: config.stockCount,
        },
      };

      // Broadcast comprehensive game start event
      gameRoom.broadcastToRoom('gameStarted', gameStartData);

      // Also broadcast lobby:start for any clients that might be listening for this specific event
      gameRoom.broadcastToRoom('lobbyStart', gameStartData);

      // Start the game
      gameRoom.startGame();
      console.log(
        `Game started in room ${gameRoom.getId()} with stage: ${config.stage}`
      );
    }
  }

  private broadcastLobbyState(gameRoom: ActualGameRoom): void {
    const players = gameRoom.getPlayers();
    const config = gameRoom.getConfig();

    // Log active game rooms count for debugging
    console.log(
      `Broadcasting lobby state, active rooms: ${this.gameRooms.size}`
    );

    const lobbyState = {
      roomId: gameRoom.getId(),
      players: players.map(player => ({
        userId: player.userId,
        username: player.username,
        character: player.character || null,
        ready: player.state === PlayerState.READY,
        connected: player.state !== PlayerState.DISCONNECTED,
        isHost: player.isHost,
      })),
      selectedStage: config.stage || null,
      maxPlayers: config.maxPlayers,
      allPlayersReady: gameRoom.areAllPlayersReady(),
      canStartGame: gameRoom.areAllPlayersReady() && gameRoom.isFull(),
    };

    gameRoom.broadcastToRoom('lobbyState', lobbyState);
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
    console.log(
      `Client disconnected: ${socket.id} (${socket.username}), reason: ${reason}`
    );

    // Handle GameRoom disconnections first
    if (socket.userId) {
      this.handleGameRoomDisconnect(socket.userId, reason);
    }

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

    // Handle legacy room disconnections
    this.handleLegacyRoomDisconnect(socket, reason);
  }

  // eslint-disable-next-line class-methods-use-this
  private generateRoomId(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  // Enhanced disconnect handling methods
  private handleGameRoomDisconnect(userId: string, reason: string): void {
    // Find which GameRoom the player is in
    let playerGameRoom: ActualGameRoom | null = null;

    const gameRooms = Array.from(this.gameRooms.values());
    playerGameRoom =
      gameRooms.find(gameRoom => gameRoom.hasPlayer(userId)) || null;

    if (playerGameRoom) {
      console.log(`Handling GameRoom disconnect for player ${userId}`);
      playerGameRoom.handlePlayerDisconnect(userId, reason);
    }
  }

  private handleLegacyRoomDisconnect(
    socket: AuthenticatedSocket,
    reason: string
  ): void {
    // Handle legacy room disconnections (existing logic)
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
          reason,
        });

        // If room is empty, clean it up
        if (room.players.length === 0) {
          this.legacyRooms.delete(roomId);
          console.log(`Room ${roomId} deleted (empty)`);
        } else {
          // eslint-disable-next-line no-param-reassign
          room.isActive = false; // Pause game if someone leaves
        }

        console.log(
          `${socket.username} left legacy room ${roomId} due to ${reason}`
        );
      }
    });
  }

  public handlePlayerReconnection(socket: AuthenticatedSocket): {
    success: boolean;
    error?: string;
    gameRoom?: string;
  } {
    if (!socket.userId) {
      return { success: false, error: 'Socket must be authenticated' };
    }

    // Try to reconnect to GameRoom
    const gameRoomEntries = Array.from(this.gameRooms.entries());
    const targetRoom = gameRoomEntries.find(([, gameRoom]) =>
      gameRoom.hasPlayer(socket.userId!)
    );

    if (targetRoom) {
      const [roomId, gameRoom] = targetRoom;
      const reconnectionResult = gameRoom.handlePlayerReconnect(socket);

      if (reconnectionResult.success) {
        // Update player socket map
        this.playerSocketMap.set(socket.userId, socket);

        console.log(
          `Player ${socket.username} successfully reconnected to GameRoom ${roomId}`
        );

        return {
          success: true,
          gameRoom: roomId,
        };
      }
      return {
        success: false,
        error: reconnectionResult.error || 'Unknown reconnection error',
      };
    }

    return { success: false, error: 'No room found for reconnection' };
  }

  public getDisconnectionStats(): {
    totalDisconnectedPlayers: number;
    roomsWithDisconnectedPlayers: number;
    disconnectedPlayersByRoom: { [roomId: string]: number };
  } {
    let totalDisconnectedPlayers = 0;
    let roomsWithDisconnectedPlayers = 0;
    const disconnectedPlayersByRoom: { [roomId: string]: number } = {};

    this.gameRooms.forEach((gameRoom, roomId) => {
      const disconnectedPlayers = gameRoom.getDisconnectedPlayers();

      if (disconnectedPlayers.length > 0) {
        roomsWithDisconnectedPlayers += 1;
        disconnectedPlayersByRoom[roomId] = disconnectedPlayers.length;
        totalDisconnectedPlayers += disconnectedPlayers.length;
      }
    });

    return {
      totalDisconnectedPlayers,
      roomsWithDisconnectedPlayers,
      disconnectedPlayersByRoom,
    };
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

  private handleRoomStateRequest(socket: AuthenticatedSocket): void {
    if (!socket.userId) {
      socket.emit('error', { message: 'Must be authenticated' });
      return;
    }

    console.log(
      `Room state request from ${socket.username} (${socket.userId})`
    );
    // Find the GameRoom this player is in
    const targetRoom = Array.from(this.gameRooms.values()).find(gameRoom =>
      gameRoom.hasPlayer(socket.userId!)
    );

    if (!targetRoom) {
      console.log(`Player ${socket.username} not found in any game room`);
      socket.emit('error', { message: 'Not in a game room' });
      return;
    }

    console.log(
      `Found player ${socket.username} in room ${targetRoom.getId()}`
    );
    console.log(
      `Socket rooms for ${socket.username}:`,
      Array.from(socket.rooms)
    );
    // Broadcast current lobby state to the requesting player
    this.broadcastLobbyState(targetRoom);
  }

  public cleanupDisconnectedPlayers(): void {
    this.matchmakingQueue.cleanupDisconnectedPlayers();

    // Cleanup disconnected players from GameRooms
    this.gameRooms.forEach((gameRoom, roomId) => {
      const disconnectedPlayers = gameRoom.getDisconnectedPlayers();

      disconnectedPlayers.forEach(player => {
        const reconnectionInfo = gameRoom.getReconnectionInfo(player.userId);

        // Force remove players who have been disconnected too long
        if (
          reconnectionInfo.timeRemaining &&
          reconnectionInfo.timeRemaining <= 0
        ) {
          console.log(
            `Force removing disconnected player ${player.username} from room ${roomId}`
          );
          gameRoom.forceRemoveDisconnectedPlayer(player.userId);
        }
      });

      // Remove empty rooms
      if (gameRoom.isEmpty()) {
        console.log(`Removing empty GameRoom: ${roomId}`);
        gameRoom.cleanup();
        this.gameRooms.delete(roomId);
      }
    });
  }
}
