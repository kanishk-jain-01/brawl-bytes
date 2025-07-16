import { PrismaClient } from '@prisma/client';
import {
  AuthenticatedSocket,
  SocketManager,
} from '../networking/SocketManager';
import {
  PhysicsSystem,
  type AttackData,
  type StageData,
} from './PhysicsSystem';
import { GameConstantsService } from '../services/GameConstantsService';

export enum GameState {
  WAITING = 'waiting',
  STARTING = 'starting',
  PLAYING = 'playing',
  PAUSED = 'paused',
  ENDED = 'ended',
}

export enum PlayerState {
  CONNECTED = 'connected',
  READY = 'ready',
  PLAYING = 'playing',
  DISCONNECTED = 'disconnected',
}

export interface GameRoomPlayer {
  socket: AuthenticatedSocket;
  userId: string;
  username: string;
  state: PlayerState;
  character?: string | undefined;
  joinedAt: Date;
  isHost: boolean;
  // Server-side player state for validation
  position?: { x: number; y: number };
  velocity?: { x: number; y: number };
  lastSequence?: number;
  lastUpdate?: number;
  // Disconnect handling
  disconnectedAt?: Date;
  reconnectionTimeout?: NodeJS.Timeout;
  disconnectCount?: number;
  lastReconnectAt?: Date;
}

export interface GameRoomConfig {
  maxPlayers: number;
  gameMode: string;
  stage?: string | undefined;
  timeLimit?: number;
  stockCount?: number;
  // Reconnection timeout configuration
  reconnectionGracePeriod?: number; // milliseconds
  maxReconnectionTime?: number; // milliseconds
  maxDisconnectCount?: number;
  autoCleanupOnTimeout?: boolean;
}

export interface GameResults {
  winnerId?: string | undefined;
  winnerUsername?: string | undefined;
  loserId?: string | undefined;
  loserUsername?: string | undefined;
  endReason: 'knockout' | 'timeout' | 'forfeit' | 'disconnect';
  finalScores: { [playerId: string]: number };
  matchDuration: number;
  endedAt: Date;
}

export interface RoomState {
  roomId: string;
  gameState: GameState;
  config: GameRoomConfig;
  players: {
    userId: string;
    username: string;
    state: PlayerState;
    character?: string | undefined;
    isHost: boolean;
    joinedAt: Date;
  }[];
  createdAt: Date;
  lastActivity: Date;
  lastGameResults?: GameResults | undefined;
}

export interface PlayerInputData {
  type: 'move' | 'attack' | 'jump' | 'special';
  data: any;
  sequence?: number;
}

export interface ProcessedPlayerInput {
  playerId: string;
  timestamp: number;
  inputType: string;
  data: any;
  sequence: number;
}

export interface GameEvent {
  type: 'player_hit' | 'player_ko' | 'match_timeout' | 'stage_hazard';
  data: any;
}

export interface ProcessedGameEvent extends GameEvent {
  timestamp: number;
  roomId: string;
}

export interface GameSyncState {
  roomId: string;
  gameState: GameState;
  players: {
    userId: string;
    username: string;
    character?: string | undefined;
    state: PlayerState;
  }[];
  config: GameRoomConfig;
  timestamp: number;
}

export class GameRoom {
  public readonly id: string;

  private players: Map<string, GameRoomPlayer>;

  private gameState: GameState;

  private config: GameRoomConfig;

  private createdAt: Date;

  private lastActivity: Date;

  private hostId: string | null;

  private lastGameResults?: GameResults | undefined;

  private physicsSystem: PhysicsSystem;

  private physicsUpdateInterval: NodeJS.Timeout | null = null;

  // Disconnect handling configuration
  private readonly RECONNECTION_GRACE_PERIOD: number;

  private readonly MAX_RECONNECTION_TIME: number;

  private readonly MAX_DISCONNECT_COUNT: number;

  private readonly AUTO_CLEANUP_ON_TIMEOUT: boolean;

  // Room cleanup tracking
  private cleanupTimeout: NodeJS.Timeout | null = null;

  private isScheduledForCleanup = false;

  private socketManager: SocketManager;

  constructor(
    id: string,
    socketManager: SocketManager,
    config: Partial<GameRoomConfig> = {}
  ) {
    this.id = id;
    this.socketManager = socketManager;
    this.players = new Map();
    this.gameState = GameState.WAITING;
    this.config = {
      maxPlayers: 2,
      gameMode: 'versus',
      timeLimit: 300, // 5 minutes in seconds
      stockCount: 3,
      reconnectionGracePeriod: 30000, // 30 seconds
      maxReconnectionTime: 120000, // 2 minutes total
      maxDisconnectCount: 5,
      autoCleanupOnTimeout: true,
      ...config,
    };
    this.createdAt = new Date();
    this.lastActivity = new Date();
    this.hostId = null;

    // Set disconnect handling configuration from config
    this.RECONNECTION_GRACE_PERIOD =
      this.config.reconnectionGracePeriod || 30000;
    this.MAX_RECONNECTION_TIME = this.config.maxReconnectionTime || 120000;
    this.MAX_DISCONNECT_COUNT = this.config.maxDisconnectCount || 5;
    this.AUTO_CLEANUP_ON_TIMEOUT = this.config.autoCleanupOnTimeout ?? true;

    // Initialize physics system with constants service
    const prisma = new PrismaClient();
    const constantsService = GameConstantsService.getInstance(prisma);
    this.physicsSystem = new PhysicsSystem(constantsService);
  }

