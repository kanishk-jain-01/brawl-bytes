import { io, Socket } from 'socket.io-client';

export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  AUTHENTICATED = 'authenticated',
  ERROR = 'error',
}

export interface SocketConfig {
  url: string;
  autoConnect?: boolean;
  reconnection?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
  timeout?: number;
}

export interface AuthResponse {
  success: boolean;
  userId?: string;
  username?: string;
  error?: string;
}

export interface RoomResponse {
  success: boolean;
  roomId?: string;
  error?: string;
  playerCount?: number;
  maxPlayers?: number;
}

export interface PlayerJoinedData {
  roomId: string;
  playerId: string;
  username: string;
  playerCount: number;
  maxPlayers: number;
}

export interface PlayerLeftData {
  roomId: string;
  playerId: string;
  username: string;
  playerCount: number;
}

export interface GameReadyData {
  roomId: string;
  players: {
    id: string;
    username: string;
  }[];
}

export interface RoomStateData {
  roomId: string;
  gameState: string;
  players: {
    userId: string;
    username: string;
    state: string;
    character?: string;
    isHost: boolean;
  }[];
  config: {
    maxPlayers: number;
    gameMode: string;
    stage?: string;
    timeLimit?: number;
    stockCount?: number;
  };
}

export interface GameEventData {
  type: string;
  data: any;
  timestamp?: number;
}

export interface PlayerInputData {
  playerId: string;
  inputType: 'move' | 'attack' | 'jump' | 'special';
  data: any;
  sequence: number;
  timestamp: number;
}

export interface GameStateSync {
  roomId: string;
  gameState: string;
  players: {
    userId: string;
    username: string;
    character?: string;
    state: string;
  }[];
  config: any;
  timestamp: number;
}

export interface MatchEndData {
  winnerId?: string;
  winnerUsername?: string;
  loserId?: string;
  loserUsername?: string;
  endReason: 'knockout' | 'timeout' | 'forfeit' | 'disconnect';
  finalScores: { [playerId: string]: number };
  matchDuration: number;
  endedAt: Date;
}

export interface ErrorData {
  type: 'connection' | 'authentication' | 'room' | 'game' | 'network';
  message: string;
  code?: string;
  timestamp: number;
  recoverable?: boolean;
}

export interface ConnectionMetrics {
  latency: number;
  packetLoss: number;
  lastPingTime: number;
  averageLatency: number;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
}

export class SocketManager {
  private socket: Socket | null = null;

  private connectionState: ConnectionState = ConnectionState.DISCONNECTED;

  private config: SocketConfig;

  private authToken: string | null = null;

  private currentRoomId: string | null = null;

  private eventListeners: Map<string, ((...args: any[]) => void)[]> = new Map();

  private reconnectAttempts = 0;

  private maxReconnectAttempts = 5;

  private errorHistory: ErrorData[] = [];

  private connectionMetrics: ConnectionMetrics = {
    latency: 0,
    packetLoss: 0,
    lastPingTime: 0,
    averageLatency: 0,
    connectionQuality: 'excellent',
  };

  private pingInterval: NodeJS.Timeout | null = null;

  private heartbeatInterval: NodeJS.Timeout | null = null;

  private lastHeartbeat = 0;

  constructor(config: SocketConfig) {
    this.config = {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000,
      ...config,
    };
  }

