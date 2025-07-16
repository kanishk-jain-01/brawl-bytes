/*
 * Game State Types
 * ----------------
 * Type definitions for the global game state management system.
 * Includes interfaces for game state, match state, and session management.
 */

import type { CharacterType, StageType } from '@/utils/constants';
import type { PlayerStats } from './Player';

/**
 * Shape of the global game state object.
 */
export interface MatchPlayer {
  /** Unique player identifier */
  id: string;
  /** Player display name */
  name: string;
  /** Selected character type */
  character: CharacterType | null;
  /** Current player statistics */
  stats: PlayerStats;
  /** Player connection status */
  connected: boolean;
  /** Player ready status */
  ready: boolean;
}

export interface MatchState {
  /** Current match phase */
  phase:
    | 'waiting'
    | 'character_select'
    | 'loading'
    | 'playing'
    | 'paused'
    | 'finished';
  /** Match timer in seconds */
  timeRemaining: number;
  /** Maximum match duration in seconds */
  maxDuration: number;
  /** Players in the current match */
  players: MatchPlayer[];
  /** Winner of the match (if finished) */
  winner?: string;
}

export interface GameState {
  /** Character selected in the character-select scene */
  selectedCharacter: CharacterType | null;
  /** Stage selected in the stage-select scene (future use) */
  selectedStage: StageType | null;
  /** Current match ID for multiplayer sessions */
  matchId?: string;
  /** Current room ID for multiplayer sessions */
  roomId?: string;
  /** Player ID for the current user */
  playerId?: string;
  /** Current match state */
  matchState?: MatchState;
  /** Authoritative game start data from server */
  gameStartData?: any;
}

export interface SessionData {
  /** User authentication token */
  token?: string;
  /** User profile information */
  user?: {
    id: string;
    username: string;
    email: string;
  };
  /** Connection quality metrics */
  connection?: {
    latency: number;
    quality: 'excellent' | 'good' | 'fair' | 'poor';
  };
}
