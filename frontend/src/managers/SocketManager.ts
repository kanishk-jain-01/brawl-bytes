/*
 * Socket Manager (Zustand Integration)
 * -----------------------------------
 * Simplified Socket.io manager that uses the Zustand connection store
 * for state management. Provides high-level socket operations while
 * delegating all state management to the centralized store.
 */

import { Socket } from 'socket.io-client';
import {
  connectionStore,
  ConnectionState,
  type AuthResponse,
} from '@/state/connectionStore';
import { lobbyStore } from '@/state/lobbyStore';
import { SOCKET_EVENTS } from '@/types/Network';
import type { RoomStateData } from '@/types/Network';

/**
 * Socket configuration interface
 */
export interface SocketConfig {
  url: string;
  autoConnect?: boolean;
  reconnection?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
  timeout?: number;
}

/**
 * Default socket configuration
 */
export const DEFAULT_SOCKET_CONFIG: SocketConfig = {
  url: (import.meta.env?.VITE_SOCKET_URL as string) || 'http://localhost:3001',
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  timeout: 20000,
};

/**
 * Simplified SocketManager that uses Zustand store for state
 */
export class SocketManager {
  private config: SocketConfig;

  private eventListeners: Map<string, ((...args: any[]) => void)[]> = new Map();

  constructor(config: SocketConfig) {
    this.config = { ...DEFAULT_SOCKET_CONFIG, ...config };
  }

  /**
   * Connect to the socket server
   */
  public async connect(): Promise<void> {
    const store = connectionStore.getState();
    await store.connect(this.config.url);
    this.setupEventHandlers();
  }

  /**
   * Authenticate with the server
   */
  public async authenticate(token: string): Promise<AuthResponse> {
    const store = connectionStore.getState();
    const response = await store.authenticate(token);

    // User ID is now managed by connectionStore

    return response;
  }

  /**
   * Disconnect from the server
   */
  public disconnect(): void {
    const store = connectionStore.getState();
    store.disconnect();
    this.cleanup();
  }

  /**
   * Check if socket is connected
   */
  public isConnected(): boolean {
    const store = connectionStore.getState();
    return store.isConnected();
  }

  /**
   * Check if socket is authenticated
   */
  public isAuthenticated(): boolean {
    const store = connectionStore.getState();
    return store.isAuthenticated;
  }

  /**
   * Get current connection state
   */
  public getConnectionState(): ConnectionState {
    const store = connectionStore.getState();
    return store.connectionState;
  }



  /**
   * Emit an event to the server
   */
  public emit(event: string, data?: any): void {
    const store = connectionStore.getState();
    const { socket } = store;

    if (!socket || !socket.connected) {
      console.warn(`Cannot emit ${event}: Socket not connected`);
      return;
    }

    socket.emit(event, data);
  }

  /**
   * Listen for an event from the server
   */
  public on(event: string, callback: (...args: any[]) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);

