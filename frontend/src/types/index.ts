/*
 * Types Index
 * -----------
 * Central export file for all type definitions used throughout the frontend.
 * Provides clean imports for components and maintains type organization.
 */

// Player types
export type {
  DamageInfo,
  PlayerConfig,
  PlayerInputState,
  PlayerStats,
} from './Player';

export { DamageType } from './Player';

// Stage types
export type { StageConfig, Platform, Hazard, StageData } from './Stage';

// Game state types
export type {
  GameState,
  MatchState,
  MatchPlayer,
  SessionData,
} from './GameState';

// Network types
export type {
  BaseMessage,
  ClientToServerEvents,
  ServerToClientEvents,
  PlayerInputMessage,
  PlayerPositionMessage,
  PlayerUpdateMessage,
  GameStateMessage,
  MatchResultMessage,
  NetworkPlayer,
  RoomData,
  ConnectionEvents,
  SocketClient,
  MatchTimerUpdate,
} from './Network';

// Re-export commonly used types from utils/constants
export type { CharacterType, StageType } from '@/utils/constants';
