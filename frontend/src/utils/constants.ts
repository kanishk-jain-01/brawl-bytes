/*
 * Game Constants
 * --------------
 * Central configuration file containing all game constants and settings.
 * Defines scene keys, physics parameters, character stats, stage layouts, game rules, and UI styling.
 * Includes character balance data (speed, health, damage), stage platform configurations, and asset key mappings.
 * Provides type definitions for characters, stages, and scenes to ensure type safety throughout the application.
 */

export const GAME_CONFIG = {
  SCENE_KEYS: {
    BOOT: 'BootScene',
    MENU: 'MenuScene',
    CHARACTER_SELECT: 'CharacterSelectScene',
    STAGE_SELECT: 'StageSelectScene',
    GAME: 'GameScene',
    RESULT: 'ResultScene',
    LOBBY: 'LobbyScene',
  },

  PHYSICS: {
    GRAVITY: 0,
    JUMP_VELOCITY: 0,
    DOUBLE_JUMP_VELOCITY: 0,
    MOVE_SPEED: 0,
    MAX_VELOCITY: 0,
    MAX_ACCELERATION: 0,
    FRICTION: 0,
    AIR_RESISTANCE: 0,
    BOUNCE_FACTOR: 0,
    WALKING_THRESHOLD: 0,
    DOUBLE_JUMP_MULTIPLIER: 0,
    WORLD_BOUNDS: { WIDTH: 0, HEIGHT: 0, MIN_X: 0, MAX_X: 0, MIN_Y: 0, MAX_Y: 0, DEATH_ZONE_Y: 0 },
  },

  DAMAGE: {
    FALL_DAMAGE: 0,
    MAX_DAMAGE_PER_HIT: 0,
    MIN_DAMAGE_PER_HIT: 0,
    CRITICAL_MULTIPLIER: 0,
    CRITICAL_CHANCE: 0,
  },

  TIMING: {
    ATTACK_COOLDOWN: 0,
    INVULNERABILITY_DURATION: 0,
    CRITICAL_INVULNERABILITY_DURATION: 0,
    RESPAWN_INVULNERABILITY: 0,
    FLASH_INTERVAL: 0,
    MAX_COMBO_TIME: 0,
  },

  COMBAT: {
    ATTACK_RANGE: 0,
    MAX_KNOCKBACK_VELOCITY: 0,
  },

  CHARACTERS: {
    DASH: {
      name: 'Dash',
      speed: 0,
      jumpVelocity: 0,
      health: 0,
      attackDamage: 0,
      weight: 0,
    },
    REX: {
      name: 'Rex',
      speed: 0,
      jumpVelocity: 0,
      health: 0,
      attackDamage: 0,
      weight: 0,
    },
    TITAN: {
      name: 'Titan',
      speed: 0,
      jumpVelocity: 0,
      health: 0,
      attackDamage: 0,
      weight: 0,
    },
  },

  STAGES: {
    BATTLE_ARENA: {
      name: 'Battle Arena',
      description: 'A classic fighting arena with multiple platforms',
      difficulty: 'Easy',
      platforms: [
        { x: 1000, y: 1100, width: 10, height: 1 }, // Main platform
        { x: 400, y: 800, width: 4, height: 1 }, // Left platform
        { x: 1600, y: 800, width: 4, height: 1 }, // Right platform
        { x: 1000, y: 600, width: 3, height: 1 }, // Center elevated
        { x: 600, y: 400, width: 2, height: 1 }, // Top left
        { x: 1400, y: 400, width: 2, height: 1 }, // Top right
      ],
      hazards: [],
      backgroundColor: { top: 0x87ceeb, bottom: 0x98fb98 },
    },
    FLOATING_ISLANDS: {
      name: 'Floating Islands',
      description: 'Scattered platforms floating in the sky',
      difficulty: 'Medium',
      platforms: [
        { x: 1000, y: 1000, width: 6, height: 1 }, // Main platform
        { x: 300, y: 700, width: 2, height: 1 }, // Far left
        { x: 700, y: 500, width: 2, height: 1 }, // Mid left
        { x: 1300, y: 500, width: 2, height: 1 }, // Mid right
        { x: 1700, y: 700, width: 2, height: 1 }, // Far right
        { x: 1000, y: 300, width: 3, height: 1 }, // Top center
      ],
      hazards: [],
      backgroundColor: { top: 0x4169e1, bottom: 0x87cefa },
    },
    VOLCANIC_CHAMBER: {
      name: 'Volcanic Chamber',
      description: 'A dangerous stage with lava hazards',
      difficulty: 'Hard',
      platforms: [
        { x: 1000, y: 1000, width: 8, height: 1 }, // Main platform
        { x: 500, y: 700, width: 2, height: 1 }, // Left platform
        { x: 1500, y: 700, width: 2, height: 1 }, // Right platform
        { x: 1000, y: 400, width: 3, height: 1 }, // Center elevated
      ],
      hazards: [
        { type: 'lava', x: 200, y: 1150, width: 200, height: 50 },
        { type: 'lava', x: 1600, y: 1150, width: 200, height: 50 },
      ],
      backgroundColor: { top: 0x8b0000, bottom: 0xff4500 },
    },
  },

  GAME: {
    MAX_STOCKS: 0,
    MATCH_TIME: 0,
    RESPAWN_TIME: 0,
    MAX_PLAYERS: 0,
  },

  NETWORK: {
    POSITION_SYNC_RATE: 0,
    MAX_INPUT_BUFFER_SIZE: 0,
    INTERPOLATION_DELAY: 0,
    MAX_BUFFER_SIZE: 0,
  },

  VALIDATION: {
    POSITION_TOLERANCE: 0,
    VELOCITY_TOLERANCE: 0,
    MAX_POSITION_CHANGE_PER_MS: 0,
    MAX_VELOCITY_CHANGE_PER_MS: 0,
  },

  PLAYER: {
    COLLISION_BOX: { WIDTH: 0, HEIGHT: 0 },
    DISPLAY_SIZE: { WIDTH: 0, HEIGHT: 0 },
    RADIUS: 0,
  },

  ANIMATION: {
    BREATHING_SCALE: { SCALE_Y: 0, DURATION: 0 },
    HIT_EFFECT: { SCALE_Y: 0, DURATION: 0 },
    DAMAGE_EFFECT: { SCALE_Y: 0, DURATION: 0 },
  },

  SERVER: {
    PORT: 0,
    FRONTEND_PORT: 0,
  },

  UI: {
    COLORS: {
      PRIMARY: '#3498db',
      SECONDARY: '#2c3e50',
      SUCCESS: '#27ae60',
      DANGER: '#e74c3c',
      WARNING: '#f39c12',
      TEXT: '#ffffff',
      TEXT_SECONDARY: '#bdc3c7',
    },
    FONTS: {
      PRIMARY: 'Arial, sans-serif',
      SECONDARY: 'monospace',
    },
  },
};

