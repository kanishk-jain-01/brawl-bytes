/*
 * Network Types
 * -------------
 * Type definitions for Socket.io network communication between client and server.
 * Includes message types, event interfaces, and multiplayer communication structures.
 */

import type { CharacterType, StageType } from '@/utils/constants';
import type { PlayerInputState, PlayerStats } from './Player';
import type { MatchState } from './GameState';

/**
 * Socket.io Event Names
 * ---------------------
 * Centralised catalogue of every Socket.io event used by the frontend. Refer to
 * these keys instead of hard-coding string literals to avoid "magic strings".
 */
export const SOCKET_EVENTS = {
  // Client → Server events
  AUTHENTICATE: 'authenticate',
  JOIN_QUEUE: 'joinQueue',
  LEAVE_QUEUE: 'leaveQueue',
  JOIN_ROOM: 'joinRoom',
  LEAVE_ROOM: 'leaveRoom',
  SELECT_CHARACTER: 'selectCharacter',
  SELECT_STAGE: 'selectStage',
  PLAYER_READY: 'playerReady',
  PLAYER_INPUT: 'playerInput',
  PLAYER_POSITION: 'playerPosition',
  CHAT_MESSAGE: 'chatMessage',
  REQUEST_GAME_STATE_SYNC: 'requestGameStateSync',

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
  ERROR: 'error',

  // Real-time gameplay events (bidirectional)
  PLAYER_MOVE: 'playerMove',
  PLAYER_ATTACK: 'playerAttack',
  GAME_EVENT: 'gameEvent',
  SERVER_STATE: 'serverState',
  POSITION_CORRECTION: 'positionCorrection',
  GAME_PAUSED: 'gamePaused',
  GAME_RESUMED: 'gameResumed',
  PLAYER_DISCONNECTED: 'playerDisconnected',
  PLAYER_RECONNECTED: 'playerReconnected',

  // Connection maintenance
  PING: 'ping',
  PONG: 'pong',

  // Additional room/game lifecycle events
  WELCOME: 'welcome',
  ROOM_CREATED: 'roomCreated',
  ROOM_ERROR: 'roomError',
  GAME_READY: 'gameReady',
  ROOM_STATE_SYNC: 'roomStateSync',
  GAME_STARTING: 'gameStarting',
  GAME_STATE_SYNC: 'gameStateSync',

  // Detailed combat/gameplay events
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
  GAME_STARTING_CLIENT: 'gameStarting',

  // Room management (client → server)
  CREATE_ROOM: 'createRoom',
  REQUEST_ROOM_STATE: 'requestRoomState',
  START_GAME: 'startGame',
} as const;

/**
 * Helper type representing any valid Socket.io event name.
 */
export type SocketEvent = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];

// Base message interface
export interface BaseMessage {
  timestamp: number;
  playerId: string;
}

// Message Interfaces (defined before use)
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
  finalStats: Record<string, PlayerStats>;
  duration: number;
  reason: 'elimination' | 'timeout' | 'disconnect';
}

// Data Structures
export interface NetworkPlayer {
  id: string;
  name: string;
  character: CharacterType | null;
  ready: boolean;
  connected: boolean;
  stats: PlayerStats;
}

export interface RoomData {
  id: string;
  players: NetworkPlayer[];
  maxPlayers: number;
  stage: StageType | null;
  state: 'waiting' | 'character_select' | 'loading' | 'playing' | 'finished';
}

// Client-to-Server Messages
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
  selectCharacter: (character: CharacterType) => void;
  selectStage: (stage: StageType) => void;
  playerReady: (ready: boolean) => void;

  // Game input
  playerInput: (input: PlayerInputMessage) => void;
  playerPosition: (position: PlayerPositionMessage) => void;

  // Chat (optional)
  chatMessage: (message: string) => void;
}

// Server-to-Client Messages
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
  characterSelected: (playerId: string, character: CharacterType) => void;
  stageSelected: (stage: StageType) => void;
  playerReadyChanged: (playerId: string, ready: boolean) => void;

  // Game state
  gameStarted: () => void;
  gameStateUpdate: (state: GameStateMessage) => void;
  playerUpdate: (playerId: string, update: PlayerUpdateMessage) => void;
  matchEnded: (result: MatchResultMessage) => void;

  // Error handling
  error: (message: string) => void;

  // Chat (optional)
  chatMessage: (playerId: string, message: string) => void;
}

// Connection Events
export interface ConnectionEvents {
  connect: () => void;
  disconnect: (reason: string) => void;
  reconnect: (attemptNumber: number) => void;
  reconnectFailed: () => void;
}

// Type for Socket.io client instance
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

export interface PlayerInputData {
  playerId: string;
  inputType: string;
  data: any;
  timestamp: number;
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