    // Also set up the socket listener if socket exists
    const store = connectionStore.getState();
    const { socket } = store;
    if (socket) {
      socket.on(event, callback);
    }
  }

  /**
   * Remove an event listener
   */
  public off(event: string, callback?: (...args: any[]) => void): void {
    if (callback) {
      const listeners = this.eventListeners.get(event);
      if (listeners) {
        const index = listeners.indexOf(callback);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    } else {
      this.eventListeners.delete(event);
    }

    // Also remove from socket if it exists
    const store = connectionStore.getState();
    const { socket } = store;
    if (socket) {
      if (callback) {
        socket.off(event, callback);
      } else {
        socket.off(event);
      }
    }
  }

  /**
   * High-level game actions
   */

  public joinQueue(): void {
    this.emit(SOCKET_EVENTS.JOIN_QUEUE);
  }

  public leaveQueue(): void {
    this.emit(SOCKET_EVENTS.LEAVE_QUEUE);
  }

  public createRoom(): void {
    this.emit(SOCKET_EVENTS.CREATE_ROOM);
  }

  public joinRoom(roomId: string): void {
    this.emit(SOCKET_EVENTS.JOIN_ROOM, roomId);
  }

  public leaveRoom(): void {
    this.emit(SOCKET_EVENTS.LEAVE_ROOM);
    // Room state is now managed by connectionStore and lobbyStore
  }

  public selectCharacter(character: string): void {
    this.emit(SOCKET_EVENTS.SELECT_CHARACTER, character);
  }

  public selectStage(stage: string): void {
    this.emit(SOCKET_EVENTS.SELECT_STAGE, stage);
  }

  public setPlayerReady(ready: boolean): void {
    this.emit(SOCKET_EVENTS.PLAYER_READY, ready);
  }

  public startGame(): void {
    this.emit(SOCKET_EVENTS.START_GAME);
  }

  public requestRoomState(): void {
    this.emit(SOCKET_EVENTS.REQUEST_ROOM_STATE);
  }

  public sendPlayerInput(
    inputType: string,
    data?: any,
    sequence?: number
  ): void {
    this.emit(SOCKET_EVENTS.PLAYER_INPUT, { inputType, data, sequence });
  }

  public sendPlayerAttack(attackType: string, direction: any): void {
    this.emit(SOCKET_EVENTS.PLAYER_ATTACK, { attackType, direction });
  }

  public sendPlayerJump(jumpType: string): void {
    this.emit(SOCKET_EVENTS.PLAYER_INPUT, { inputType: 'jump', jumpType });
  }

  public sendPlayerSpecial(specialType: string, data?: any): void {
    this.emit(SOCKET_EVENTS.PLAYER_INPUT, {
      inputType: 'special',
      specialType,
      data,
    });
  }



  public getSocket(): Socket | null {
    const store = connectionStore.getState();
    return store.socket;
  }

  /**
   * Set up socket event handlers
   */
  private setupEventHandlers(): void {
    const store = connectionStore.getState();
    const { socket } = store;

    if (!socket) return;

    // Set up all previously registered event listeners
    this.eventListeners.forEach((callbacks, event) => {
      callbacks.forEach(callback => {
        socket.on(event, callback);
      });
    });

    // Set up store integration handlers
    socket.on(SOCKET_EVENTS.AUTHENTICATED, (response: AuthResponse) => {
      if (response.success && response.userId) {
        // Update lobby store local player connection status
        lobbyStore.getState().setLocalPlayerData({ isConnected: true });
      }
    });

    socket.on(SOCKET_EVENTS.ROOM_JOINED, (data: any) => {
      if (data.roomId) {
        store.setRoomId(data.roomId);
        // Update lobby store room state
        lobbyStore.getState().setRoomData({ roomId: data.roomId });
      }
    });

    socket.on(SOCKET_EVENTS.PLAYER_LEFT, (data: any) => {
      // Clear room if we left
      if (data.playerId === store.authToken) {
        store.setRoomId(null);
        lobbyStore.getState().clearRoom();
      } else {
        // Remove other player from lobby
        lobbyStore.getState().removePlayer(data.playerId);
      }
    });

    // Lobby-specific event handlers
    socket.on(SOCKET_EVENTS.ROOM_STATE_SYNC, (data: RoomStateData) => {
      console.log('SocketManager: Room state sync received:', data);
      lobbyStore.getState().updateFromServerState(data);
    });

    socket.on(SOCKET_EVENTS.PLAYER_JOINED, (data: any) => {
      console.log('SocketManager: Player joined:', data);
      if (data.playerId && data.username) {
        lobbyStore.getState().addPlayer({
          id: data.playerId,
          username: data.username,
          isReady: false,
          isHost: false,
          connected: true,
        });
      }
    });

    socket.on(SOCKET_EVENTS.CHARACTER_SELECTED, (data: any) => {
      console.log('SocketManager: Character selected:', data);
      if (data.playerId && data.character) {
        lobbyStore.getState().updatePlayer(data.playerId, {
          character: data.character,
        });
      }
    });

    socket.on(SOCKET_EVENTS.STAGE_SELECTED, (data: any) => {
      console.log('SocketManager: Stage selected:', data);
      if (data.stage) {
        lobbyStore.getState().selectStage(data.stage);
      }
    });

    socket.on(SOCKET_EVENTS.PLAYER_READY_CHANGED, (data: any) => {
      console.log('SocketManager: Player ready changed:', data);
      if (data.playerId !== undefined && data.ready !== undefined) {
        lobbyStore.getState().updatePlayer(data.playerId, {
          isReady: data.ready,
        });
      }
    });

    socket.on(SOCKET_EVENTS.QUEUE_JOINED, (data: any) => {
      console.log('SocketManager: Queue joined:', data);
      lobbyStore.getState().setMatchmakingData({
        inQueue: true,
        queuePosition: data.position || 0,
        estimatedWaitTime: data.estimatedWaitTime || 30,
      });
      lobbyStore.getState().setStatusMessage('Searching for opponent...');
    });

    socket.on(SOCKET_EVENTS.MATCH_FOUND, (data: any) => {
      console.log('SocketManager: Match found:', data);
      if (data.roomId) {
        store.setRoomId(data.roomId);
        lobbyStore.getState().setMatchmakingData({ inQueue: false });
        lobbyStore.getState().setRoomData({ roomId: data.roomId });
        lobbyStore.getState().setStatusMessage('Match found! Joining room...');
      }
    });

    socket.on(SOCKET_EVENTS.GAME_STARTING, (data: any) => {
      console.log('SocketManager: Game starting:', data);
      const countdown = data.countdown || 5;
      lobbyStore.getState().startMatchCountdown(countdown);
    });

    socket.on(SOCKET_EVENTS.GAME_STARTED, (data: any) => {
      console.log('SocketManager: Game started:', data);
      lobbyStore.getState().stopMatchCountdown();
      lobbyStore.getState().setStatusMessage('Game started!');
    });

    // Handle disconnection
    socket.on('disconnect', (reason: string) => {
      console.log('SocketManager: Disconnected:', reason);
      lobbyStore.getState().setLocalPlayerData({ isConnected: false });
      lobbyStore.getState().setError(`Disconnected: ${reason}`);
    });
  }

  /**
   * Clean up resources
   */
  private cleanup(): void {
    this.eventListeners.clear();
  }

  /**
   * Static utility methods for token management
   */

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
      return Date.now() >= payload.exp * 1000;
    } catch {
      return true; // Assume expired if we can't parse
    }
  }

  /**
   * Auto-authentication with stored token
   */
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

  /**
   * Enhanced connection method with auto-authentication
   */
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
}

// Singleton instance for global access
let socketManager: SocketManager | null = null;

/**
 * Create a new socket manager instance
 */
export function createSocketManager(config: SocketConfig): SocketManager {
  if (socketManager) {
    socketManager.disconnect();
  }
  socketManager = new SocketManager(config);
  return socketManager;
}

/**
 * Get the current socket manager instance
 */
export function getSocketManager(): SocketManager | null {
  return socketManager;
}

/**
 * Get the socket instance from the store
 */
export function getSocket(): Socket | null {
  const store = connectionStore.getState();
  return store.socket;
}
