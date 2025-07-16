import { io, Socket } from 'socket.io-client';
import { SOCKET_EVENTS } from '@/types/Network';

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

export interface ReconnectionInfo {
  attempt: number;
  maxAttempts: number;
  nextAttemptIn: number;
  totalDowntime: number;
  isReconnecting: boolean;
  exponentialDelay: number;
  reason?: string;
}

export interface ConnectionStatus {
  state: ConnectionState;
  reconnectionInfo?: ReconnectionInfo;
  lastDisconnectReason?: string;
  lastDisconnectTime?: number;
  totalReconnectAttempts: number;
  metrics: ConnectionMetrics;
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

  // Enhanced reconnection properties
  private isReconnecting = false;

  private reconnectionStartTime = 0;

  private baseReconnectionDelay = 1000; // 1 second

  private maxReconnectionDelay = 30000; // 30 seconds

  private reconnectionTimeout: NodeJS.Timeout | null = null;

  private exponentialBackoffFactor = 1.5;

  private lastDisconnectReason?: string;

  private lastDisconnectTime = 0;

  private totalReconnectAttempts = 0;

  private userNotificationCallbacks: Map<string, (info: any) => void> =
    new Map();

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
    return new Promise(resolve => {
      if (this.socket?.connected) {
        resolve();
        return;
      }

      this.setConnectionState(ConnectionState.CONNECTING);

      console.log('Creating Socket.io connection to:', this.config.url);
      this.socket = io(this.config.url, {
        autoConnect: this.config.autoConnect,
        reconnection: this.config.reconnection,
        reconnectionAttempts: this.config.reconnectionAttempts,
        reconnectionDelay: this.config.reconnectionDelay,
        timeout: this.config.timeout,
        // Force connection options for debugging
        forceNew: true,
        transports: ['polling', 'websocket'],
      });

      this.setupEventHandlers();

      // Connection success
      this.socket.on('connect', () => {
        console.log('Socket.io connected successfully');
        this.setConnectionState(ConnectionState.CONNECTED);
        this.emit('connected', {});
        resolve();
      });

      // Manually connect since autoConnect is false
      this.socket.connect();

      // Connection error
      this.socket.on('connect_error', error => {
        console.error('Socket.io connection error:', error);
        this.setConnectionState(ConnectionState.ERROR);
        this.emit('connection_error', { error });
      });

      // Disconnection
      this.socket.on('disconnect', reason => {
        this.lastDisconnectReason = reason;
        this.lastDisconnectTime = Date.now();
        this.setConnectionState(ConnectionState.DISCONNECTED);
        this.emit('disconnected', {
          reason,
        });

        // Attempt to reconnect for most disconnect reasons
        if (reason !== 'io client disconnect') {
          this.startReconnectionProcess(reason);
        }
      });

      // Reconnection events
      this.socket.on('reconnect', attemptNumber => {
        this.handleSuccessfulReconnection(attemptNumber);
      });

      this.socket.on('reconnect_error', error => {
        this.logError(
          'connection',
          `Reconnection failed: ${error.message}`,
          'RECONNECT_ERROR',
          true
        );
        this.emit('reconnect_error', {
          error: error.message,
          attempt: this.reconnectAttempts,
          nextAttemptIn: this.calculateNextReconnectionDelay(),
        });
      });

      this.socket.on('reconnect_failed', () => {
        this.handleReconnectionFailure();
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

    // Clear reconnection timeout
    if (this.reconnectionTimeout) {
      clearTimeout(this.reconnectionTimeout);
      this.reconnectionTimeout = null;
    }

    // Reset reconnection state
    this.isReconnecting = false;
    this.reconnectAttempts = 0;

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

  public getSocket(): any {
    return this.socket;
  }

  public getCurrentRoomId(): string | null {
    return this.currentRoomId;
  }

  public setCurrentRoomId(roomId: string | null): void {
    this.currentRoomId = roomId;
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
    this.socket.on(SOCKET_EVENTS.WELCOME, data => {
      this.emit(SOCKET_EVENTS.WELCOME, data);
    });

    // Authentication response
    this.socket.on(SOCKET_EVENTS.AUTHENTICATED, (response: AuthResponse) => {
      if (response.success) {
        this.setConnectionState(ConnectionState.AUTHENTICATED);

        // Fail fast: Server must provide userId for multiplayer functionality
        if (!response.userId) {
          throw new Error(
            'Authentication failed: Server did not provide user ID. Cannot proceed with multiplayer game.'
          );
        }

        // Store playerId in global state for game initialization
        import('@/state/GameState').then(({ updateState }) => {
          updateState({ playerId: response.userId });
        });

        this.emit(SOCKET_EVENTS.AUTHENTICATED, response);
      } else {
        this.emit(SOCKET_EVENTS.AUTHENTICATION_FAILED, response);
      }
    });

    // Room events
    this.socket.on(SOCKET_EVENTS.ROOM_CREATED, data => {
      this.emit(SOCKET_EVENTS.ROOM_CREATED, data);
    });

    const onPlayerJoined = (data: PlayerJoinedData) => {
      this.emit(SOCKET_EVENTS.PLAYER_JOINED, data);

      // Clear current room if we left
      if (data.playerId === this.authToken) {
        this.currentRoomId = null;
      }
    };
    this.socket.on(SOCKET_EVENTS.PLAYER_JOINED, onPlayerJoined);

    this.socket.on(SOCKET_EVENTS.GAME_READY, (data: GameReadyData) => {
      this.emit(SOCKET_EVENTS.GAME_READY, data);
    });

    this.socket.on(SOCKET_EVENTS.ROOM_STATE_SYNC, (data: RoomStateData) => {
      this.emit(SOCKET_EVENTS.ROOM_STATE_SYNC, data);
    });

    this.socket.on(SOCKET_EVENTS.ROOM_ERROR, error => {
      this.emit(SOCKET_EVENTS.ROOM_ERROR, error);
    });

    // Lobby state events
    this.socket.on('lobbyState', data => {
      this.emit('lobbyState', data);
    });

    // Player state events
    this.socket.on(SOCKET_EVENTS.PLAYER_READY_CHANGED, data => {
      this.emit(SOCKET_EVENTS.PLAYER_READY_CHANGED, data);
    });

    this.socket.on(SOCKET_EVENTS.CHARACTER_SELECTED, data => {
      this.emit(SOCKET_EVENTS.CHARACTER_SELECTED, data);
    });

    this.socket.on(SOCKET_EVENTS.SELECT_STAGE, data => {
      this.emit(SOCKET_EVENTS.SELECT_STAGE, data);
    });

    this.socket.on(SOCKET_EVENTS.GAME_STARTING, data => {
      this.emit(SOCKET_EVENTS.GAME_STARTING, data);
    });

    this.socket.on(SOCKET_EVENTS.GAME_STARTED, data => {
      this.emit(SOCKET_EVENTS.GAME_STARTED, data);
    });

    // Game events
    this.socket.on(SOCKET_EVENTS.PLAYER_INPUT, (data: PlayerInputData) => {
      this.emit(SOCKET_EVENTS.PLAYER_INPUT, data);
    });

    this.socket.on(SOCKET_EVENTS.PLAYER_MOVE, (data: any) => {
      this.emit(SOCKET_EVENTS.PLAYER_MOVE, data);
    });

    this.socket.on(SOCKET_EVENTS.GAME_EVENT, (data: GameEventData) => {
      this.emit(SOCKET_EVENTS.GAME_EVENT, data);
    });

    this.socket.on(SOCKET_EVENTS.GAME_STATE_SYNC, (data: GameStateSync) => {
      this.emit(SOCKET_EVENTS.GAME_STATE_SYNC, data);
    });

    this.socket.on(SOCKET_EVENTS.MATCH_ENDED, (data: MatchEndData) => {
      this.emit(SOCKET_EVENTS.MATCH_ENDED, data);
    });

    // Specific game event handlers
    this.socket.on(SOCKET_EVENTS.PLAYER_HIT, data => {
      this.emit(SOCKET_EVENTS.PLAYER_HIT, data);
    });

    this.socket.on(SOCKET_EVENTS.PLAYER_KO, data => {
      this.emit(SOCKET_EVENTS.PLAYER_KO, data);
    });

    this.socket.on(SOCKET_EVENTS.PLAYER_RESPAWN, data => {
      this.emit(SOCKET_EVENTS.PLAYER_RESPAWN, data);
    });

    this.socket.on(SOCKET_EVENTS.STAGE_HAZARD, data => {
      this.emit(SOCKET_EVENTS.STAGE_HAZARD, data);
    });

    this.socket.on(SOCKET_EVENTS.POWERUP_SPAWN, data => {
      this.emit(SOCKET_EVENTS.POWERUP_SPAWN, data);
    });

    this.socket.on(SOCKET_EVENTS.POWERUP_COLLECTED, data => {
      this.emit(SOCKET_EVENTS.POWERUP_COLLECTED, data);
    });

    // Match state events
    this.socket.on(SOCKET_EVENTS.MATCH_PAUSED, data => {
      this.emit(SOCKET_EVENTS.MATCH_PAUSED, data);
    });

    this.socket.on(SOCKET_EVENTS.MATCH_RESUMED, data => {
      this.emit(SOCKET_EVENTS.MATCH_RESUMED, data);
    });

    this.socket.on(SOCKET_EVENTS.MATCH_TIMEOUT, data => {
      this.emit(SOCKET_EVENTS.MATCH_TIMEOUT, data);
    });

    // Error handling
    this.socket.on('error', error => {
      this.emit('error', { error });
    });

    const onPlayerLeft = (data: PlayerLeftData) => {
      this.emit(SOCKET_EVENTS.PLAYER_LEFT, data);
    };
    this.socket.on(SOCKET_EVENTS.PLAYER_LEFT, onPlayerLeft);

    this.socket.on(SOCKET_EVENTS.QUEUE_JOINED, () => {
      this.emit(SOCKET_EVENTS.QUEUE_JOINED, {});
    });

    this.socket.on(SOCKET_EVENTS.MATCH_FOUND, roomId => {
      this.emit(SOCKET_EVENTS.MATCH_FOUND, roomId);
    });
  }

  private startReconnectionProcess(reason: string): void {
    if (this.isReconnecting) {
      return; // Already reconnecting
    }

    this.isReconnecting = true;
    this.reconnectionStartTime = Date.now();
    this.reconnectAttempts = 0;

    console.log(`Starting reconnection process due to: ${reason}`);
    this.attemptReconnectionWithBackoff();
  }

  private attemptReconnectionWithBackoff(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.handleReconnectionFailure();
      return;
    }

    this.reconnectAttempts += 1;
    this.totalReconnectAttempts += 1;

    const delay = this.calculateNextReconnectionDelay();

    console.log(
      `Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`
    );

    // Notify user about reconnection attempt
    this.notifyReconnectionAttempt(delay);

    this.reconnectionTimeout = setTimeout(() => {
      this.performReconnectionAttempt();
    }, delay);
  }

  private calculateNextReconnectionDelay(): number {
    const exponentialDelay = Math.min(
      this.baseReconnectionDelay *
        this.exponentialBackoffFactor ** (this.reconnectAttempts - 1),
      this.maxReconnectionDelay
    );

    // Add some jitter (±25%) to prevent thundering herd
    const jitter = exponentialDelay * 0.25 * (Math.random() - 0.5);
    return Math.round(exponentialDelay + jitter);
  }

  private async performReconnectionAttempt(): Promise<void> {
    try {
      console.log(`Performing reconnection attempt ${this.reconnectAttempts}`);

      // Close existing socket if any
      if (this.socket) {
        this.socket.disconnect();
        this.socket = null;
      }

      // Attempt to connect
      await this.connect();

      // If we have a token, try to authenticate
      if (this.authToken) {
        await this.authenticate(this.authToken);
      }

      // If we get here, reconnection was successful
      this.handleSuccessfulReconnection(this.reconnectAttempts);
    } catch (error) {
      console.error(
        `Reconnection attempt ${this.reconnectAttempts} failed:`,
        error
      );

      // Emit reconnection error with details
      this.emit('reconnect_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        attempt: this.reconnectAttempts,
        nextAttemptIn: this.calculateNextReconnectionDelay(),
      });

      // Try again with backoff
      this.attemptReconnectionWithBackoff();
    }
  }

  private handleSuccessfulReconnection(attemptNumber: number): void {
    const totalDowntime = Date.now() - this.reconnectionStartTime;

    console.log(
      `Successfully reconnected after ${attemptNumber} attempts and ${totalDowntime}ms downtime`
    );

    // Reset reconnection state
    this.isReconnecting = false;
    this.reconnectAttempts = 0;

    if (this.reconnectionTimeout) {
      clearTimeout(this.reconnectionTimeout);
      this.reconnectionTimeout = null;
    }

    this.setConnectionState(ConnectionState.CONNECTED);

    // Restart monitoring
    this.startConnectionMonitoring();

    // Re-authenticate if we have a token
    if (this.authToken) {
      this.authenticate(this.authToken)
        .then(() => {
          // Check for automatic room reconnection
          this.emit('automaticReconnection', { attempt: attemptNumber });
        })
        .catch(error => {
          console.error('Re-authentication failed after reconnection:', error);
        });
    }

    // Notify successful reconnection
    this.emit('reconnected', {
      attemptNumber,
      totalDowntime,
      totalAttempts: this.totalReconnectAttempts,
    });

    this.notifyReconnectionSuccess(totalDowntime);
  }

  private handleReconnectionFailure(): void {
    console.error(
      `Reconnection failed after ${this.maxReconnectAttempts} attempts`
    );

    this.isReconnecting = false;
    this.setConnectionState(ConnectionState.ERROR);

    if (this.reconnectionTimeout) {
      clearTimeout(this.reconnectionTimeout);
      this.reconnectionTimeout = null;
    }

    this.logError(
      'connection',
      'Max reconnection attempts reached',
      'RECONNECT_FAILED',
      false
    );

    this.emit('reconnect_failed', {
      maxAttempts: this.maxReconnectAttempts,
      totalDowntime: Date.now() - this.reconnectionStartTime,
      reason: this.lastDisconnectReason,
    });

    this.notifyReconnectionFailure();
  }

  private notifyReconnectionAttempt(nextAttemptIn: number): void {
    const reconnectionInfo: ReconnectionInfo = {
      attempt: this.reconnectAttempts,
      maxAttempts: this.maxReconnectAttempts,
      nextAttemptIn,
      totalDowntime: Date.now() - this.reconnectionStartTime,
      isReconnecting: true,
      exponentialDelay: nextAttemptIn,
      reason: this.lastDisconnectReason,
    };

    this.emit('reconnecting', reconnectionInfo);

    // Call user notification callbacks
    this.userNotificationCallbacks.forEach(callback => {
      try {
        callback({
          type: 'reconnecting',
          info: reconnectionInfo,
        });
      } catch (error) {
        console.error('Error in user notification callback:', error);
      }
    });
  }

  private notifyReconnectionSuccess(totalDowntime: number): void {
    this.userNotificationCallbacks.forEach(callback => {
      try {
        callback({
          type: 'reconnected',
          info: {
            totalDowntime,
            attempts: this.reconnectAttempts,
          },
        });
      } catch (error) {
        console.error('Error in user notification callback:', error);
      }
    });
  }

  private notifyReconnectionFailure(): void {
    this.userNotificationCallbacks.forEach(callback => {
      try {
        callback({
          type: 'reconnect_failed',
          info: {
            maxAttempts: this.maxReconnectAttempts,
            totalDowntime: Date.now() - this.reconnectionStartTime,
            reason: this.lastDisconnectReason,
          },
        });
      } catch (error) {
        console.error('Error in user notification callback:', error);
      }
    });
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
        this.socket!.off(SOCKET_EVENTS.AUTHENTICATED, onAuthenticated);
        // eslint-disable-next-line no-use-before-define
        this.socket!.off(SOCKET_EVENTS.AUTHENTICATION_FAILED, onAuthFailed);

        // Fail fast: Server must provide userId for multiplayer functionality
        if (response.success && !response.userId) {
          throw new Error(
            'Authentication failed: Server did not provide user ID. Cannot proceed with multiplayer game.'
          );
        }

        // Store playerId in global state for game initialization
        if (response.success) {
          import('@/state/GameState').then(({ updateState }) => {
            updateState({ playerId: response.userId });
          });
        }

        resolve(response);
      };

      const onAuthFailed = (response: AuthResponse) => {
        this.socket!.off(SOCKET_EVENTS.AUTHENTICATED, onAuthenticated);
        this.socket!.off(SOCKET_EVENTS.AUTHENTICATION_FAILED, onAuthFailed);
        this.authToken = null;
        reject(new Error(response.error || 'Authentication failed'));
      };

      this.socket.on(SOCKET_EVENTS.AUTHENTICATED, onAuthenticated);
      this.socket.on(SOCKET_EVENTS.AUTHENTICATION_FAILED, onAuthFailed);

      // Send authentication request
      this.socket.emit(SOCKET_EVENTS.AUTHENTICATE, token);
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
      this.socket.emit(SOCKET_EVENTS.CREATE_ROOM);
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
        this.socket!.off(SOCKET_EVENTS.PLAYER_JOINED, onPlayerJoined);
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
        this.socket!.off(SOCKET_EVENTS.PLAYER_JOINED, onPlayerJoined);
        this.socket!.off('roomError', onRoomError);
        reject(new Error(error.message));
      };

      this.socket.on(SOCKET_EVENTS.PLAYER_JOINED, onPlayerJoined);
      this.socket.on('roomError', onRoomError);

      // Send join request
      this.socket.emit(SOCKET_EVENTS.JOIN_ROOM, roomId);
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
        this.socket!.off(SOCKET_EVENTS.PLAYER_LEFT, onPlayerLeft);
        this.currentRoomId = null;
        resolve();
      };