  // Basic room information getters
  public getId(): string {
    return this.id;
  }

  public getGameState(): GameState {
    return this.gameState;
  }

  public getConfig(): GameRoomConfig {
    return { ...this.config };
  }

  public getPlayerCount(): number {
    return this.players.size;
  }

  public getMaxPlayers(): number {
    return this.config.maxPlayers;
  }

  public isFull(): boolean {
    return this.players.size >= this.config.maxPlayers;
  }

  public isEmpty(): boolean {
    return this.players.size === 0;
  }

  public getPlayers(): GameRoomPlayer[] {
    return Array.from(this.players.values());
  }

  public getPlayer(userId: string): GameRoomPlayer | undefined {
    return this.players.get(userId);
  }

  public hasPlayer(userId: string): boolean {
    return this.players.has(userId);
  }

  public getHost(): GameRoomPlayer | undefined {
    if (!this.hostId) return undefined;
    return this.players.get(this.hostId);
  }

  public getCreatedAt(): Date {
    return this.createdAt;
  }

  public getLastActivity(): Date {
    return this.lastActivity;
  }

  public getLastGameResults(): GameResults | undefined {
    return this.lastGameResults;
  }

  // Update activity timestamp
  private updateActivity(): void {
    this.lastActivity = new Date();
  }

  // Helper method to check if all players are ready
  public areAllPlayersReady(): boolean {
    if (this.players.size === 0) return false;
    return Array.from(this.players.values()).every(
      player =>
        player.state === PlayerState.READY ||
        player.state === PlayerState.PLAYING
    );
  }

  // Helper method to get players by state
  public getPlayersByState(state: PlayerState): GameRoomPlayer[] {
    return Array.from(this.players.values()).filter(
      player => player.state === state
    );
  }

  // Player management methods
  public addPlayer(socket: AuthenticatedSocket): {
    success: boolean;
    error?: string;
  } {
    if (!socket.userId || !socket.username) {
      return { success: false, error: 'Socket must be authenticated' };
    }

    if (this.isFull()) {
      return { success: false, error: 'Room is full' };
    }

    if (this.hasPlayer(socket.userId)) {
      return { success: false, error: 'Player already in room' };
    }

    if (this.gameState === GameState.PLAYING) {
      return { success: false, error: 'Game already in progress' };
    }

    // First player becomes host
    const isHost = this.isEmpty();
    if (isHost) {
      this.hostId = socket.userId;
    }

    const player: GameRoomPlayer = {
      socket,
      userId: socket.userId,
      username: socket.username,
      state: PlayerState.CONNECTED,
      joinedAt: new Date(),
      isHost,
    };

    this.players.set(socket.userId, player);
    // Debug: Player joined room
    console.log(
      `[JOIN] room=${this.id} user=${socket.userId} (${socket.username})`
    );
    this.updateActivity();

    // Initialize physics for the player
    this.physicsSystem.initializePlayer(player);

    // Join the socket.io room
    socket.join(this.id);
    console.log(`Player ${socket.username} joined Socket.io room ${this.id}`);

    return { success: true };
  }

  public removePlayer(userId: string): {
    success: boolean;
    player?: GameRoomPlayer;
  } {
    const player = this.players.get(userId);
    if (!player) {
      return { success: false };
    }

    console.log(`Removing player ${player.username} from room ${this.id}`);

    // Clear any reconnection timeout
    if (player.reconnectionTimeout) {
      clearTimeout(player.reconnectionTimeout);
    }

    // Leave the socket.io room
    player.socket.leave(this.id);

    // Remove player from physics system
    this.physicsSystem.removePlayer(userId);

    // Remove player
    this.players.delete(userId);
    this.updateActivity();

    // Handle host transfer if host left
    if (this.hostId === userId) {
      this.hostId = null;
      // Transfer host to next connected player
      const remainingPlayers = Array.from(this.players.values()).filter(
        p => p.state !== PlayerState.DISCONNECTED
      );

      if (remainingPlayers.length > 0) {
        const newHost = remainingPlayers[0];
        this.hostId = newHost.userId;
        // eslint-disable-next-line no-param-reassign
        newHost.isHost = true;

        // Notify about host change
        this.broadcastToRoom('hostChanged', {
          newHostId: newHost.userId,
          newHostUsername: newHost.username,
          previousHostId: userId,
        });
      }
    }

    // Reset game state if needed
    if (this.gameState === GameState.PLAYING && this.players.size < 2) {
      this.gameState = GameState.WAITING;
      this.broadcastToRoom('gameEnded', {
        reason: 'insufficient_players',
        endedAt: new Date(),
      });
    }

    // Notify remaining players
    this.broadcastToRoom('playerRemoved', {
      playerId: userId,
      username: player.username,
      reason: 'timeout_or_excessive_disconnects',
      remainingPlayers: this.players.size,
    });

    return { success: true, player };
  }

