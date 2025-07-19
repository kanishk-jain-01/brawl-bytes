/*
 * Shared Types - Main Export File
 * --------------------------------
 * Centralized type definitions for Brawl Bytes multiplayer game.
 * This file provides clean, organized exports for all shared types.
 */

// Authentication types
export * from './auth';

// Game-related types (resolves duplication between frontend/backend)
export * from './game';

// Network communication types (unified socket contracts)
export * from './network';

// Constants and enums (shared identifiers)
export * from './constants';

// Re-export commonly used types for convenience
export type {
  // Auth
  AuthRequest,
  AuthResponse,
  TokenPayload,
  AuthUser,
  AuthState,
} from './auth';

export type {
  // Player Types (resolved duplication)
  GameplayPlayerStats,
  DatabasePlayerStats,
  UserStats,
  PlayerInputState,
  
  // Combat
  DamageInfo,
  AttackData,
  
  // Environment
  Platform,
  Hazard,
  StageData,
  
  // Physics
  PlayerPhysicsState,
  PhysicsValidationResult,
  
  // Character & Game Data
  Character,
  Stage,
  MatchResult,
  DetailedMatchResult,
  
  // Configuration
  GameRoomConfig,
  MatchPreferences,
  GameConstants,
} from './game';

export type {
  // Socket Events
  SocketEvent,
  
  // Base Interfaces
  BaseMessage,
  SocketError,
  ServerResponse,
  
  // Input Messages
  PlayerInputData,
  ProcessedPlayerInput,
  PlayerInputMessage,
  PlayerPositionMessage,
  
  // Game State Messages
  PlayerUpdateMessage,
  GameStateMessage,
  MatchResultMessage,
  GameStateUpdate,
  
  // Match & Room Data
  MatchState,
  MatchPlayer,
  NetworkPlayer,
  RoomData,
  RoomStateData,
  
  // Matchmaking
  MatchmakingRequest,
  RoomJoinRequest,
  
  // Event Interfaces
  ClientToServerEvents,
  ServerToClientEvents,
  ConnectionEvents,
  SocketClient,
  
  // Utility Types
  MatchTimerUpdate,
} from './network';

export type {
  // Type utilities
  AssetKey,
  ColorKey,
  InputKey,
} from './constants';

// Export constants for direct use
export {
  ASSET_KEYS,
  GAME_CONSTANTS,
  UI_COLORS,
  INPUT_KEYS,
  SERVER_CONFIG,
  CharacterType,
  StageType,
  GameMode,
  ErrorCode,
} from './constants';

export {
  SOCKET_EVENTS,
} from './network';

export {
  PlayerState,
  GameState,
  MatchPhase,
  DamageType,
} from './game';