/*
 * Shared Types
 * ------------
 * Type definitions for backend game logic, authentication, and socket management.
 * These extend and complement the frontend types for server-side validation.
 */

import type { Socket } from 'socket.io';

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

// Network communication types (should be shared with frontend)
export interface PlayerInputData {
  type: string;
  inputType?: string;
  data?: any;
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
  data: any;
  sequence: number;
  attackType?: string;
  direction?: number;
  facing?: 'left' | 'right';
}

export interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
  isAuthenticated?: boolean;
}

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

export interface MatchResult {
  winnerId: string;
  winnerUsername: string;
  loserId: string;
  loserUsername: string;
  matchDuration: number;
  endReason: 'knockout' | 'timeout' | 'forfeit';
}

export interface UserStats {
  wins: number;
  losses: number;
  totalMatches: number;
  winRate: number;
  averageMatchDuration: number;
  favoriteCharacter?: string;
}

// Server-specific player data for game rooms
export interface GameRoomPlayer {
  socket: AuthenticatedSocket;
  userId: string;
  username: string;
  state: PlayerState;
  character?: string | undefined;
  joinedAt: Date;
  isHost: boolean;
  // Server-side player state for validation
  position?: { x: number; y: number };
  velocity?: { x: number; y: number };
  facing?: 'left' | 'right';
  lastSequence?: number;
  lastUpdate?: number;
  // Disconnect handling
  disconnectedAt?: Date;
  reconnectionTimeout?: NodeJS.Timeout;
  disconnectCount?: number;
  lastReconnectAt?: Date;
}
