/*
 * Connection Store
 * ---------------
 * Zustand store for managing Socket.io connection state, authentication,
 * and room/session data. Centralizes state that was previously scattered
 * across SocketManager and provides reactive updates to components.
 */

import { createStore } from 'zustand/vanilla';
import { devtools } from 'zustand/middleware';
import { io, Socket } from 'socket.io-client';
import { SOCKET_EVENTS } from '@/types/Network';

/**
 * Connection states for Socket.io connection lifecycle
 */
export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  AUTHENTICATED = 'authenticated',
  ERROR = 'error',
}

/**
 * Authentication response from server
 */
export interface AuthResponse {
  success: boolean;
  userId?: string;
  error?: string;
}

/**
 * Connection quality metrics
 */
export interface ConnectionMetrics {
  latency: number;
  packetLoss: number;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
  lastPingTime: number;
  averageLatency: number;
}

/**
 * Error data for connection issues
 */
export interface ErrorData {
  type: 'connection' | 'authentication' | 'room' | 'game';
  message: string;
  code?: string;
  timestamp: number;
  critical: boolean;
}

/**
 * Connection store state interface
 */
interface ConnectionStore {
  // Connection state
  connectionState: ConnectionState;
  socket: Socket | null;
  socketUrl: string;
  isReconnecting: boolean;
  reconnectAttempts: number;
  maxReconnectAttempts: number;

  // Authentication state
  authToken: string | null;
  userId: string | null;
  isAuthenticated: boolean;

  // Room/session state
  currentRoomId: string | null;

  // Connection metrics
  metrics: ConnectionMetrics;

  // Error state
  lastError: ErrorData | null;
  errorHistory: ErrorData[];

  // Actions
  setConnectionState: (state: ConnectionState) => void;
  setSocket: (socket: Socket | null) => void;
  setAuthData: (token: string | null, userId: string | null) => void;
  setRoomId: (roomId: string | null) => void;
  setMetrics: (metrics: Partial<ConnectionMetrics>) => void;
  addError: (error: ErrorData) => void;
  clearErrors: () => void;
  incrementReconnectAttempts: () => void;
  resetReconnectAttempts: () => void;

  // Complex actions
  connect: (url: string) => Promise<void>;
  authenticate: (token: string) => Promise<AuthResponse>;
  disconnect: () => void;

  // Computed getters
  isConnected: () => boolean;
  canReconnect: () => boolean;
  getConnectionStatus: () => {
    state: ConnectionState;
    connected: boolean;
    authenticated: boolean;
    roomId: string | null;
    metrics: ConnectionMetrics;
  };
}

/**
 * Default connection metrics
 */
const defaultMetrics: ConnectionMetrics = {
  latency: 0,
  packetLoss: 0,
  connectionQuality: 'excellent',
  lastPingTime: 0,
  averageLatency: 0,
};

/**
 * Create the connection store with Zustand vanilla
 */