  public setPlayerReady(
    userId: string,
    ready: boolean = true
  ): { success: boolean; error?: string } {
    const player = this.players.get(userId);
    if (!player) {
      return { success: false, error: 'Player not found in room' };
    }

    if (this.gameState === GameState.PLAYING) {
      return { success: false, error: 'Game already in progress' };
    }

    // eslint-disable-next-line no-param-reassign
    player.state = ready ? PlayerState.READY : PlayerState.CONNECTED;
    this.updateActivity();

    return { success: true };
  }

  public setPlayerCharacter(
    userId: string,
    character: string
  ): { success: boolean; error?: string } {
    const player = this.players.get(userId);
    if (!player) {
      return { success: false, error: 'Player not found in room' };
    }

    if (this.gameState === GameState.PLAYING) {
      return { success: false, error: 'Cannot change character during game' };
    }

    // eslint-disable-next-line no-param-reassign
    player.character = character;
    this.updateActivity();

    return { success: true };
  }

  public setPlayerState(
    userId: string,
    state: PlayerState
  ): { success: boolean; error?: string } {
    const player = this.players.get(userId);
    if (!player) {
      return { success: false, error: 'Player not found in room' };
    }

    // eslint-disable-next-line no-param-reassign
    player.state = state;
    this.updateActivity();

    return { success: true };
  }

  public handlePlayerDisconnect(userId: string, reason?: string): void {
    const player = this.players.get(userId);
    if (!player) return;

    console.log(
      `Player ${player.username} disconnected from room ${this.id}, reason: ${reason || 'unknown'}`
    );

    // Update player state
    // eslint-disable-next-line no-param-reassign
    player.state = PlayerState.DISCONNECTED;
    // eslint-disable-next-line no-param-reassign
    player.disconnectedAt = new Date();
    // eslint-disable-next-line no-param-reassign
    player.disconnectCount = (player.disconnectCount || 0) + 1;
    this.updateActivity();

    // If game is in progress, pause it
    if (this.gameState === GameState.PLAYING) {
      this.gameState = GameState.PAUSED;
      this.broadcastToRoom('gamePaused', {
        reason: 'player_disconnect',
        disconnectedPlayer: {
          userId: player.userId,
          username: player.username,
        },
        pausedAt: new Date(),
      });
    }

    // Set up reconnection timeout
    this.setReconnectionTimeout(userId);

    // Notify other players
    this.broadcastToOthers(userId, 'playerDisconnected', {
      playerId: userId,
      username: player.username,
      gracePeriod: this.RECONNECTION_GRACE_PERIOD,
      gameState: this.gameState,
    });
  }

  public handlePlayerReconnect(socket: AuthenticatedSocket): {
    success: boolean;
    error?: string;
    reconnectionData?: any;
  } {
    if (!socket.userId) {
      return { success: false, error: 'Socket must be authenticated' };
    }

    const player = this.players.get(socket.userId);
    if (!player) {
      return { success: false, error: 'Player not found in room' };
    }

    if (player.state !== PlayerState.DISCONNECTED) {
      return { success: false, error: 'Player was not disconnected' };
    }

    // Clear reconnection timeout if it exists
    if (player.reconnectionTimeout) {
      clearTimeout(player.reconnectionTimeout);
      // eslint-disable-next-line no-param-reassign
      delete player.reconnectionTimeout;
    }

    const disconnectionDuration = player.disconnectedAt
      ? Date.now() - player.disconnectedAt.getTime()
      : 0;

    console.log(
      `Player ${player.username} reconnected to room ${this.id} after ${disconnectionDuration}ms`
    );

    // Update player state
    // eslint-disable-next-line no-param-reassign
    player.socket = socket;
    // eslint-disable-next-line no-param-reassign
    player.state =
      this.gameState === GameState.PLAYING
        ? PlayerState.PLAYING
        : PlayerState.CONNECTED;
    // eslint-disable-next-line no-param-reassign
    player.lastReconnectAt = new Date();
    // eslint-disable-next-line no-param-reassign
    delete player.disconnectedAt;

    socket.join(this.id);
    this.updateActivity();

    // Cancel room cleanup since a player has reconnected
    this.cancelRoomCleanup();

    // Check if we can resume the game
    const shouldResumeGame =
      this.gameState === GameState.PAUSED &&
      this.getPlayersByState(PlayerState.DISCONNECTED).length === 0;

    if (shouldResumeGame) {
      this.gameState = GameState.PLAYING;
      this.broadcastToRoom('gameResumed', {
        reason: 'all_players_reconnected',
        resumedAt: new Date(),
      });
    }

    // Notify other players
    this.broadcastToOthers(socket.userId, 'playerReconnected', {
      playerId: socket.userId,
      username: player.username,
      disconnectionDuration,
      gameState: this.gameState,
    });

    // Send room state sync to reconnected player
    this.requestGameStateSync(socket.userId);

    return {
      success: true,
      reconnectionData: {
        disconnectionDuration,
        gameResumed: shouldResumeGame,
        roomState: this.getRoomState(),
      },
    };
  }

