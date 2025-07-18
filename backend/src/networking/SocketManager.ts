import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { MatchmakingQueue, MatchPreferences } from '../game/MatchmakingQueue';
import type { AuthenticatedSocket } from '../types';
import { GameRoom as ActualGameRoom } from '../game/GameRoom';
import { PlayerState } from '../types';

export class SocketManager {
  private io: Server;

  private gameRooms: Map<string, ActualGameRoom>;

  private playerSocketMap: Map<string, AuthenticatedSocket>;

  private matchmakingQueue: MatchmakingQueue;

  constructor(io: Server) {
    this.io = io;
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

  /**
   * Get all active game rooms
   */
  public getActiveRooms(): ActualGameRoom[] {
    return Array.from(this.gameRooms.values());
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

      socket.on('leaveRoom', () => {
        this.handleLeaveRoom(socket);
      });

      socket.on('playerQuit', () => {
        this.handlePlayerQuit(socket);
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

      socket.on('playerReady', data => {
        this.handlePlayerReady(socket, data);
      });

      // Handle game events (placeholder for now)
      // Modern player input routing (movement / attack etc.)
      socket.on('playerInput', (inputData: any) => {
        if (!socket.userId) return;

        // Find GameRoom containing this player
        const targetRoom = Array.from(this.gameRooms.values()).find(r =>
          r.hasPlayer(socket.userId!)
        );

        if (!targetRoom) return;

        // Handle different input types
        if (inputData.inputType === 'move' || inputData.type === 'move') {
          const { position, velocity, facing } = inputData.data || {};
          const sequence = inputData.sequence || 0;

          // Debug inbound movement
          console.log(
            `[MOVE_IN] user=${socket.userId} room=${targetRoom.getId()} facing=${facing} seq=${sequence} pos=(${position?.x?.toFixed?.(1)},${position?.y?.toFixed?.(1)})`
          );

          targetRoom.handlePlayerMove(
            socket.userId!,
            position,
            velocity,
            facing,
            sequence
          );
        } else {
          // Handle all other input types (attack, jump, special, etc.) through GameRoom
          console.log(
            `[INPUT_IN] user=${socket.userId} type=${inputData.inputType || inputData.type}`
          );
          targetRoom.handlePlayerInput(socket.userId!, inputData);
        }
      });

      // Handle game events
      socket.on('gameEvent', async (eventData: any) => {
        if (!socket.userId) return;

        // Find GameRoom containing this player
        const targetRoom = Array.from(this.gameRooms.values()).find(r =>
          r.hasPlayer(socket.userId!)
        );

        if (!targetRoom) {
          return;
        }

        // Forward event to GameRoom
        await targetRoom.handleGameEvent(eventData);
      });

      // Legacy playerMove handler removed - use modern GameRoom playerInput system

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

  // Legacy createRoom method removed - use matchmaking queue instead

  // Room management handled via GameRoom/matchmaking system

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
    data: { stage: string; character?: string }
  ): void {
    if (!socket.userId) {
      socket.emit('error', { message: 'Must be authenticated' });
      return;
    }

    // Find the GameRoom this player is in
    let targetRoom =
      Array.from(this.gameRooms.values()).find(gameRoom =>
        gameRoom.hasPlayer(socket.userId!)
      ) || null;

    // If not in a room, try to find an existing room first, then create if needed
    if (!targetRoom) {
      // First, check if there are existing rooms with available slots that match the stage
      const availableRoom = Array.from(this.gameRooms.values()).find(
        room =>
          room.hasAvailableSlots() &&
          !room.isGameInProgress() &&
          (room.getConfig().stage === data.stage ||
            room.getConfig().stage === null)
      );

      if (availableRoom) {
        // Join existing room
        const addResult = availableRoom.addPlayer(socket);
        if (addResult.success) {
          targetRoom = availableRoom;
          console.log(
            `Player ${socket.username} joined existing room ${availableRoom.getId()}`
          );

          // If the room didn't have a stage set, set it now
          if (!availableRoom.getConfig().stage) {
            availableRoom.setStage(data.stage);
          }

          // Apply character selection if provided
          if (data.character && socket.userId) {
            availableRoom.setPlayerCharacter(socket.userId, data.character);
            console.log(
              `Applied character ${data.character} to ${socket.username} in existing room`
            );
          }
        }
      }

      // If no suitable existing room found, create a new one
      if (!targetRoom) {
        const roomId = `room_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const config = {
          maxPlayers: 2,
          gameMode: 'versus',
          timeLimit: 180,
          stockCount: 3,
          stage: data.stage,
        };

        targetRoom = new ActualGameRoom(roomId, this, config);
        this.gameRooms.set(roomId, targetRoom);

        // Add player to the new room
        const addResult = targetRoom.addPlayer(socket);
        if (!addResult.success) {
          socket.emit('error', { message: 'Failed to create room' });
          return;
        }

        console.log(`Player ${socket.username} created new room ${roomId}`);

        // Apply character selection if provided
        if (data.character && socket.userId) {
          targetRoom.setPlayerCharacter(socket.userId, data.character);
          console.log(
            `Applied character ${data.character} to ${socket.username} in new room`
          );
        }

        // Notify client they joined a room
        socket.emit('roomJoined', { roomId });
      }
    } else {
      // Check if player is host (only host can select stage)
      const player = targetRoom.getPlayer(socket.userId);
      if (!player || !player.isHost) {
        socket.emit('error', { message: 'Only host can select stage' });
        return;
      }

      // Set stage in the existing game room
      const result = targetRoom.setStage(data.stage);
      if (!result.success) {
        socket.emit('error', { message: result.error });
        return;
      }
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
      const roomConfig = gameRoom.getConfig();

      // Log active game rooms count
      console.log(`Active game rooms: ${this.gameRooms.size}`);

      // Prepare game start data with player assignments and stage
      const gameStartData = {
        message: 'All players are ready! Starting game...',
        timestamp: Date.now(),
        roomId: gameRoom.getId(),
        stage: roomConfig.stage,
        players: players.map(player => ({
          userId: player.userId,
          username: player.username,
          character: player.character,
          isHost: player.isHost,
        })),
        gameConfig: {
          maxPlayers: roomConfig.maxPlayers,
          gameMode: roomConfig.gameMode,
          timeLimit: roomConfig.timeLimit,
          stockCount: roomConfig.stockCount,
        },
      };

      // Broadcast comprehensive game start event
      gameRoom.broadcastToRoom('gameStarted', gameStartData);

      // Also broadcast lobby:start for any clients that might be listening for this specific event
      gameRoom.broadcastToRoom('lobbyStart', gameStartData);

      // Start the game
      gameRoom.startGame();
      console.log(
        `Game started in room ${gameRoom.getId()} with stage: ${roomConfig.stage}`
      );
    }
  }

  public broadcastLobbyState(gameRoom: ActualGameRoom): void {
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
      canStartGame:
        gameRoom.areAllPlayersReady() &&
        gameRoom.isFull() &&
        config.stage !== null,
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

    // Legacy room disconnect handling removed - all disconnect handling is now done via GameRoom system
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
  public getGameRooms(): ActualGameRoom[] {
    return Array.from(this.gameRooms.values());
  }

  public getGameRoom(roomId: string): ActualGameRoom | undefined {
    return this.gameRooms.get(roomId);
  }

  public getRoomByPlayerId(playerId: string): ActualGameRoom | undefined {
    return Array.from(this.gameRooms.values()).find((room: ActualGameRoom) =>
      room.hasPlayer(playerId)
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

    // Send room state directly to the requesting player
    const roomState = targetRoom.getRoomState();
    socket.emit('roomStateSync', roomState);

    // Also broadcast to ensure all players are synced
    this.broadcastLobbyState(targetRoom);
  }

  public cleanupDisconnectedPlayers(): void {
    this.matchmakingQueue.cleanupDisconnectedPlayers();

    const roomsToDelete: string[] = [];

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
        console.log(`Marking empty GameRoom for removal: ${roomId}`);
        roomsToDelete.push(roomId);
      }
    });

    // Clean up empty rooms
    roomsToDelete.forEach(roomId => {
      const gameRoom = this.gameRooms.get(roomId);
      if (gameRoom) {
        // Notify any lingering connections
        gameRoom.broadcastToRoom('roomCleanedUp', {
          reason: 'empty_room',
          roomId,
        });
        gameRoom.cleanup();
        this.gameRooms.delete(roomId);
      }
    });
  }

  private handlePlayerQuit(socket: AuthenticatedSocket): void {
    if (!socket.userId) {
      socket.emit('error', { message: 'Must be authenticated' });
      return;
    }

    // Find the GameRoom this player is in
    const targetRoom = Array.from(this.gameRooms.values()).find(gameRoom =>
      gameRoom.hasPlayer(socket.userId!)
    );

    if (!targetRoom) {
      socket.emit('error', { message: 'Not in a game room' });
      return;
    }

    console.log(
      `Player ${socket.username} quitting from room ${targetRoom.getId()}`
    );

    // Handle player quit (includes match forfeit logic if game is in progress)
    const result = targetRoom.handlePlayerQuit(socket.userId);

    if (result.success) {
      socket.emit('playerQuitSuccess', {
        roomId: targetRoom.getId(),
        message: 'Successfully quit game',
      });

      // If room is now empty, clean it up
      if (targetRoom.isEmpty()) {
        console.log(
          `Room ${targetRoom.getId()} is empty after quit, cleaning up`
        );
        targetRoom.broadcastToRoom('roomCleanedUp', {
          reason: 'all_players_left',
          roomId: targetRoom.getId(),
        });
        targetRoom.cleanup();
        this.gameRooms.delete(targetRoom.getId());
      } else {
        // Broadcast updated lobby state to remaining players
        this.broadcastLobbyState(targetRoom);
      }
    } else {
      socket.emit('error', { message: result.error || 'Failed to quit game' });
    }
  }

  private handleLeaveRoom(socket: AuthenticatedSocket): void {
    if (!socket.userId) {
      socket.emit('error', { message: 'Must be authenticated' });
      return;
    }

    // Find the GameRoom this player is in
    const targetRoom = Array.from(this.gameRooms.values()).find(gameRoom =>
      gameRoom.hasPlayer(socket.userId!)
    );

    if (!targetRoom) {
      socket.emit('error', { message: 'Not in a game room' });
      return;
    }

    console.log(`Player ${socket.username} leaving room ${targetRoom.getId()}`);

    // Remove player from room
    const result = targetRoom.removePlayer(socket.userId);

    if (result.success) {
      socket.emit('leftRoom', {
        roomId: targetRoom.getId(),
        message: 'Successfully left room',
      });

      // If room is now empty, clean it up
      if (targetRoom.isEmpty()) {
        console.log(`Room ${targetRoom.getId()} is empty, cleaning up`);
        targetRoom.broadcastToRoom('roomCleanedUp', {
          reason: 'all_players_left',
          roomId: targetRoom.getId(),
        });
        targetRoom.cleanup();
        this.gameRooms.delete(targetRoom.getId());
      } else {
        // Broadcast updated lobby state to remaining players
        this.broadcastLobbyState(targetRoom);
      }
    } else {
      socket.emit('error', { message: 'Failed to leave room' });
    }
  }
}