/**
 * Update GAME_CONFIG with server constants
 */
export function updateGameConfig(serverConstants: any): void {
  // Physics Constants
  if (serverConstants.physics) {
    Object.assign(GAME_CONFIG.PHYSICS, {
      GRAVITY: serverConstants.physics.gravity,
      JUMP_VELOCITY: serverConstants.physics.jump_velocity,
      DOUBLE_JUMP_VELOCITY: serverConstants.physics.double_jump_velocity,
      MOVE_SPEED: serverConstants.physics.move_speed,
      MAX_VELOCITY: serverConstants.physics.max_velocity,
      MAX_ACCELERATION: serverConstants.physics.max_acceleration,
      FRICTION: serverConstants.physics.friction,
      AIR_RESISTANCE: serverConstants.physics.air_resistance,
      BOUNCE_FACTOR: serverConstants.physics.bounce_factor,
      WALKING_THRESHOLD: serverConstants.physics.walking_threshold,
      DOUBLE_JUMP_MULTIPLIER: serverConstants.physics.double_jump_multiplier,
    });

    if (serverConstants.physics.world_bounds) {
      GAME_CONFIG.PHYSICS.WORLD_BOUNDS = {
        WIDTH: serverConstants.physics.world_bounds.width || Math.abs(
          serverConstants.physics.world_bounds.max_x -
            serverConstants.physics.world_bounds.min_x
        ),
        HEIGHT: serverConstants.physics.world_bounds.height || Math.abs(
          serverConstants.physics.world_bounds.max_y -
            serverConstants.physics.world_bounds.min_y
        ),
        MIN_X: serverConstants.physics.world_bounds.min_x,
        MAX_X: serverConstants.physics.world_bounds.max_x,
        MIN_Y: serverConstants.physics.world_bounds.min_y,
        MAX_Y: serverConstants.physics.world_bounds.max_y,
        DEATH_ZONE_Y: serverConstants.physics.world_bounds.death_zone_y,
      };
    }
  }

  // Combat Constants
  if (serverConstants.combat) {
    Object.assign(GAME_CONFIG.DAMAGE, {
      FALL_DAMAGE: serverConstants.combat.fall_damage,
      MAX_DAMAGE_PER_HIT: serverConstants.combat.max_damage_per_hit,
      MIN_DAMAGE_PER_HIT: serverConstants.combat.min_damage_per_hit,
      CRITICAL_MULTIPLIER: serverConstants.combat.critical_multiplier,
      CRITICAL_CHANCE: serverConstants.combat.critical_chance,
    });

    Object.assign(GAME_CONFIG.TIMING, {
      ATTACK_COOLDOWN: serverConstants.combat.attack_cooldown,
      INVULNERABILITY_DURATION: serverConstants.combat.invulnerability_duration,
      CRITICAL_INVULNERABILITY_DURATION: serverConstants.combat.critical_invulnerability_duration,
      RESPAWN_INVULNERABILITY: serverConstants.combat.respawn_invulnerability,
      FLASH_INTERVAL: serverConstants.combat.flash_interval,
      MAX_COMBO_TIME: serverConstants.combat.max_combo_time,
    });

    Object.assign(GAME_CONFIG.COMBAT, {
      ATTACK_RANGE: serverConstants.combat.attack_range,
      MAX_KNOCKBACK_VELOCITY: serverConstants.combat.max_knockback_velocity,
    });
  }

  // Game Constants
  if (serverConstants.game) {
    Object.assign(GAME_CONFIG.GAME, {
      MAX_STOCKS: serverConstants.game.max_stocks,
      MATCH_TIME: serverConstants.game.match_time,
      RESPAWN_TIME: serverConstants.game.respawn_time,
      MAX_PLAYERS: serverConstants.game.max_players,
    });
  }

  // Character Constants
  if (serverConstants.characters) {
    if (serverConstants.characters.dash) {
      Object.assign(GAME_CONFIG.CHARACTERS.DASH, serverConstants.characters.dash);
    }
    if (serverConstants.characters.rex) {
      Object.assign(GAME_CONFIG.CHARACTERS.REX, serverConstants.characters.rex);
    }
    if (serverConstants.characters.titan) {
      Object.assign(GAME_CONFIG.CHARACTERS.TITAN, serverConstants.characters.titan);
    }
  }

  // UI Constants
  if (serverConstants.ui) {
    if (serverConstants.ui.colors) {
      Object.assign(GAME_CONFIG.UI.COLORS, {
        PRIMARY: serverConstants.ui.colors.primary,
        SECONDARY: serverConstants.ui.colors.secondary,
        SUCCESS: serverConstants.ui.colors.success,
        DANGER: serverConstants.ui.colors.danger,
        WARNING: serverConstants.ui.colors.warning,
        TEXT: serverConstants.ui.colors.text,
        TEXT_SECONDARY: serverConstants.ui.colors.text_secondary,
      });
    }
    if (serverConstants.ui.fonts) {
      Object.assign(GAME_CONFIG.UI.FONTS, {
        PRIMARY: serverConstants.ui.fonts.primary,
        SECONDARY: serverConstants.ui.fonts.secondary,
      });
    }
  }

  // Network Constants
  if (serverConstants.network) {
    Object.assign(GAME_CONFIG.NETWORK, {
      POSITION_SYNC_RATE: serverConstants.network.position_sync_rate,
      MAX_INPUT_BUFFER_SIZE: serverConstants.network.max_input_buffer_size,
      INTERPOLATION_DELAY: serverConstants.network.interpolation_delay,
      MAX_BUFFER_SIZE: serverConstants.network.max_buffer_size,
    });
  }

  // Validation Constants
  if (serverConstants.validation) {
    Object.assign(GAME_CONFIG.VALIDATION, {
      POSITION_TOLERANCE: serverConstants.validation.position_tolerance,
      VELOCITY_TOLERANCE: serverConstants.validation.velocity_tolerance,
      MAX_POSITION_CHANGE_PER_MS: serverConstants.validation.max_position_change_per_ms,
      MAX_VELOCITY_CHANGE_PER_MS: serverConstants.validation.max_velocity_change_per_ms,
    });
  }

  // Player Constants
  if (serverConstants.player) {
    if (serverConstants.player.collision_box) {
      Object.assign(GAME_CONFIG.PLAYER.COLLISION_BOX, {
        WIDTH: serverConstants.player.collision_box.width,
        HEIGHT: serverConstants.player.collision_box.height,
      });
    }
    if (serverConstants.player.display_size) {
      Object.assign(GAME_CONFIG.PLAYER.DISPLAY_SIZE, {
        WIDTH: serverConstants.player.display_size.width,
        HEIGHT: serverConstants.player.display_size.height,
      });
    }
    if (serverConstants.player.radius) {
      GAME_CONFIG.PLAYER.RADIUS = serverConstants.player.radius;
    }
  }

  // Animation Constants
  if (serverConstants.animation) {
    if (serverConstants.animation.breathing_scale) {
      Object.assign(GAME_CONFIG.ANIMATION.BREATHING_SCALE, {
        SCALE_Y: serverConstants.animation.breathing_scale.scaleY,
        DURATION: serverConstants.animation.breathing_scale.duration,
      });
    }
    if (serverConstants.animation.hit_effect) {
      Object.assign(GAME_CONFIG.ANIMATION.HIT_EFFECT, {
        SCALE_Y: serverConstants.animation.hit_effect.scaleY,
        DURATION: serverConstants.animation.hit_effect.duration,
      });
    }
    if (serverConstants.animation.damage_effect) {
      Object.assign(GAME_CONFIG.ANIMATION.DAMAGE_EFFECT, {
        SCALE_Y: serverConstants.animation.damage_effect.scaleY,
        DURATION: serverConstants.animation.damage_effect.duration,
      });
    }
  }

  // Server Constants
  if (serverConstants.server) {
    Object.assign(GAME_CONFIG.SERVER, {
      PORT: serverConstants.server.port,
      FRONTEND_PORT: serverConstants.server.frontend_port,
    });
  }

  console.log('✅ Game config updated with ALL server constants');
  console.log('📊 Updated categories:', Object.keys(serverConstants));
}