  // Match state management methods
  public canStartGame(): { canStart: boolean; reason?: string | undefined } {
    if (this.gameState !== GameState.WAITING) {
      return { canStart: false, reason: 'Game is not in waiting state' };
    }

    if (this.players.size < 2) {
      return { canStart: false, reason: 'Need at least 2 players to start' };
    }

    if (!this.areAllPlayersReady()) {
      return { canStart: false, reason: 'Not all players are ready' };
    }

    // Check if all players have selected characters
    const playersWithoutCharacter = Array.from(this.players.values()).filter(
      p => !p.character
    );
    if (playersWithoutCharacter.length > 0) {
      return { canStart: false, reason: 'All players must select a character' };
    }

    if (!this.config.stage) {
      return { canStart: false, reason: 'Stage must be selected' };
    }

    return { canStart: true };
  }

  public startGame(): { success: boolean; error?: string } {
    const canStart = this.canStartGame();
    if (!canStart.canStart) {
      return { success: false, error: canStart.reason || 'Cannot start game' };
    }

    this.gameState = GameState.STARTING;
    this.updateActivity();

    // Set all players to playing state
    this.players.forEach(player => {
      // eslint-disable-next-line no-param-reassign
      player.state = PlayerState.PLAYING;
    });

    // Transition to playing after a short delay (simulating countdown)
    setTimeout(() => {
      if (this.gameState === GameState.STARTING) {
        this.gameState = GameState.PLAYING;
        this.updateActivity();

        // Start physics updates when game begins
        this.startPhysicsUpdate();
      }
    }, 3000); // 3 second countdown

    return { success: true };
  }

  public pauseGame(): { success: boolean; error?: string } {
    if (this.gameState !== GameState.PLAYING) {
      return { success: false, error: 'Game is not currently playing' };
    }

    this.gameState = GameState.PAUSED;
    this.updateActivity();

    return { success: true };
  }

  public resumeGame(): { success: boolean; error?: string } {
    if (this.gameState !== GameState.PAUSED) {
      return { success: false, error: 'Game is not currently paused' };
    }

    // Check if we have enough connected players to resume
    const disconnectedPlayers = this.getPlayersByState(
      PlayerState.DISCONNECTED
    );
    if (disconnectedPlayers.length > 0) {
      return {
        success: false,
        error: 'Cannot resume with disconnected players',
      };
    }

    this.gameState = GameState.PLAYING;
    this.updateActivity();

    return { success: true };
  }

  public endGame(results?: GameResults): { success: boolean; error?: string } {
    if (
      this.gameState !== GameState.PLAYING &&
      this.gameState !== GameState.PAUSED
    ) {
      return { success: false, error: 'No active game to end' };
    }

    this.gameState = GameState.ENDED;
    this.updateActivity();

    // Stop physics updates
    this.stopPhysicsUpdate();

    // Reset player states to connected
    this.players.forEach(player => {
      if (player.state !== PlayerState.DISCONNECTED) {
        // eslint-disable-next-line no-param-reassign
        player.state = PlayerState.CONNECTED;
      }
    });

    // Store results if provided
    if (results) {
      this.lastGameResults = results;
    }

    return { success: true };
  }

  public resetRoom(): void {
    this.gameState = GameState.WAITING;
    this.updateActivity();

    // Reset all player states and characters
    this.players.forEach(player => {
      if (player.state !== PlayerState.DISCONNECTED) {
        // eslint-disable-next-line no-param-reassign
        player.state = PlayerState.CONNECTED;
      }
      // eslint-disable-next-line no-param-reassign
      player.character = undefined;
    });

    // Clear stage selection
    this.config.stage = undefined;
    this.lastGameResults = undefined;
  }

  public setStage(stage: string): { success: boolean; error?: string } {
    if (this.gameState === GameState.PLAYING) {
      return {
        success: false,
        error: 'Cannot change stage during active game',
      };
    }

    this.config.stage = stage;

    // Initialize stage data in physics system
    this.initializeStagePhysics(stage);
    this.updateActivity();

    return { success: true };
  }

  public updateGameConfig(newConfig: Partial<GameRoomConfig>): {
    success: boolean;
    error?: string;
  } {
    if (this.gameState === GameState.PLAYING) {
      return {
        success: false,
        error: 'Cannot change config during active game',
      };
    }

    // Validate max players change
    if (newConfig.maxPlayers && newConfig.maxPlayers < this.players.size) {
      return {
        success: false,
        error: 'Cannot reduce max players below current player count',
      };
    }

    this.config = { ...this.config, ...newConfig };
    this.updateActivity();

    return { success: true };
  }

