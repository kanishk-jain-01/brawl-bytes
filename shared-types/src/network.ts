/*
 * Shared Network Types
 * --------------------
 * Unified Socket.io network communication types and event definitions.
 * Provides consistent client-server contracts and message interfaces.
 */

import type { GameplayPlayerStats, PlayerInputState, MatchPhase } from './game';

/**
 * Socket.io Event Names
 * ---------------------
 * Centralized catalogue of every Socket.io event used by frontend and backend.
 * Use these constants instead of hard-coding string literals.
 */
export const SOCKET_EVENTS = {
  // Client → Server events
  AUTHENTICATE: 'authenticate',
  JOIN_QUEUE: 'joinQueue',
  LEAVE_QUEUE: 'leaveQueue',
  LEAVE_ROOM: 'leaveRoom',
  PLAYER_QUIT: 'playerQuit',
  SELECT_CHARACTER: 'selectCharacter',
  SELECT_STAGE: 'selectStage',
  PLAYER_READY: 'playerReady',
  PLAYER_INPUT: 'playerInput',
  PLAYER_POSITION: 'playerPosition',
  CHAT_MESSAGE: 'chatMessage',
  REQUEST_GAME_STATE_SYNC: 'requestGameStateSync',
  REQUEST_ROOM_STATE: 'requestRoomState',

  // Server → Client events
  AUTHENTICATED: 'authenticated',
  AUTHENTICATION_FAILED: 'authenticationFailed',
  QUEUE_JOINED: 'queueJoined',
  MATCH_FOUND: 'matchFound',
  ROOM_JOINED: 'roomJoined',
  PLAYER_JOINED: 'playerJoined',
  PLAYER_LEFT: 'playerLeft',
  CHARACTER_SELECTED: 'characterSelected',
  STAGE_SELECTED: 'stageSelected',
  PLAYER_READY_CHANGED: 'playerReadyChanged',
  GAME_STARTED: 'gameStarted',
  GAME_STATE_UPDATE: 'gameStateUpdate',
  PLAYER_UPDATE: 'playerUpdate',
  MATCH_ENDED: 'matchEnded',
  MATCH_END: 'matchEnd',
  PLAYER_QUIT_SUCCESS: 'playerQuitSuccess',
  ERROR: 'error',

  // Real-time gameplay events (bidirectional)
  PLAYER_MOVE: 'playerMove',
  PLAYER_ATTACK: 'playerAttack',
  GAME_EVENT: 'gameEvent',
  SERVER_STATE: 'serverState',
  POSITION_CORRECTION: 'positionCorrection',
  MATCH_TIMER_UPDATE: 'matchTimerUpdate',
  GAME_PAUSED: 'gamePaused',
  GAME_RESUMED: 'gameResumed',
  PLAYER_DISCONNECTED: 'playerDisconnected',
  PLAYER_RECONNECTED: 'playerReconnected',

  // Connection maintenance
  PING: 'ping',
  PONG: 'pong',

  // Room/game lifecycle events
  WELCOME: 'welcome',
  ROOM_CREATED: 'roomCreated',
  ROOM_ERROR: 'roomError',
  GAME_READY: 'gameReady',
  ROOM_STATE_SYNC: 'roomStateSync',
  GAME_STARTING: 'gameStarting',
  GAME_STATE_SYNC: 'gameStateSync',
  LOBBY_STATE: 'lobbyState',
  ROOM_CLEANED_UP: 'roomCleanedUp',
  HOST_CHANGED: 'hostChanged',
  LEFT_ROOM: 'leftRoom',

  // Combat/gameplay events
  PLAYER_HIT: 'playerHit',
  PLAYER_KO: 'playerKO',
  PLAYER_RESPAWN: 'playerRespawn',
  STAGE_HAZARD: 'stageHazard',
  POWERUP_SPAWN: 'powerupSpawn',
  POWERUP_COLLECTED: 'powerupCollected',

  // Match state events
  MATCH_PAUSED: 'matchPaused',
  MATCH_RESUMED: 'matchResumed',
  MATCH_TIMEOUT: 'matchTimeout',
} as const;

export type SocketEvent = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];

// Base interfaces
export interface BaseMessage {
  timestamp: number;
  playerId: string;
}

export interface SocketError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ServerResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: SocketError;
  timestamp: number;
}

// Player Input Messages (unified)
export interface PlayerInputData {
  type: string;
  inputType?: string;
  data?: Record<string, unknown>;
  sequence?: number;
  timestamp?: number;
  attackType?: string;
  direction?: number;
  facing?: 'left' | 'right';
}

export interface ProcessedPlayerInput {
  playerId: string;
  timestamp: number;
  inputType: string;
  data: Record<string, unknown>;
  sequence: number;
  attackType?: string;
  direction?: number;
  facing?: 'left' | 'right';
}

export interface PlayerInputMessage extends BaseMessage {
  input: PlayerInputState;
  sequence: number;
}