  // Connection management
  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve();
        return;
      }

      this.setConnectionState(ConnectionState.CONNECTING);

      this.socket = io(this.config.url, {
        autoConnect: this.config.autoConnect,
        reconnection: this.config.reconnection,
        reconnectionAttempts: this.config.reconnectionAttempts,
        reconnectionDelay: this.config.reconnectionDelay,
        timeout: this.config.timeout,
      });

      this.setupEventHandlers();

      // Connection success
      this.socket.on('connect', () => {
        this.setConnectionState(ConnectionState.CONNECTED);
        this.reconnectAttempts = 0;
        this.startConnectionMonitoring();
        resolve();
      });

      // Connection error
      this.socket.on('connect_error', error => {
        this.setConnectionState(ConnectionState.ERROR);
        this.logError(
          'connection',
          `Connection failed: ${error.message}`,
          'CONNECT_ERROR',
          true
        );
        reject(new Error(`Connection failed: ${error.message}`));
      });

      // Disconnection
      this.socket.on('disconnect', reason => {
        this.setConnectionState(ConnectionState.DISCONNECTED);
        this.emit('disconnected', { reason });

        if (reason === 'io server disconnect') {
          // Server disconnected the client, attempt to reconnect
          this.handleReconnection();
        }
      });

      // Reconnection events
      this.socket.on('reconnect', attemptNumber => {
        this.setConnectionState(ConnectionState.CONNECTED);
        this.emit('reconnected', { attemptNumber });

        // Restart monitoring
        this.startConnectionMonitoring();

        // Re-authenticate if we have a token
        if (this.authToken) {
          this.authenticate(this.authToken);
        }
      });

      this.socket.on('reconnect_error', error => {
        this.logError(
          'connection',
          `Reconnection failed: ${error.message}`,
          'RECONNECT_ERROR',
          true
        );
        this.emit('reconnect_error', { error: error.message });
      });

      this.socket.on('reconnect_failed', () => {
        this.setConnectionState(ConnectionState.ERROR);
        this.logError(
          'connection',
          'Max reconnection attempts reached',
          'RECONNECT_FAILED',
          false
        );
        this.emit('reconnect_failed', {});
      });
    });
  }

  public disconnect(): void {
    // Clear intervals
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.setConnectionState(ConnectionState.DISCONNECTED);
    this.authToken = null;
    this.currentRoomId = null;
  }

  public isConnected(): boolean {
    return this.socket?.connected || false;
  }

  public isAuthenticated(): boolean {
    return this.connectionState === ConnectionState.AUTHENTICATED;
  }

  public getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  public getCurrentRoomId(): string | null {
    return this.currentRoomId;
  }

  // Event management
  public on(event: string, callback: (...args: any[]) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  public off(event: string, callback?: (...args: any[]) => void): void {
    if (!this.eventListeners.has(event)) return;

    if (callback) {
      const listeners = this.eventListeners.get(event)!;
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    } else {
      this.eventListeners.delete(event);
    }
  }

  public emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  // Private helper methods
  private setConnectionState(state: ConnectionState): void {
    const previousState = this.connectionState;
    this.connectionState = state;
    this.emit('connectionStateChanged', {
      previousState,
      currentState: state,
    });
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    // Welcome message
    this.socket.on('welcome', data => {
      this.emit('welcome', data);
    });

    // Authentication response
    this.socket.on('authenticated', (response: AuthResponse) => {
      if (response.success) {
        this.setConnectionState(ConnectionState.AUTHENTICATED);
        this.emit('authenticated', response);
      } else {
        this.emit('authenticationFailed', response);
      }
    });

    // Room events
    this.socket.on('roomCreated', data => {
      this.emit('roomCreated', data);
    });

    this.socket.on('playerJoined', (data: PlayerJoinedData) => {
      this.emit('playerJoined', data);
    });

    this.socket.on('playerLeft', (data: PlayerLeftData) => {
      this.emit('playerLeft', data);

      // Clear current room if we left
      if (data.playerId === this.authToken) {
        this.currentRoomId = null;
      }
    });

    this.socket.on('gameReady', (data: GameReadyData) => {
      this.emit('gameReady', data);
    });

    this.socket.on('roomStateSync', (data: RoomStateData) => {
      this.emit('roomStateSync', data);
    });

    this.socket.on('roomError', error => {
      this.emit('roomError', error);
    });

    // Player state events
    this.socket.on('playerReady', data => {
      this.emit('playerReady', data);
    });

    this.socket.on('characterSelected', data => {
      this.emit('characterSelected', data);
    });

    this.socket.on('stageSelected', data => {
      this.emit('stageSelected', data);
    });

    this.socket.on('gameStarting', data => {
      this.emit('gameStarting', data);
    });

    this.socket.on('gameStarted', data => {
      this.emit('gameStarted', data);
    });

    // Game events
    this.socket.on('playerInput', (data: PlayerInputData) => {
      this.emit('playerInput', data);
    });

    this.socket.on('gameEvent', (data: GameEventData) => {
      this.emit('gameEvent', data);
    });

    this.socket.on('gameStateSync', (data: GameStateSync) => {
      this.emit('gameStateSync', data);
    });

    this.socket.on('matchEnd', (data: MatchEndData) => {
      this.emit('matchEnd', data);
    });

    // Specific game event handlers
    this.socket.on('playerHit', data => {
      this.emit('playerHit', data);
    });

    this.socket.on('playerKO', data => {
      this.emit('playerKO', data);
    });

    this.socket.on('playerRespawn', data => {
      this.emit('playerRespawn', data);
    });

    this.socket.on('stageHazard', data => {
      this.emit('stageHazard', data);
    });

    this.socket.on('powerupSpawn', data => {
      this.emit('powerupSpawn', data);
    });

    this.socket.on('powerupCollected', data => {
      this.emit('powerupCollected', data);
    });

    // Match state events
    this.socket.on('matchPaused', data => {
      this.emit('matchPaused', data);
    });

    this.socket.on('matchResumed', data => {
      this.emit('matchResumed', data);
    });

    this.socket.on('matchTimeout', data => {
      this.emit('matchTimeout', data);
    });

    // Error handling
    this.socket.on('error', error => {
      this.emit('error', { error });
    });
  }

  private handleReconnection(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.emit('maxReconnectAttemptsReached', {});
      return;
    }

    this.reconnectAttempts += 1;
    this.emit('reconnecting', { attempt: this.reconnectAttempts });
  }

  // Authentication methods
  public authenticate(token: string): Promise<AuthResponse> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.isConnected()) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.authToken = token;

      // Set up one-time listeners for authentication response
      const onAuthenticated = (response: AuthResponse) => {
        this.socket!.off('authenticated', onAuthenticated);
        // eslint-disable-next-line no-use-before-define
        this.socket!.off('authenticationFailed', onAuthFailed);
        resolve(response);
      };

      const onAuthFailed = (response: AuthResponse) => {
        this.socket!.off('authenticated', onAuthenticated);
        this.socket!.off('authenticationFailed', onAuthFailed);
        this.authToken = null;
        reject(new Error(response.error || 'Authentication failed'));
      };

      this.socket.on('authenticated', onAuthenticated);
      this.socket.on('authenticationFailed', onAuthFailed);

      // Send authentication request
      this.socket.emit('authenticate', token);
    });
  }

  public logout(): void {
    this.authToken = null;
    this.setConnectionState(ConnectionState.CONNECTED);
    this.emit('logout', {});
  }

  public getAuthToken(): string | null {
    return this.authToken;
  }

  // Token management utilities
  public static storeToken(token: string): void {
    try {
      localStorage.setItem('brawlbytes_auth_token', token);
    } catch (error) {
      console.warn('Failed to store auth token:', error);
    }
  }

  public static getStoredToken(): string | null {
    try {
      return localStorage.getItem('brawlbytes_auth_token');
    } catch (error) {
      console.warn('Failed to retrieve auth token:', error);
      return null;
    }
  }

  public static clearStoredToken(): void {
    try {
      localStorage.removeItem('brawlbytes_auth_token');
    } catch (error) {
      console.warn('Failed to clear auth token:', error);
    }
  }

  public static isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp < currentTime;
    } catch {
      return true; // Treat invalid tokens as expired
    }
  }

  // Auto-authentication with stored token
  public async autoAuthenticate(): Promise<boolean> {
    const storedToken = SocketManager.getStoredToken();

    if (!storedToken) {
      return false;
    }

    if (SocketManager.isTokenExpired(storedToken)) {
      SocketManager.clearStoredToken();
      return false;
    }

    try {
      await this.authenticate(storedToken);
      return true;
    } catch {
      SocketManager.clearStoredToken();
      return false;
    }
  }

  // Enhanced connection method with auto-authentication
  public async connectAndAuthenticate(token?: string): Promise<AuthResponse> {
    await this.connect();

    const authToken = token || SocketManager.getStoredToken();
    if (!authToken) {
      throw new Error('No authentication token available');
    }

    if (SocketManager.isTokenExpired(authToken)) {
      SocketManager.clearStoredToken();
      throw new Error('Authentication token expired');
    }

    const authResponse = await this.authenticate(authToken);

    if (authResponse.success && token) {
      SocketManager.storeToken(token);
    }

    return authResponse;
  }

  // Room management methods
  public createRoom(): Promise<RoomResponse> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.isAuthenticated()) {
        reject(new Error('Must be authenticated to create room'));
        return;
      }

      // Set up one-time listeners for room creation response
      const onRoomCreated = (response: RoomResponse) => {
        this.socket!.off('roomCreated', onRoomCreated);
        // eslint-disable-next-line no-use-before-define
        this.socket!.off('roomError', onRoomError);

        if (response.success && response.roomId) {
          this.currentRoomId = response.roomId;
        }
        resolve(response);
      };

      const onRoomError = (error: { message: string }) => {
        this.socket!.off('roomCreated', onRoomCreated);
        this.socket!.off('roomError', onRoomError);
        reject(new Error(error.message));
      };

      this.socket.on('roomCreated', onRoomCreated);
      this.socket.on('roomError', onRoomError);

      // Send room creation request
      this.socket.emit('createRoom');
    });
  }

  public joinRoom(roomId: string): Promise<RoomResponse> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.isAuthenticated()) {
        reject(new Error('Must be authenticated to join room'));
        return;
      }

      // Set up one-time listeners for join response
      const onPlayerJoined = (data: PlayerJoinedData) => {
        this.socket!.off('playerJoined', onPlayerJoined);
        // eslint-disable-next-line no-use-before-define
        this.socket!.off('roomError', onRoomError);

        this.currentRoomId = data.roomId;
        resolve({
          success: true,
          roomId: data.roomId,
          playerCount: data.playerCount,
          maxPlayers: data.maxPlayers,
        });
      };

      const onRoomError = (error: { message: string }) => {
        this.socket!.off('playerJoined', onPlayerJoined);
        this.socket!.off('roomError', onRoomError);
        reject(new Error(error.message));
      };

      this.socket.on('playerJoined', onPlayerJoined);
      this.socket.on('roomError', onRoomError);

      // Send join request
      this.socket.emit('joinRoom', roomId);
    });
  }

  public leaveRoom(): Promise<void> {
    return new Promise(resolve => {
      if (!this.socket || !this.currentRoomId) {
        resolve(); // Already not in a room
        return;
      }

      // Set up one-time listener for leave confirmation
      const onPlayerLeft = () => {
        this.socket!.off('playerLeft', onPlayerLeft);
        this.currentRoomId = null;
        resolve();
      };

      this.socket.on('playerLeft', onPlayerLeft);

      // Send leave request
      this.socket.emit('leaveRoom');

      // Fallback timeout in case server doesn't respond
      setTimeout(() => {
        this.socket!.off('playerLeft', onPlayerLeft);
        this.currentRoomId = null;
        resolve();
      }, 5000);
    });
  }

  // Player state management
  public setPlayerReady(ready: boolean = true): void {
    if (!this.socket || !this.isAuthenticated() || !this.currentRoomId) {
      // eslint-disable-next-line no-console
      console.warn('Cannot set ready state: not authenticated or not in room');
      return;
    }

    this.socket.emit('playerReady', { ready });
  }

  public selectCharacter(character: string): void {
    if (!this.socket || !this.isAuthenticated() || !this.currentRoomId) {
      // eslint-disable-next-line no-console
      console.warn('Cannot select character: not authenticated or not in room');
      return;
    }

    this.socket.emit('selectCharacter', { character });
  }

  public selectStage(stage: string): void {
    if (!this.socket || !this.isAuthenticated() || !this.currentRoomId) {
      // eslint-disable-next-line no-console
      console.warn('Cannot select stage: not authenticated or not in room');
      return;
    }

    this.socket.emit('selectStage', { stage });
  }

  public startGame(): void {
    if (!this.socket || !this.isAuthenticated() || !this.currentRoomId) {
      // eslint-disable-next-line no-console
      console.warn('Cannot start game: not authenticated or not in room');
      return;
    }

    this.socket.emit('startGame');
  }

  // Room information methods
  public requestRoomState(): void {
    if (!this.socket || !this.currentRoomId) {
      return;
    }

    this.socket.emit('requestRoomState');
  }

  public isInRoom(): boolean {
    return this.currentRoomId !== null;
  }

  // Game event methods
  public sendPlayerInput(
    inputType: 'move' | 'attack' | 'jump' | 'special',
    data: any,
    sequence: number = 0
  ): void {
    if (!this.socket || !this.isAuthenticated() || !this.currentRoomId) {
      // eslint-disable-next-line no-console
      console.warn(
        'Cannot send player input: not authenticated or not in room'
      );
      return;
    }

    const inputData: PlayerInputData = {
      playerId: this.authToken!, // We know it exists due to isAuthenticated check
      inputType,
      data,
      sequence,
      timestamp: Date.now(),
    };

    this.socket.emit('playerInput', inputData);
  }

  public sendGameEvent(eventType: string, eventData: any): void {
    if (!this.socket || !this.isAuthenticated() || !this.currentRoomId) {
      // eslint-disable-next-line no-console
      console.warn('Cannot send game event: not authenticated or not in room');
      return;
    }

    const gameEvent: GameEventData = {
      type: eventType,
      data: eventData,
      timestamp: Date.now(),
    };

    this.socket.emit('gameEvent', gameEvent);
  }

  public requestGameStateSync(): void {
    if (!this.socket || !this.currentRoomId) {
      return;
    }

    this.socket.emit('requestGameStateSync');
  }

  // Convenience methods for common game events
  public sendPlayerMove(
    position: { x: number; y: number },
    velocity: { x: number; y: number }
  ): void {
    this.sendPlayerInput('move', { position, velocity });
  }

  public sendPlayerAttack(
    attackType: string,
    direction: number,
    hitbox?: any
  ): void {
    this.sendPlayerInput('attack', { attackType, direction, hitbox });
  }

  public sendPlayerJump(jumpType: 'single' | 'double' | 'wall'): void {
    this.sendPlayerInput('jump', { jumpType });
  }

  public sendPlayerSpecial(specialType: string, data?: any): void {
    this.sendPlayerInput('special', { specialType, ...data });
  }

  // Game state events
  public reportPlayerHit(
    targetPlayerId: string,
    damage: number,
    knockback: any
  ): void {
    this.sendGameEvent('player_hit', {
      targetPlayerId,
      damage,
      knockback,
      attackerId: this.authToken,
    });
  }

  public reportPlayerKO(targetPlayerId: string): void {
    this.sendGameEvent('player_ko', {
      targetPlayerId,
      knockedOutBy: this.authToken,
    });
  }

  public reportStageHazard(
    hazardType: string,
    affectedPlayers: string[],
    damage?: number
  ): void {
    this.sendGameEvent('stage_hazard', {
      hazardType,
      affectedPlayers,
      damage,
    });
  }

  // Error handling and connection management
  public logError(
    type: ErrorData['type'],
    message: string,
    code?: string,
    recoverable: boolean = true
  ): void {
    const error: ErrorData = {
      type,
      message,
      code,
      timestamp: Date.now(),
      recoverable,
    };

    this.errorHistory.push(error);

    // Keep only last 50 errors
    if (this.errorHistory.length > 50) {
      this.errorHistory.shift();
    }

    this.emit('error', error);

    // Auto-recovery for recoverable errors
    if (recoverable) {
      this.attemptErrorRecovery(error);
    }
  }

  private attemptErrorRecovery(error: ErrorData): void {
    switch (error.type) {
      case 'connection':
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.handleReconnection();
        }
        break;
      case 'authentication':
        // Try to re-authenticate with stored token
        this.autoAuthenticate().catch(() => {
          this.emit('authenticationRecoveryFailed', {});
        });
        break;
      case 'room':
        // Request room state sync
        this.requestRoomState();
        break;
      case 'game':
        // Request game state sync
        this.requestGameStateSync();
        break;
      default:
        break;
    }
  }

  public getErrorHistory(): ErrorData[] {
    return [...this.errorHistory];
  }

  public clearErrorHistory(): void {
    this.errorHistory = [];
  }

  public getConnectionMetrics(): ConnectionMetrics {
    return { ...this.connectionMetrics };
  }

  private startConnectionMonitoring(): void {
    // Start ping monitoring
    this.pingInterval = setInterval(() => {
      this.measureLatency();
    }, 5000); // Ping every 5 seconds

    // Start heartbeat monitoring
    this.heartbeatInterval = setInterval(() => {
      this.checkHeartbeat();
    }, 30000); // Check heartbeat every 30 seconds
  }

  private measureLatency(): void {
    if (!this.socket || !this.isConnected()) {
      return;
    }

    const startTime = Date.now();
    this.socket.emit('ping', startTime);

    // Set up one-time listener for pong response
    const onPong = (timestamp: number) => {
      this.socket!.off('pong', onPong);

      const latency = Date.now() - timestamp;
      this.updateConnectionMetrics(latency);
    };

    this.socket.on('pong', onPong);

    // Timeout if no response
    setTimeout(() => {
      this.socket!.off('pong', onPong);
      this.logError('network', 'Ping timeout', 'PING_TIMEOUT', true);
    }, 5000);
  }

  private updateConnectionMetrics(latency: number): void {
    this.connectionMetrics.latency = latency;
    this.connectionMetrics.lastPingTime = Date.now();

    // Calculate average latency (simple moving average of last 10 measurements)
    if (!this.connectionMetrics.averageLatency) {
      this.connectionMetrics.averageLatency = latency;
    } else {
      this.connectionMetrics.averageLatency =
        (this.connectionMetrics.averageLatency * 9 + latency) / 10;
    }

    // Update connection quality
    this.updateConnectionQuality();

    this.emit('connectionMetricsUpdated', this.connectionMetrics);
  }

  private updateConnectionQuality(): void {
    const avgLatency = this.connectionMetrics.averageLatency;

    if (avgLatency < 50) {
      this.connectionMetrics.connectionQuality = 'excellent';
    } else if (avgLatency < 100) {
      this.connectionMetrics.connectionQuality = 'good';
    } else if (avgLatency < 200) {
      this.connectionMetrics.connectionQuality = 'fair';
    } else {
      this.connectionMetrics.connectionQuality = 'poor';
    }
  }

  private checkHeartbeat(): void {
    if (!this.socket || !this.isConnected()) {
      return;
    }

    const now = Date.now();
    this.socket.emit('heartbeat', now);
    this.lastHeartbeat = now;

    // Check if we've missed heartbeats
    if (this.lastHeartbeat && now - this.lastHeartbeat > 60000) {
      this.logError(
        'connection',
        'Heartbeat timeout detected',
        'HEARTBEAT_TIMEOUT',
        true
      );
    }
  }

  // Enhanced validation methods
  public validateSocketState(): boolean {
    if (!this.socket) {
      this.logError('connection', 'Socket not initialized', 'NO_SOCKET', true);
      return false;
    }

    if (!this.isConnected()) {
      this.logError(
        'connection',
        'Socket not connected',
        'NOT_CONNECTED',
        true
      );
      return false;
    }

    return true;
  }

  public validateAuthentication(): boolean {
    if (!this.isAuthenticated()) {
      this.logError(
        'authentication',
        'Not authenticated',
        'NOT_AUTHENTICATED',
        true
      );
      return false;
    }

    const token = this.getAuthToken();
    if (token && SocketManager.isTokenExpired(token)) {
      this.logError(
        'authentication',
        'Authentication token expired',
        'TOKEN_EXPIRED',
        true
      );
      return false;
    }

    return true;
  }

  public validateRoomState(): boolean {
    if (!this.isInRoom()) {
      this.logError('room', 'Not in a room', 'NOT_IN_ROOM', false);
      return false;
    }

    return true;
  }

  // Circuit breaker pattern for rate limiting
  private requestCounts: Map<string, { count: number; resetTime: number }> =
    new Map();

  public canMakeRequest(
    requestType: string,
    maxRequests: number = 10,
    windowMs: number = 1000
  ): boolean {
    const now = Date.now();
    const record = this.requestCounts.get(requestType);

    if (!record || now > record.resetTime) {
      this.requestCounts.set(requestType, {
        count: 1,
        resetTime: now + windowMs,
      });
      return true;
    }

    if (record.count >= maxRequests) {
      this.logError(
        'network',
        `Rate limit exceeded for ${requestType}`,
        'RATE_LIMIT',
        false
      );
      return false;
    }

    record.count += 1;
    return true;
  }
}

// Singleton instance for global access
let socketManager: SocketManager | null = null;

export function createSocketManager(config: SocketConfig): SocketManager {
  if (socketManager) {
    socketManager.disconnect();
  }
  socketManager = new SocketManager(config);
  return socketManager;
}

export function getSocketManager(): SocketManager | null {
  return socketManager;
}

// Default configuration for development
export const DEFAULT_SOCKET_CONFIG: SocketConfig = {
  url: 'http://localhost:3001', // Backend server URL
  autoConnect: false, // Manual connection control
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  timeout: 20000,
};