  // Game loop and state synchronization methods
  public broadcastToRoom(event: string, data: any): void {
    // Only log non-spammy events to keep console readable
    const noisyEvents = new Set([
      'physicsUpdate',
      'playerMove',
      'serverState',
      'positionCorrection',
    ]);

    if (!noisyEvents.has(event)) {
      console.log(
        `Broadcasting event '${event}' to room ${this.id} with data:`,
        data
      );
    }
    this.socketManager.getIO().to(this.id).emit(event, data);
    this.updateActivity();
  }

  public broadcastToOthers(
    excludeUserId: string,
    event: string,
    data: any
  ): void {
    this.players.forEach(player => {
      if (
        player.userId !== excludeUserId &&
        player.state !== PlayerState.DISCONNECTED
      ) {
        player.socket.emit(event, data);
      }
    });
    this.updateActivity();
  }

  public getRoomState(): RoomState {
    return {
      roomId: this.id,
      gameState: this.gameState,
      config: this.config,
      players: Array.from(this.players.values()).map(player => ({
        userId: player.userId,
        username: player.username,
        state: player.state,
        character: player.character,
        isHost: player.isHost,
        joinedAt: player.joinedAt,
      })),
      createdAt: this.createdAt,
      lastActivity: this.lastActivity,
      lastGameResults: this.lastGameResults,
    };
  }

  public handlePlayerInput(userId: string, inputData: PlayerInputData): void {
    const player = this.players.get(userId);
    if (
      !player ||
      player.state !== PlayerState.PLAYING ||
      this.gameState !== GameState.PLAYING
    ) {
      return;
    }

    // Validate and process input
    const processedInput: ProcessedPlayerInput = {
      playerId: userId,
      timestamp: Date.now(),
      inputType: inputData.type,
      data: inputData.data,
      sequence: inputData.sequence || 0,
    };

    // Broadcast to other players for client-side prediction
    this.broadcastToOthers(userId, 'playerInput', processedInput);

    // Store for server-side validation if needed
    this.updateActivity();
  }

  public async handlePlayerMove(
    userId: string,
    position: { x: number; y: number },
    velocity: { x: number; y: number },
    sequence?: number
  ): Promise<void> {
    const player = this.players.get(userId);
    if (
      !player ||
      player.state !== PlayerState.PLAYING ||
      this.gameState !== GameState.PLAYING
    ) {
      return;
    }

    const currentTime = Date.now();

    // Use physics system for validation
    const validationResult = await this.physicsSystem.validateMovement(
      userId,
      position,
      velocity,
      currentTime
    );

    if (validationResult.valid) {
      // Update server state
      // eslint-disable-next-line no-param-reassign
      player.position = { ...position };
      // eslint-disable-next-line no-param-reassign
      player.velocity = { ...velocity };
      // eslint-disable-next-line no-param-reassign
      player.lastSequence = sequence || 0;
      // eslint-disable-next-line no-param-reassign
      player.lastUpdate = currentTime;

      // Broadcast to other players
      this.broadcastToOthers(userId, 'playerMove', {
        playerId: userId,
        position,
        velocity,
        sequence,
        timestamp: currentTime,
      });

      // Debug: outgoing player movement
      console.log(
        `[MOVE_OUT] room=${this.id} player=${userId} seq=${sequence ?? 0}`
      );

      // Send authoritative state back to client for reconciliation
      player.socket.emit('serverState', {
        position,
        velocity,
        sequence,
        timestamp: currentTime,
      });
    } else {
      // Send correction back to client
      const { correctedState } = validationResult;
      console.log(
        `[MOVE_REJECT] user=${userId} reason=${validationResult.reason}`
      );
      if (correctedState) {
        const finalPosition = correctedState.position ||
          player.position || { x: 0, y: 0 };
        const finalVelocity = correctedState.velocity ||
          player.velocity || { x: 0, y: 0 };

        player.socket.emit('positionCorrection', {
          position: finalPosition,
          velocity: finalVelocity,
          sequence: sequence || 0,
          timestamp: currentTime,
          reason: validationResult.reason,
        });
      }
    }

    this.updateActivity();
  }

  public handleGameEvent(event: GameEvent): void {
    if (this.gameState !== GameState.PLAYING) {
      return;
    }

    // Process game event and broadcast to all players
    const processedEvent: ProcessedGameEvent = {
      ...event,
      timestamp: Date.now(),
      roomId: this.id,
    };

    this.broadcastToRoom('gameEvent', processedEvent);

    // Handle specific event types
    switch (event.type) {
      case 'player_hit':
        this.handlePlayerHit(event.data);
        break;
      case 'player_ko':
        this.handlePlayerKO(event.data);
        break;
      case 'match_timeout':
        this.handleMatchTimeout();
        break;
      default:
        break;
    }

    this.updateActivity();
  }