      this.socket.on(SOCKET_EVENTS.PLAYER_LEFT, onPlayerLeft);

      // Send leave request
      this.socket.emit(SOCKET_EVENTS.LEAVE_ROOM);

      // Fallback timeout in case server doesn't respond
      setTimeout(() => {
        this.socket!.off(SOCKET_EVENTS.PLAYER_LEFT, onPlayerLeft);
        this.currentRoomId = null;
        resolve();
      }, 5000);
    });
  }

  // Player state management
  public setPlayerReady(ready: boolean = true): void {
    if (!this.socket || !this.isAuthenticated()) {
      // eslint-disable-next-line no-console
      console.warn('Cannot set ready state: not authenticated');
      return;
    }

    console.log(
      `SocketManager: Emitting playerReadyChanged with ready=${ready}`
    );
    // For now, allow ready state without being in a room
    // This will be used for matchmaking readiness
    this.socket.emit(SOCKET_EVENTS.PLAYER_READY_CHANGED, { ready });
  }

  public selectCharacter(character: string): void {
    if (!this.socket || !this.isAuthenticated()) {
      // eslint-disable-next-line no-console
      console.warn('Cannot select character: not authenticated');
      return;
    }

    // For now, allow character selection without being in a room
    // This will be used for matchmaking preferences
    this.socket.emit(SOCKET_EVENTS.SELECT_CHARACTER, { character });
  }

  public selectStage(stage: string): void {
    if (!this.socket || !this.isAuthenticated()) {
      // eslint-disable-next-line no-console
      console.warn('Cannot select stage: not authenticated');
      return;
    }

    // For now, allow stage selection without being in a room
    // This will be used for matchmaking preferences
    this.socket.emit(SOCKET_EVENTS.SELECT_STAGE, { stage });
  }

  public startGame(): void {
    if (!this.socket || !this.isAuthenticated() || !this.currentRoomId) {
      // eslint-disable-next-line no-console
      console.warn('Cannot start game: not authenticated or not in room');
      return;
    }

    this.socket.emit(SOCKET_EVENTS.START_GAME);
  }

  // Room information methods
  public requestRoomState(): void {
    if (!this.socket || !this.currentRoomId) {
      return;
    }

    this.socket.emit(SOCKET_EVENTS.REQUEST_ROOM_STATE);
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

    if (inputType === 'move') {
      const { position } = data || {};
      if (position) {
        console.log(
          `[INPUT_EMIT] pos=(${position.x.toFixed(1)},${position.y.toFixed(1)})`
        );
      }
    }

    this.socket.emit(SOCKET_EVENTS.PLAYER_INPUT, inputData);
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

    this.socket.emit(SOCKET_EVENTS.GAME_EVENT, gameEvent);
  }

  public requestGameStateSync(): void {
    if (!this.socket || !this.currentRoomId) {
      return;
    }

    this.socket.emit(SOCKET_EVENTS.REQUEST_GAME_STATE_SYNC);
  }

  // Convenience methods for common game events
  public sendPlayerMove(
    position: { x: number; y: number },
    velocity: { x: number; y: number }
  ): void {
    // Debug: local player movement emitted
    console.log(
      `[INPUT_EMIT] pos=(${position.x.toFixed(1)},${position.y.toFixed(1)})`
    );
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
          this.startReconnectionProcess('error_recovery');
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

  // Enhanced reconnection management methods
  public forceReconnect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isReconnecting) {
        reject(new Error('Already reconnecting'));
        return;
      }

      console.log('Force reconnection requested');

      // Disconnect first
      if (this.socket) {
        this.socket.disconnect();
      }

      // Start reconnection process
      this.startReconnectionProcess('user_requested');

      // Set up one-time listeners
      let onReconnected: () => void;
      const onReconnectFailed = () => {
        this.off('reconnected', onReconnected);
        this.off('reconnect_failed', onReconnectFailed);
        reject(new Error('Reconnection failed'));
      };

      onReconnected = () => {
        this.off('reconnected', onReconnected);
        this.off('reconnect_failed', onReconnectFailed);
        resolve();
      };

      this.on('reconnected', onReconnected);
      this.on('reconnect_failed', onReconnectFailed);
    });
  }

  public cancelReconnection(): void {
    if (!this.isReconnecting) {
      return;
    }

    console.log('Cancelling reconnection process');

    this.isReconnecting = false;

    if (this.reconnectionTimeout) {
      clearTimeout(this.reconnectionTimeout);
      this.reconnectionTimeout = null;
    }

    this.emit('reconnection_cancelled', {
      attempt: this.reconnectAttempts,
      totalDowntime: Date.now() - this.reconnectionStartTime,
    });
  }

  public getReconnectionInfo(): ReconnectionInfo | null {
    if (!this.isReconnecting) {
      return null;
    }

    return {
      attempt: this.reconnectAttempts,
      maxAttempts: this.maxReconnectAttempts,
      nextAttemptIn: this.calculateNextReconnectionDelay(),
      totalDowntime: Date.now() - this.reconnectionStartTime,
      isReconnecting: this.isReconnecting,
      exponentialDelay: this.calculateNextReconnectionDelay(),
      reason: this.lastDisconnectReason,
    };
  }

  public getConnectionStatus(): ConnectionStatus {
    return {
      state: this.connectionState,
      reconnectionInfo: this.getReconnectionInfo() || undefined,
      lastDisconnectReason: this.lastDisconnectReason,
      lastDisconnectTime: this.lastDisconnectTime || undefined,
      totalReconnectAttempts: this.totalReconnectAttempts,
      metrics: this.getConnectionMetrics(),
    };
  }

  // User notification management
  public addNotificationCallback(
    id: string,
    callback: (info: any) => void
  ): void {
    this.userNotificationCallbacks.set(id, callback);
  }

  public removeNotificationCallback(id: string): void {
    this.userNotificationCallbacks.delete(id);
  }

  public setReconnectionConfig(config: {
    maxAttempts?: number;
    baseDelay?: number;
    maxDelay?: number;
    backoffFactor?: number;
  }): void {
    if (config.maxAttempts !== undefined) {
      this.maxReconnectAttempts = config.maxAttempts;
    }
    if (config.baseDelay !== undefined) {
      this.baseReconnectionDelay = config.baseDelay;
    }
    if (config.maxDelay !== undefined) {
      this.maxReconnectionDelay = config.maxDelay;
    }
    if (config.backoffFactor !== undefined) {
      this.exponentialBackoffFactor = config.backoffFactor;
    }

    console.log('Reconnection config updated:', {
      maxAttempts: this.maxReconnectAttempts,
      baseDelay: this.baseReconnectionDelay,
      maxDelay: this.maxReconnectionDelay,
      backoffFactor: this.exponentialBackoffFactor,
    });
  }

  public isCurrentlyReconnecting(): boolean {
    return this.isReconnecting;
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
