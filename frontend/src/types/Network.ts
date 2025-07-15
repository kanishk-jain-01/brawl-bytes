/*
 * Network Types
 * -------------
 * Type definitions for Socket.io network communication between client and server.
 * Includes message types, event interfaces, and multiplayer communication structures.
 */

import type { CharacterType, StageType } from '@/utils/constants';
import type { PlayerInputState, PlayerStats } from './Player';
import type { MatchState } from './GameState';

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