  // eslint-disable-next-line class-methods-use-this, @typescript-eslint/no-unused-vars
  private handlePlayerHit(_data: any): void {
    // Process hit validation and damage calculation
    // This would integrate with the physics system
  }

  private handlePlayerKO(data: any): void {
    const { playerId } = data;

    // Check if this results in a match end
    const alivePlayers = Array.from(this.players.values()).filter(
      p => p.state === PlayerState.PLAYING && p.userId !== playerId
    );

    if (alivePlayers.length === 1) {
      // Match over - we have a winner
      const winner = alivePlayers[0];
      const results: GameResults = {
        winnerId: winner.userId,
        winnerUsername: winner.username,
        loserId: playerId,
        loserUsername: this.players.get(playerId)?.username,
        endReason: 'knockout',
        finalScores: {}, // Would be populated with actual scores
        matchDuration: Date.now() - this.createdAt.getTime(),
        endedAt: new Date(),
      };

      this.endGame(results);
      this.broadcastToRoom('matchEnd', results);
    }
  }

  private handleMatchTimeout(): void {
    // Handle match ending due to timeout
    const results: GameResults = {
      endReason: 'timeout',
      finalScores: {}, // Would determine winner by score/health
      matchDuration: this.config.timeLimit! * 1000,
      endedAt: new Date(),
    };

    this.endGame(results);
    this.broadcastToRoom('matchEnd', results);
  }

  public syncRoomState(): void {
    const roomState = this.getRoomState();
    this.broadcastToRoom('roomStateSync', roomState);
  }

  public requestGameStateSync(userId: string): void {
    const player = this.players.get(userId);
    if (!player) return;

    const gameState = this.getGameSyncState();
    player.socket.emit('gameStateSync', gameState);
  }

  private getGameSyncState(): GameSyncState {
    return {
      roomId: this.id,
      gameState: this.gameState,
      players: Array.from(this.players.values()).map(p => ({
        userId: p.userId,
        username: p.username,
        character: p.character,
        state: p.state,
      })),
      config: this.config,
      timestamp: Date.now(),
    };
  }

  // Physics integration methods
  private initializeStagePhysics(stageName: string): void {
    // Create stage data based on stage name
    // This would normally come from a stage configuration file
    const stageData: StageData = this.getStageConfiguration(stageName);
    this.physicsSystem.setStageData(stageData);
  }

  // eslint-disable-next-line class-methods-use-this
  private getStageConfiguration(stageName: string): StageData {
    // Basic stage configurations - will be loaded from database later
    const stageConfigurations: Record<string, StageData> = {
      arena: {
        platforms: [
          { x: 0, y: 300, width: 1600, height: 50 }, // Main platform
          { x: -600, y: 100, width: 300, height: 30 }, // Left platform
          { x: 300, y: 100, width: 300, height: 30 }, // Right platform
        ],
        boundaries: {
          left: -1000,
          right: 1000,
          top: -500,
          bottom: 400,
        },
        hazards: [],
      },
      default: {
        platforms: [
          { x: 0, y: 200, width: 1000, height: 50 }, // Simple main platform
        ],
        boundaries: {
          left: -600,
          right: 600,
          top: -200,
          bottom: 300,
        },
        hazards: [],
      },
    };

    return stageConfigurations[stageName] || stageConfigurations.default;
  }

  public async handleAttack(attackData: AttackData): Promise<void> {
    if (this.gameState !== GameState.PLAYING) {
      return;
    }

    // Validate attack using physics system
    const validationResult =
      await this.physicsSystem.validateAttack(attackData);

    if (validationResult.valid) {
      // Apply damage and knockback
      const damageResult = this.physicsSystem.applyDamage(
        attackData.targetId,
        attackData.damage,
        attackData.knockback,
        attackData.timestamp
      );

      if (damageResult.success && damageResult.newState) {
        // Broadcast attack event to all players
        this.broadcastToRoom('attackHit', {
          attackerId: attackData.attackerId,
          targetId: attackData.targetId,
          damage: attackData.damage,
          knockback: attackData.knockback,
          timestamp: attackData.timestamp,
          newTargetState: {
            health: damageResult.newState.health,
            stocks: damageResult.newState.stocks,
            position: damageResult.newState.position,
            velocity: damageResult.newState.velocity,
            isInvulnerable: damageResult.newState.isInvulnerable,
          },
        });

        // Check for KO
        if (damageResult.newState.stocks <= 0) {
          this.handlePlayerKO({ playerId: attackData.targetId });
        }
      }
    } else {
      // Attack was invalid, notify attacker
      const attacker = this.players.get(attackData.attackerId);
      if (attacker) {
        attacker.socket.emit('attackRejected', {
          reason: validationResult.reason,
          timestamp: attackData.timestamp,
        });
      }
    }

    this.updateActivity();
  }

