/*
 * Player Types
 * ------------
 * Type definitions for player entities, damage system, and character configuration.
 * Includes damage types, player config interfaces, and combat-related type definitions.
 */

import type { CharacterType } from '@/utils/constants';

export enum DamageType {
  PHYSICAL = 'physical',
  ELEMENTAL = 'elemental',
  ENVIRONMENTAL = 'environmental',
  FALL = 'fall',
}

export interface DamageInfo {
  amount: number;
  type: DamageType;
  knockback?: { x: number; y: number };
  isCritical?: boolean;
  source?: string;
}

export interface PlayerConfig {
  scene: Phaser.Scene;
  x: number;
  y: number;
  characterType: CharacterType;
  playerId: string;
  isLocalPlayer: boolean;
}

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

export interface PlayerStats {
  health: number;
  maxHealth: number;
  stocks: number;
  maxStocks: number;
  damage: number;
  kills: number;
  deaths: number;
}