export const connectionStore = createStore<ConnectionStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      connectionState: ConnectionState.DISCONNECTED,
      socket: null,
      socketUrl: '',
      isReconnecting: false,
      reconnectAttempts: 0,
      maxReconnectAttempts: 5,

      authToken: null,
      userId: null,
      isAuthenticated: false,

      currentRoomId: null,

      metrics: { ...defaultMetrics },

      lastError: null,
      errorHistory: [],

      // Basic setters
      setConnectionState: (state: ConnectionState) => {
        set({ connectionState: state }, false, 'setConnectionState');

        // Update computed auth state
        if (state === ConnectionState.AUTHENTICATED) {
          set({ isAuthenticated: true }, false, 'setAuthenticated');
        } else if (
          state === ConnectionState.DISCONNECTED ||
          state === ConnectionState.ERROR
        ) {
          set({ isAuthenticated: false }, false, 'setUnauthenticated');
        }
      },

      setSocket: (socket: Socket | null) => {
        set({ socket }, false, 'setSocket');
      },

      setAuthData: (token: string | null, userId: string | null) => {
        set(
          {
            authToken: token,
            userId,
            isAuthenticated: !!token && !!userId,
          },
          false,
          'setAuthData'
        );
      },

      setRoomId: (roomId: string | null) => {
        set({ currentRoomId: roomId }, false, 'setRoomId');
      },

      setMetrics: (metricsUpdate: Partial<ConnectionMetrics>) => {
        set(
          state => ({
            metrics: { ...state.metrics, ...metricsUpdate },
          }),
          false,
          'setMetrics'
        );
      },

      addError: (error: ErrorData) => {
        set(
          state => ({
            lastError: error,
            errorHistory: [...state.errorHistory.slice(-9), error], // Keep last 10 errors
          }),
          false,
          'addError'
        );
      },

      clearErrors: () => {
        set({ lastError: null, errorHistory: [] }, false, 'clearErrors');
      },

      incrementReconnectAttempts: () => {
        set(
          state => ({
            reconnectAttempts: state.reconnectAttempts + 1,
          }),
          false,
          'incrementReconnectAttempts'
        );
      },

      resetReconnectAttempts: () => {
        set(
          { reconnectAttempts: 0, isReconnecting: false },
          false,
          'resetReconnectAttempts'
        );
      },

      // Complex actions
      connect: async (url: string) => {
        const {
          socket,
          setConnectionState,
          setSocket,
          addError,
          resetReconnectAttempts,
        } = get();

        // Don't connect if already connected
        if (socket?.connected) {
          return;
        }

        try {
          set({ socketUrl: url }, false, 'setSocketUrl');
          setConnectionState(ConnectionState.CONNECTING);

          const newSocket = io(url, {
            autoConnect: false,
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            timeout: 20000,
            transports: ['polling', 'websocket'],
          });

          setSocket(newSocket);

          // Set up connection event handlers
          newSocket.on('connect', () => {
            console.log('Socket connected successfully');
            setConnectionState(ConnectionState.CONNECTED);
            resetReconnectAttempts();
          });

          newSocket.on('connect_error', error => {
            console.error('Socket connection error:', error);
            setConnectionState(ConnectionState.ERROR);
            addError({
              type: 'connection',
              message: `Connection failed: ${error.message}`,
              timestamp: Date.now(),
              critical: true,
            });
          });

          newSocket.on('disconnect', reason => {
            console.log('Socket disconnected:', reason);
            setConnectionState(ConnectionState.DISCONNECTED);
            set({ isAuthenticated: false }, false, 'disconnected');
          });

          // Connect the socket
          newSocket.connect();

          // Wait for connection with timeout
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error('Connection timeout'));
            }, 20000);

            newSocket.once('connect', () => {
              clearTimeout(timeout);
              resolve();
            });

            newSocket.once('connect_error', error => {
              clearTimeout(timeout);
              reject(error);
            });
          });
        } catch (error) {
          setConnectionState(ConnectionState.ERROR);
          addError({
            type: 'connection',
            message: `Failed to connect: ${error}`,
            timestamp: Date.now(),
            critical: true,
          });
          throw error;
        }
      },

      authenticate: async (token: string) => {
        const { socket, setConnectionState, setAuthData, addError } = get();

        if (!socket || !socket.connected) {
          throw new Error('Socket not connected');
        }

        return new Promise<AuthResponse>((resolve, reject) => {
          const timeout = setTimeout(() => {
            socket.off(SOCKET_EVENTS.AUTHENTICATED);
            socket.off(SOCKET_EVENTS.AUTHENTICATION_FAILED);
            reject(new Error('Authentication timeout'));
          }, 10000);

          const onAuthenticated = (response: AuthResponse) => {
            clearTimeout(timeout);
            socket.off(SOCKET_EVENTS.AUTHENTICATED);
            socket.off(SOCKET_EVENTS.AUTHENTICATION_FAILED);

            if (response.success && response.userId) {
              setAuthData(token, response.userId);
              setConnectionState(ConnectionState.AUTHENTICATED);
              console.log('Socket authenticated successfully');
              resolve(response);
            } else {
              addError({
                type: 'authentication',
                message: response.error || 'Authentication failed',
                timestamp: Date.now(),
                critical: true,
              });
              reject(new Error(response.error || 'Authentication failed'));
            }
          };

          const onAuthFailed = (response: AuthResponse) => {
            clearTimeout(timeout);
            socket.off(SOCKET_EVENTS.AUTHENTICATED);
            socket.off(SOCKET_EVENTS.AUTHENTICATION_FAILED);

            addError({
              type: 'authentication',
              message: response.error || 'Authentication failed',
              timestamp: Date.now(),
              critical: true,
            });
            reject(new Error(response.error || 'Authentication failed'));
          };

          socket.once(SOCKET_EVENTS.AUTHENTICATED, onAuthenticated);
          socket.once(SOCKET_EVENTS.AUTHENTICATION_FAILED, onAuthFailed);

          // Send authentication request
          socket.emit(SOCKET_EVENTS.AUTHENTICATE, token);
        });
      },

      disconnect: () => {
        const {
          socket,
          setConnectionState,
          setAuthData,
          setRoomId,
          setSocket,
        } = get();

        if (socket) {
          socket.disconnect();
          setSocket(null);
        }

        setConnectionState(ConnectionState.DISCONNECTED);
        setAuthData(null, null);
        setRoomId(null);
        set({ isReconnecting: false }, false, 'disconnect');
      },

      // Computed getters
      isConnected: () => {
        const { connectionState } = get();
        return (
          connectionState === ConnectionState.CONNECTED ||
          connectionState === ConnectionState.AUTHENTICATED
        );
      },

      canReconnect: () => {
        const { reconnectAttempts, maxReconnectAttempts } = get();
        return reconnectAttempts < maxReconnectAttempts;
      },

      getConnectionStatus: () => {
        const {
          connectionState,
          currentRoomId,
          metrics,
          isConnected,
          isAuthenticated,
        } = get();
        return {
          state: connectionState,
          connected: isConnected(),
          authenticated: isAuthenticated,
          roomId: currentRoomId,
          metrics,
        };
      },
    }),
    {
      name: 'connection-store',
    }
  )
);

/**
 * Utility to get the store state
 */
export const getConnectionState = () => connectionStore.getState();

/**
 * Utility to subscribe to store changes
 */
export const subscribeToConnection = (
  listener: (state: ConnectionStore) => void
) => {
  return connectionStore.subscribe(listener);
};

/**
 * Helper functions for auth-specific state
 */
export const useAuth = () => {
  const state = connectionStore.getState();
  return {
    isAuthenticated: state.isAuthenticated,
    userId: state.userId,
    authToken: state.authToken,
    authenticate: state.authenticate,
  };
};

/**
 * Helper functions for connection-specific state
 */
export const useConnection = () => {
  const state = connectionStore.getState();
  return {
    connectionState: state.connectionState,
    isConnected: state.isConnected(),
    isReconnecting: state.isReconnecting,
    connect: state.connect,
    disconnect: state.disconnect,
    getConnectionStatus: state.getConnectionStatus,
  };
};