  public startPhysicsUpdate(): void {
    if (this.physicsUpdateInterval) {
      clearInterval(this.physicsUpdateInterval);
    }

    // Update physics at 60 FPS
    this.physicsUpdateInterval = setInterval(async () => {
      if (this.gameState === GameState.PLAYING) {
        const deltaTime = 1000 / 60; // 16.67ms
        const updatedStates = await this.physicsSystem.updatePhysics(deltaTime);

        // Broadcast physics updates to all players
        const physicsUpdate = {
          timestamp: Date.now(),
          players: Array.from(updatedStates.entries()).map(
            ([playerId, state]) => ({
              playerId,
              position: state.position,
              velocity: state.velocity,
              health: state.health,
              stocks: state.stocks,
              isInvulnerable: state.isInvulnerable,
              isGrounded: state.isGrounded,
            })
          ),
        };

        this.broadcastToRoom('physicsUpdate', physicsUpdate);
      }
    }, 1000 / 60);
  }

  public stopPhysicsUpdate(): void {
    if (this.physicsUpdateInterval) {
      clearInterval(this.physicsUpdateInterval);
      this.physicsUpdateInterval = null;
    }
  }

  // Periodic state synchronization
  public startPeriodicSync(intervalMs: number = 1000): NodeJS.Timeout {
    return setInterval(() => {
      if (this.gameState === GameState.PLAYING) {
        this.syncRoomState();
      }
    }, intervalMs);
  }

  // Disconnect handling methods
  private setReconnectionTimeout(userId: string): void {
    const player = this.players.get(userId);
    if (!player) return;

    // Clear existing timeout if any
    if (player.reconnectionTimeout) {
      clearTimeout(player.reconnectionTimeout);
    }

    // Calculate total time spent disconnected by this player
    const totalDisconnectTime = this.getTotalDisconnectTime(userId);
    const remainingTime = Math.max(
      0,
      this.MAX_RECONNECTION_TIME - totalDisconnectTime
    );

    // If player has exceeded max reconnection time, handle immediately
    if (remainingTime <= 0) {
      console.log(
        `Player ${player.username} has exceeded max reconnection time (${this.MAX_RECONNECTION_TIME}ms), removing immediately`
      );
      this.handleReconnectionTimeout(userId);
      return;
    }

    // Use the shorter of grace period or remaining time
    const timeoutDuration = Math.min(
      this.RECONNECTION_GRACE_PERIOD,
      remainingTime
    );

    // Set new timeout
    // eslint-disable-next-line no-param-reassign
    player.reconnectionTimeout = setTimeout(() => {
      this.handleReconnectionTimeout(userId);
    }, timeoutDuration);

    console.log(
      `Set reconnection timeout for player ${player.username} (${timeoutDuration}ms, ${remainingTime}ms total remaining)`
    );

    // Schedule room cleanup if no more active players and auto-cleanup is enabled
    this.scheduleRoomCleanupIfNeeded();
  }

  private handleReconnectionTimeout(userId: string): void {
    const player = this.players.get(userId);
    if (!player || player.state !== PlayerState.DISCONNECTED) {
      return;
    }

    console.log(
      `Reconnection timeout for player ${player.username} in room ${this.id}`
    );

    // Check if player has too many disconnects
    const shouldRemovePlayer =
      (player.disconnectCount || 0) >= this.MAX_DISCONNECT_COUNT;

    if (shouldRemovePlayer) {
      console.log(
        `Removing player ${player.username} due to excessive disconnects (${player.disconnectCount})`
      );

      // End game if in progress
      if (
        this.gameState === GameState.PLAYING ||
        this.gameState === GameState.PAUSED
      ) {
        const results: GameResults = {
          endReason: 'disconnect',
          finalScores: {},
          matchDuration: Date.now() - this.createdAt.getTime(),
          endedAt: new Date(),
        };

        // Set winner as the remaining connected player
        const connectedPlayers = this.getPlayersByState(PlayerState.PLAYING)
          .concat(this.getPlayersByState(PlayerState.CONNECTED))
          .filter(p => p.userId !== userId);

        if (connectedPlayers.length > 0) {
          const winner = connectedPlayers[0];
          results.winnerId = winner.userId;
          results.winnerUsername = winner.username;
          results.loserId = userId;
          results.loserUsername = player.username;
        }

        this.endGame(results);
        this.broadcastToRoom('matchEnd', results);
      }

      // Remove player from room
      this.removePlayer(userId);
    } else {
      // Keep player but notify others
      this.broadcastToOthers(userId, 'playerReconnectionTimeout', {
        playerId: userId,
        username: player.username,
        disconnectCount: player.disconnectCount,
        timeoutAt: new Date(),
      });

      // If game was paused, consider ending it or keeping it paused
      if (this.gameState === GameState.PAUSED) {
        // For now, keep the game paused - could add policy to auto-end after certain time
        console.log(
          `Game remains paused due to ${player.username} not reconnecting`
        );
      }
    }
  }

