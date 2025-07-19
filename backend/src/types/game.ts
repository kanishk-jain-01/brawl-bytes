import type { AuthenticatedSocket } from './auth';

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

export interface GameRoomPlayer {
  socket: AuthenticatedSocket;
  userId: string;
  username: string;
  state: PlayerState;
  character?: string | undefined;
  joinedAt: Date;
  isHost: boolean;
  position?: { x: number; y: number };
  velocity?: { x: number; y: number };
  facing?: 'left' | 'right';
  lastSequence?: number;
  lastUpdate?: number;
  disconnectedAt?: Date;
  reconnectionTimeout?: NodeJS.Timeout;
  disconnectCount?: number;
  lastReconnectAt?: Date;
}

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

export interface GameResults {
  winnerId?: string | undefined;
  winnerUsername?: string | undefined;
  loserId?: string | undefined;
  loserUsername?: string | undefined;
  endReason: 'knockout' | 'timeout' | 'forfeit' | 'disconnect';
  finalScores: { [playerId: string]: number };
  matchDuration: number;
  endedAt: Date;
}

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

export interface AttackData {
  attackerId: string;
  targetId: string;
  damage: number;
  knockback: { x: number; y: number };
  attackType: string;
  timestamp: number;
}

export interface StageData {
  platforms: ReadonlyArray<{
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  }>;
  boundaries: {
    readonly left: number;
    readonly right: number;
    readonly top: number;
    readonly bottom: number;
  };
  hazards?: ReadonlyArray<{
    readonly type?: string;
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
    readonly damage?: number;
  }>;
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

export interface QueuedPlayer {
  socket: AuthenticatedSocket;
  userId: string;
  username: string;
  preferences?: MatchPreferences;
  queuedAt: Date;
  rating?: number;
}
