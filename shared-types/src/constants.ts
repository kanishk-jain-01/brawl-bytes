/*
 * Shared Constants
 * ----------------
 * Common constants, enums, and type definitions used by both frontend and backend.
 * Provides consistent identifiers and prevents magic strings across the application.
 */

// Character and Stage Type Enums
export enum CharacterType {
  DASH = 'DASH',
  REX = 'REX',
  TITAN = 'TITAN',
  NINJA = 'NINJA',
}

export enum StageType {
  JUNGLE_CANOPY = 'JUNGLE_CANOPY',
  ANCIENT_COLOSSEUM = 'ANCIENT_COLOSSEUM',
  SKY_CITADEL = 'SKY_CITADEL',
  VOLCANO_FORGE = 'VOLCANO_FORGE',
}

// Game Mode Constants
export enum GameMode {
  CLASSIC = 'classic',
  RANKED = 'ranked',
  CASUAL = 'casual',
  TOURNAMENT = 'tournament',
}

// Asset Key Constants
export const ASSET_KEYS = {
  SCENES: {
    BOOT: 'boot',
    MENU: 'menu',
    CHARACTER_SELECT: 'character_select',
    STAGE_SELECT: 'stage_select',
    GAME: 'game',
    RESULT: 'result',
    LOBBY: 'lobby',
  },
  
  IMAGES: {
    LOGO: 'logo',
    BACKGROUND_MENU: 'background_menu',
    BACKGROUND_STAGE1: 'background_stage1',
    BACKGROUND_STAGE2: 'background_stage2',
    BACKGROUND_STAGE3: 'background_stage3',
    CHARACTER_DASH: 'character_dash',
    CHARACTER_REX: 'character_rex',
    CHARACTER_TITAN: 'character_titan',
    CHARACTER_NINJA: 'character_ninja',
    DASH_CARD: 'dash_card',
    NINJA_CARD: 'ninja_card',
    REX_CARD: 'rex_card',
    TITAN_CARD: 'titan_card',
    PLATFORM: 'platform',
    UI_BUTTON: 'ui_button',
    UI_BUTTON_HOVER: 'ui_button_hover',
    HEALTH_BAR: 'health_bar',
    ENERGY_BAR: 'energy_bar',
  },
  
  AUDIO: {
    MENU_MUSIC: 'menu_music',
    GAME_MUSIC: 'game_music',
    BATTLE_THEME: 'battle_theme',
    SKY_THEME: 'sky_theme',
    VOLCANO_THEME: 'volcano_theme',
    SFX_JUMP: 'sfx_jump',
    SFX_ATTACK: 'sfx_attack',
    SFX_HIT: 'sfx_hit',
    SFX_BUTTON: 'sfx_button',
    SFX_VICTORY: 'sfx_victory',
    SFX_DEFEAT: 'sfx_defeat',
  },
  
  SPRITESHEETS: {
    DASH_SPRITES: 'dash_sprites',
    REX_SPRITES: 'rex_sprites',
    TITAN_SPRITES: 'titan_sprites',
    NINJA_SPRITES: 'ninja_sprites',
    EFFECTS: 'effects',
    UI_ELEMENTS: 'ui_elements',
  },
} as const;

// Game Configuration Constants
export const GAME_CONSTANTS = {
  PHYSICS: {
    GRAVITY: 800,
    JUMP_VELOCITY: -400,
    DOUBLE_JUMP_VELOCITY: -350,
    MOVE_SPEED: 200,
    MAX_VELOCITY: 600,
    FRICTION: 0.8,
    AIR_RESISTANCE: 0.98,
    BOUNCE_FACTOR: 0.3,
  },
  
  COMBAT: {
    ATTACK_RANGE: 60,
    ATTACK_COOLDOWN: 500,
    INVULNERABILITY_DURATION: 1000,
    MAX_DAMAGE_PER_HIT: 25,
    MIN_DAMAGE_PER_HIT: 5,
    CRITICAL_MULTIPLIER: 1.5,
    CRITICAL_CHANCE: 0.1,
  },
  
  GAME: {
    MAX_STOCKS: 3,
    MATCH_TIME: 180000, // 3 minutes in milliseconds
    RESPAWN_TIME: 2000,
    MAX_PLAYERS: 4,
  },
  
  NETWORK: {
    POSITION_SYNC_RATE: 60, // Hz
    MAX_INPUT_BUFFER_SIZE: 100,
    INTERPOLATION_DELAY: 100, // ms
    MAX_BUFFER_SIZE: 1000,
  },
  
  VALIDATION: {
    POSITION_TOLERANCE: 5,
    VELOCITY_TOLERANCE: 50,
    MAX_POSITION_CHANGE_PER_MS: 1,
    MAX_VELOCITY_CHANGE_PER_MS: 2,
  },
} as const;

// Color Constants
export const UI_COLORS = {
  PRIMARY: '#3498db',
  SECONDARY: '#2c3e50',
  SUCCESS: '#27ae60',
  DANGER: '#e74c3c',
  WARNING: '#f39c12',
  TEXT: '#2c3e50',
  TEXT_SECONDARY: '#7f8c8d',
  
  // Character colors for sprite tinting
  CHARACTER_DASH: '#3498db',    // Blue
  CHARACTER_REX: '#27ae60',     // Green
  CHARACTER_TITAN: '#e74c3c',   // Red
  CHARACTER_NINJA: '#9b59b6',   // Purple
} as const;

// Input Key Constants
export const INPUT_KEYS = {
  LEFT: 'ArrowLeft',
  RIGHT: 'ArrowRight',
  UP: 'ArrowUp',
  DOWN: 'ArrowDown',
  JUMP: 'Space',
  ATTACK: 'KeyZ',
  SPECIAL_ATTACK: 'KeyX',
  SHIELD: 'KeyC',
  
  // Alternative keys
  ALT_LEFT: 'KeyA',
  ALT_RIGHT: 'KeyD',
  ALT_UP: 'KeyW',
  ALT_DOWN: 'KeyS',
} as const;

// Server Configuration
export const SERVER_CONFIG = {
  DEFAULT_PORT: 3001,
  FRONTEND_PORT: 3000,
  MAX_RECONNECTION_ATTEMPTS: 5,
  RECONNECTION_DELAY: 1000,
  HEARTBEAT_INTERVAL: 30000,
} as const;

// Error Codes
export enum ErrorCode {
  AUTHENTICATION_FAILED = 'AUTH_FAILED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  ROOM_NOT_FOUND = 'ROOM_NOT_FOUND',
  ROOM_FULL = 'ROOM_FULL',
  PLAYER_NOT_FOUND = 'PLAYER_NOT_FOUND',
  INVALID_INPUT = 'INVALID_INPUT',
  GAME_NOT_STARTED = 'GAME_NOT_STARTED',
  ALREADY_IN_ROOM = 'ALREADY_IN_ROOM',
  NOT_IN_ROOM = 'NOT_IN_ROOM',
  NETWORK_ERROR = 'NETWORK_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
}

// Type utilities for strict typing
export type AssetKey = (typeof ASSET_KEYS)[keyof typeof ASSET_KEYS][keyof (typeof ASSET_KEYS)[keyof typeof ASSET_KEYS]];
export type ColorKey = keyof typeof UI_COLORS;
export type InputKey = (typeof INPUT_KEYS)[keyof typeof INPUT_KEYS];