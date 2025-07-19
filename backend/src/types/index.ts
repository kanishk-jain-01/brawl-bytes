/*
 * Backend Types - Main Export File
 * ---------------------------------
 * Centralized type definitions for backend-specific logic and extensions.
 * Re-exports shared types and adds backend-specific extensions.
 */

import type { Socket } from 'socket.io';
import type { PlayerState, MatchPreferences } from '@brawl-bytes/shared-types';

// Re-export shared types for easy importing
export * from '@brawl-bytes/shared-types';

// Backend-specific type extensions
export * from './database';

// Backend-specific extensions to shared types
export interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
  isAuthenticated?: boolean;
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

export interface QueuedPlayer {
  socket: AuthenticatedSocket;
  userId: string;
  username: string;
  preferences?: MatchPreferences;
  queuedAt: Date;
  rating?: number;
}

// Backend-specific game result interface (extends shared MatchResult)
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