export interface PlayerPositionMessage extends BaseMessage {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  sequence: number;
}

// Game State Messages
export interface PlayerUpdateMessage {
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  animation: string;
  health: number;
  stocks: number;
  isInvulnerable: boolean;
}

export interface GameStateMessage {
  matchState: MatchState;
  players: Record<string, PlayerUpdateMessage>;
  timestamp: number;
}

export interface MatchResultMessage {
  winner: string | null;
  finalStats: Record<string, GameplayPlayerStats>;
  duration: number;
  reason: 'elimination' | 'timeout' | 'disconnect';
}

export interface GameStateUpdate {
  type: 'player_update' | 'game_state' | 'match_end' | 'error';
  data: Record<string, unknown>;
  timestamp: number;
  sequence?: number;
}

// Match and Room Data
export interface MatchState {
  phase: MatchPhase;
  timeRemaining: number;
  maxDuration: number;
  players: MatchPlayer[];
  winner?: string;
}

export interface MatchPlayer {
  id: string;
  name: string;
  character: string | null;
  stats: GameplayPlayerStats;
  connected: boolean;
  ready: boolean;
}

export interface NetworkPlayer {
  id: string;
  name: string;
  character: string | null;
  ready: boolean;
  connected: boolean;
  stats: GameplayPlayerStats;
}

export interface RoomData {
  id: string;
  players: NetworkPlayer[];
  maxPlayers: number;
  stage: string | null;
  state: MatchPhase;
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

// Matchmaking and Room Management
export interface MatchmakingRequest {
  gameMode: string;
  characterId?: string;
  preferences?: {
    region?: string;
    skillRange?: 'any' | 'similar' | 'strict';
  };
}

export interface RoomJoinRequest {
  roomId: string;
  password?: string;
}

// Event Data Interfaces
export interface PlayerJoinedData {
  playerId: string;
  username: string;
  roomId: string;
}

export interface PlayerLeftData {
  playerId: string;
  username: string;
  roomId: string;
}

export interface GameReadyData {
  roomId: string;
  players: any[];
  gameConfig: any;
}

export interface GameEventData {
  type: string;
  data: any;
  timestamp: number;
}

export interface GameStateSync {
  roomId: string;
  gameState: any;
  timestamp: number;
}

export interface MatchEndData {
  roomId: string;
  winner?: string;
  reason: string;
  stats: any;
}

export interface MatchTimerUpdate {
  timeRemaining: number;
  timeElapsed: number;
  serverTimestamp: number;
  isPaused: boolean;
}

// Client-to-Server Event Interface
export interface ClientToServerEvents {
  // Authentication
  authenticate: (token: string) => void;

  // Matchmaking
  joinQueue: () => void;
  leaveQueue: () => void;

  // Room management
  joinRoom: (roomId: string) => void;
  leaveRoom: () => void;

  // Character/Stage selection
  selectCharacter: (character: string) => void;
  selectStage: (stage: string) => void;
  playerReady: (ready: boolean) => void;

  // Game input
  playerInput: (input: PlayerInputMessage) => void;
  playerPosition: (position: PlayerPositionMessage) => void;

  // Chat
  chatMessage: (message: string) => void;
}

// Server-to-Client Event Interface
export interface ServerToClientEvents {
  // Authentication
  authenticated: (playerId: string) => void;
  authenticationFailed: (reason: string) => void;

  // Matchmaking
  queueJoined: () => void;
  matchFound: (roomId: string) => void;

  // Room events
  roomJoined: (roomData: RoomData) => void;
  playerJoined: (player: NetworkPlayer) => void;
  playerLeft: (playerId: string) => void;

  // Character/Stage selection
  characterSelected: (playerId: string, character: string) => void;
  stageSelected: (stage: string) => void;
  playerReadyChanged: (playerId: string, ready: boolean) => void;

  // Game state
  gameStarted: () => void;
  gameStateUpdate: (state: GameStateMessage) => void;
  playerUpdate: (playerId: string, update: PlayerUpdateMessage) => void;
  matchEnded: (result: MatchResultMessage) => void;

  // Error handling
  error: (message: string) => void;

  // Chat
  chatMessage: (playerId: string, message: string) => void;
}

// Connection Events
export interface ConnectionEvents {
  connect: () => void;
  disconnect: (reason: string) => void;
  reconnect: (attemptNumber: number) => void;
  reconnectFailed: () => void;
}

// Socket Client Type
export type SocketClient = {
  emit<K extends keyof ClientToServerEvents>(
    event: K,
    ...args: Parameters<ClientToServerEvents[K]>
  ): void;

  on<K extends keyof ServerToClientEvents>(
    event: K,
    listener: ServerToClientEvents[K]
  ): void;

  off<K extends keyof ServerToClientEvents>(
    event: K,
    listener?: ServerToClientEvents[K]
  ): void;

  connected: boolean;
  id: string;
};