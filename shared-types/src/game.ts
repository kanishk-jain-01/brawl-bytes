/*
 * Shared Game Types
 * -----------------
 * Common game-related type definitions used by both frontend and backend.
 * Resolves type duplication and provides consistent game entity contracts.
 */

// Import enums from constants to avoid duplication
import { CharacterType, StageType, GameMode, ErrorCode } from './constants';

// Game State Enums
export enum PlayerState {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  READY = 'ready',
  PLAYING = 'playing',
  DISCONNECTED = 'disconnected',
  RECONNECTING = 'reconnecting',
}

export enum GameState {
  WAITING = 'waiting',
  STARTING = 'starting',
  PLAYING = 'playing',
  PAUSED = 'paused',
  ENDED = 'ended',
}

export enum MatchPhase {
  WAITING = 'waiting',
  CHARACTER_SELECT = 'character_select',
  LOADING = 'loading',
  PLAYING = 'playing',
  PAUSED = 'paused',
  FINISHED = 'finished',
}

export enum DamageType {
  PHYSICAL = 'physical',
  ELEMENTAL = 'elemental',
  ENVIRONMENTAL = 'environmental',
  FALL = 'fall',
}

// Re-export imported enums
export { CharacterType, StageType, GameMode, ErrorCode };

// Player Stats (resolved duplication)
export interface GameplayPlayerStats {
  health: number;
  maxHealth: number;
  stocks: number;
  maxStocks: number;
  damage: number;
  kills: number;
  deaths: number;
}

export interface DatabasePlayerStats {
  level: number;
  experiencePoints: number;
  coins: number;
  totalMatches: number;
  wins: number;
  losses: number;
  winStreak: number;
  bestWinStreak: number;
  rating: number;
  rankTier: string;
}

export interface UserStats {
  wins: number;
  losses: number;
  totalMatches: number;
  winRate: number;
  averageMatchDuration: number;
  favoriteCharacter?: string;
}

// Player Input and Controls
export interface PlayerInputState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  jump: boolean;
  attack: boolean;
  specialAttack: boolean;
  shield: boolean;
}

// Damage and Combat
export interface DamageInfo {
  amount: number;
  type: DamageType;
  knockback?: { x: number; y: number };
  isCritical?: boolean;
  source?: string;
}

export interface AttackData {
  attackerId: string;
  targetId: string;
  damage: number;
  knockback: { x: number; y: number };
  attackType: string;
  timestamp: number;
}

// Stage and Environment (unified)
export interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
  isPassThrough?: boolean;
}

export interface Hazard {
  x: number;
  y: number;
  width: number;
  height: number;
  type: string;
  damage?: number;
  knockback?: { x: number; y: number };
}

export interface StageData {
  name: string;
  width: number;
  height: number;
  platforms: Platform[];
  hazards?: Hazard[];
  spawnPoints: { x: number; y: number }[];
  boundaries: {
    left: number;
    right: number;
    top: number;
    bottom: number;
  };
  backgroundMusic?: string;
}

// Physics and Movement
export interface PlayerPhysicsState {
  playerId: string;
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  isGrounded: boolean;
  canDoubleJump: boolean;
  hasUsedDoubleJump: boolean;
  health: number;
  stocks: number;
  isInvulnerable: boolean;
  lastInvulnerabilityStart: number;
  lastAttackTime: number;
  isAttacking: boolean;
  accumulatedDamage: number;
  lastUpdateTime: number;
}

export interface PhysicsValidationResult {
  valid: boolean;
  correctedState?: Partial<PlayerPhysicsState>;
  reason?: string;
}

// Character and Game Data
export interface DatabaseStats {
  health: number;
  speed: number;
  jumpPower: number;
  attackDamage: number;
  range: number;
}

export interface Character {
  id: string;
  name: string;
  stats: DatabaseStats;
  unlocked: boolean;
}

export interface Stage {
  id: string;
  name: string;
  spawns: Array<{ x: number; y: number }>;
  platforms: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
}

// Match and Game Results
export interface MatchResult {
  winnerId?: string;
  winnerUsername?: string;
  loserId?: string;
  loserUsername?: string;
  endReason: 'knockout' | 'timeout' | 'forfeit' | 'disconnect';
  finalScores: { [playerId: string]: number };
  matchDuration: number;
  endedAt: Date;
}

export interface DetailedMatchResult {
  userId: string;
  won: boolean;
  placement: number;
  damageDealt: number;
  damageTaken: number;
  kills: number;
  deaths: number;
  experienceGained: number;
  coinsEarned: number;
  ratingChange: number;
}

// Game Configuration
export interface GameRoomConfig {
  maxPlayers: number;
  gameMode: string;
  stage?: string | undefined;
  timeLimit?: number;
  stockCount?: number;
  reconnectionGracePeriod?: number;
  maxReconnectionTime?: number;
  maxDisconnectCount?: number;
  autoCleanupOnTimeout?: boolean;
}

export interface MatchPreferences {
  gameMode: string;
  characterId?: string;
  preferredCharacter?: string;
  preferredStage?: string;
  region?: string;
  skillRange?: 'any' | 'similar' | 'strict';
  maxLatency?: number;
}

export interface GameConstants {
  [category: string]: {
    [key: string]: number | string | boolean;
  };
}