export const ASSET_KEYS = {
  IMAGES: {
    LOGO: 'logo',
    BACKGROUND_MENU: 'background_menu',
    BACKGROUND_STAGE1: 'background_stage1',
    BACKGROUND_STAGE2: 'background_stage2',
    CHARACTER_DASH: 'character_dash',
    CHARACTER_REX: 'character_rex',
    CHARACTER_TITAN: 'character_titan',
    PLATFORM: 'platform',
    UI_BUTTON: 'ui_button',
    UI_BUTTON_HOVER: 'ui_button_hover',
  },
  AUDIO: {
    MENU_MUSIC: 'menu_music',
    GAME_MUSIC: 'game_music',
    SFX_JUMP: 'sfx_jump',
    SFX_ATTACK: 'sfx_attack',
    SFX_HIT: 'sfx_hit',
    SFX_BUTTON: 'sfx_button',
  },
  SPRITESHEETS: {
    DASH_SPRITES: 'dash_sprites',
    REX_SPRITES: 'rex_sprites',
    TITAN_SPRITES: 'titan_sprites',
    EFFECTS: 'effects_sprites',
  },
} as const;

export type CharacterType = keyof typeof GAME_CONFIG.CHARACTERS;
export type StageType = keyof typeof GAME_CONFIG.STAGES;
export type SceneKey =
  (typeof GAME_CONFIG.SCENE_KEYS)[keyof typeof GAME_CONFIG.SCENE_KEYS];

// Helper functions to get character stats by type
export function getCharacterStats(characterType: string) {
  const normalizedType = characterType.toUpperCase();
  
  // Map old names to new names
  let mappedType = normalizedType;
  if (normalizedType === 'FAST_LIGHTWEIGHT') mappedType = 'DASH';
  if (normalizedType === 'BALANCED_ALLROUNDER') mappedType = 'REX';
  if (normalizedType === 'HEAVY_HITTER') mappedType = 'TITAN';
  
  let character;
  switch (mappedType) {
    case 'DASH':
      character = GAME_CONFIG.CHARACTERS.DASH;
      break;
    case 'REX':
      character = GAME_CONFIG.CHARACTERS.REX;
      break;
    case 'TITAN':
      character = GAME_CONFIG.CHARACTERS.TITAN;
      break;
    default:
      throw new Error(`Unknown character type: ${characterType}`);
  }
  
  // Strict validation - no fallbacks allowed
  if (!character || !character.health || character.health === 0) {
    throw new Error(`Character stats not loaded from database for ${characterType}. Database constants must be loaded before creating players.`);
  }
  
  return character;
}
