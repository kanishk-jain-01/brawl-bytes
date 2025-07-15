/*
 * Stage Types
 * -----------
 * Type definitions for stage entities, platforms, and environmental hazards.
 * Includes stage configuration and platform-related interfaces.
 */

import type { StageType } from '@/utils/constants';

export interface StageConfig {
  scene: Phaser.Scene;
  stageType: StageType;
  worldWidth: number;
  worldHeight: number;
}

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
  damage: number;
  knockback: { x: number; y: number };
}

export interface StageData {
  name: string;
  width: number;
  height: number;
  platforms: Platform[];
  hazards: Hazard[];
  spawnPoints: { x: number; y: number }[];
  backgroundMusic?: string;
}