  public getDisconnectedPlayers(): GameRoomPlayer[] {
    return this.getPlayersByState(PlayerState.DISCONNECTED);
  }

  public getReconnectionInfo(userId: string): {
    isDisconnected: boolean;
    disconnectedAt?: Date;
    timeRemaining?: number;
    totalTimeRemaining?: number;
    disconnectCount?: number;
    maxDisconnectCount?: number;
  } {
    const player = this.players.get(userId);
    if (!player || player.state !== PlayerState.DISCONNECTED) {
      return { isDisconnected: false };
    }

    const totalDisconnectTime = this.getTotalDisconnectTime(userId);
    const totalTimeRemaining = Math.max(
      0,
      this.MAX_RECONNECTION_TIME - totalDisconnectTime
    );
    const timeRemaining = player.disconnectedAt
      ? Math.max(
          0,
          Math.min(
            this.RECONNECTION_GRACE_PERIOD -
              (Date.now() - player.disconnectedAt.getTime()),
            totalTimeRemaining
          )
        )
      : 0;

    return {
      isDisconnected: true,
      ...(player.disconnectedAt && { disconnectedAt: player.disconnectedAt }),
      timeRemaining,
      totalTimeRemaining,
      disconnectCount: player.disconnectCount || 0,
      maxDisconnectCount: this.MAX_DISCONNECT_COUNT,
    };
  }

  public forceRemoveDisconnectedPlayer(userId: string): boolean {
    const player = this.players.get(userId);
    if (!player || player.state !== PlayerState.DISCONNECTED) {
      return false;
    }

    // Clear timeout
    if (player.reconnectionTimeout) {
      clearTimeout(player.reconnectionTimeout);
    }

    // Force removal
    this.handleReconnectionTimeout(userId);
    return true;
  }

  private getTotalDisconnectTime(userId: string): number {
    const player = this.players.get(userId);
    if (!player) return 0;

    let totalTime = 0;

    // Add time from current disconnection if any
    if (player.disconnectedAt) {
      totalTime += Date.now() - player.disconnectedAt.getTime();
    }

    // For simplicity, we'll just track current disconnection time
    // In a more complex system, we'd track historical disconnect times
    return totalTime;
  }

  private scheduleRoomCleanupIfNeeded(): void {
    if (!this.AUTO_CLEANUP_ON_TIMEOUT || this.isScheduledForCleanup) {
      return;
    }

    // Check if all players are disconnected
    const connectedPlayers = this.getPlayersByState(PlayerState.CONNECTED)
      .concat(this.getPlayersByState(PlayerState.PLAYING))
      .concat(this.getPlayersByState(PlayerState.READY));

    if (connectedPlayers.length === 0) {
      this.isScheduledForCleanup = true;
      this.cleanupTimeout = setTimeout(() => {
        console.log(
          `Auto-cleaning up room ${this.id} due to all players disconnected`
        );
        this.forceCleanup();
      }, this.MAX_RECONNECTION_TIME);

      console.log(
        `Scheduled room ${this.id} for cleanup in ${this.MAX_RECONNECTION_TIME}ms (all players disconnected)`
      );
    }
  }

  private cancelRoomCleanup(): void {
    if (this.cleanupTimeout) {
      clearTimeout(this.cleanupTimeout);
      this.cleanupTimeout = null;
      this.isScheduledForCleanup = false;
      console.log(`Cancelled room cleanup for ${this.id}`);
    }
  }

  public forceCleanup(): void {
    console.log(`Force cleaning up room ${this.id}`);

    // End any active game
    if (
      this.gameState === GameState.PLAYING ||
      this.gameState === GameState.PAUSED
    ) {
      this.endGame({
        endReason: 'disconnect',
        finalScores: {},
        matchDuration: Date.now() - this.createdAt.getTime(),
        endedAt: new Date(),
      });
    }

    this.cleanup();
  }

  public isScheduledForDestruction(): boolean {
    return this.isScheduledForCleanup;
  }

  public getReconnectionConfig(): {
    gracePeriod: number;
    maxReconnectionTime: number;
    maxDisconnectCount: number;
    autoCleanupOnTimeout: boolean;
  } {
    return {
      gracePeriod: this.RECONNECTION_GRACE_PERIOD,
      maxReconnectionTime: this.MAX_RECONNECTION_TIME,
      maxDisconnectCount: this.MAX_DISCONNECT_COUNT,
      autoCleanupOnTimeout: this.AUTO_CLEANUP_ON_TIMEOUT,
    };
  }

  // Enhanced cleanup method
  public cleanup(): void {
    // Clear all reconnection timeouts
    this.players.forEach(player => {
      if (player.reconnectionTimeout) {
        clearTimeout(player.reconnectionTimeout);
      }
    });

    // Clear room cleanup timeout
    this.cancelRoomCleanup();

    // Stop physics updates
    this.stopPhysicsUpdate();

    // Clear players
    this.players.clear();

    console.log(`GameRoom ${this.id} cleaned up`);
  }
}
