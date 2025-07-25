/*
 * Game Constants - Database Driven Configuration
 * ===============================================
 * This file now serves as a runtime container for constants loaded from the database.
 * All actual values are fetched from the server's /api/constants endpoint on startup.
 *
 * The GAME_CONFIG object starts empty and gets populated by updateGameConfig().
 * If constants fail to load, the application will throw errors (fail-fast behavior).
 *
 * To update game configuration:
 * 1. Edit game-constants-master.yaml in the project root
 * 2. Run `npm run sync-constants` in the backend
 * 3. Restart the game - new constants will be loaded automatically
 */

export const GAME_CONFIG = {
  // Scene identifiers - loaded from database
  SCENE_KEYS: {} as Record<string, string>,

  // Physics constants - loaded from database
  PHYSICS: {} as {
    GRAVITY: number;
    JUMP_VELOCITY: number;
    DOUBLE_JUMP_VELOCITY: number;
    MOVE_SPEED: number;
    MAX_VELOCITY: number;
    MAX_ACCELERATION: number;
    FRICTION: number;
    AIR_RESISTANCE: number;
    BOUNCE_FACTOR: number;
    WALKING_THRESHOLD: number;
    DOUBLE_JUMP_MULTIPLIER: number;
    WORLD_BOUNDS: {
      WIDTH: number;
      HEIGHT: number;
      MIN_X: number;
      MAX_X: number;
      MIN_Y: number;
      MAX_Y: number;
      DEATH_ZONE_Y: number;
    };
  },

  // Combat mechanics - loaded from database
  DAMAGE: {} as {
    FALL_DAMAGE: number;
    MAX_DAMAGE_PER_HIT: number;
    MIN_DAMAGE_PER_HIT: number;
    CRITICAL_MULTIPLIER: number;
    CRITICAL_CHANCE: number;
  },

  // Timing constants - loaded from database
  TIMING: {} as {
    ATTACK_COOLDOWN: number;
    INVULNERABILITY_DURATION: number;
    CRITICAL_INVULNERABILITY_DURATION: number;
    RESPAWN_INVULNERABILITY: number;
    FLASH_INTERVAL: number;
    MAX_COMBO_TIME: number;
  },

  // Combat ranges - loaded from database
  COMBAT: {} as {
    ATTACK_RANGE: number;
    MAX_KNOCKBACK_VELOCITY: number;
  },

  // Character definitions - loaded from database via Character API
  CHARACTERS: {} as Record<
    string,
    {
      name: string;
      speed: number;
      jumpVelocity: number;
      health: number;
      attackDamage: number;
      weight: number;
    }
  >,

  // Stage configurations - loaded from database via Stage API
  STAGES: {} as Record<
    string,
    {
      name: string;
      description: string;
      difficulty: string;
      platforms: Array<{ x: number; y: number; width: number; height: number }>;
      hazards: Array<{
        type: string;
        x: number;
        y: number;
        width: number;
        height: number;
      }>;
      backgroundColor: { top: number; bottom: number };
    }
  >,

  // Game rules - loaded from database
  GAME: {} as {
    MAX_STOCKS: number;
    MATCH_TIME: number;
    RESPAWN_TIME: number;
    MAX_PLAYERS: number;
  },

  // Network settings - loaded from database
  NETWORK: {} as {
    POSITION_SYNC_RATE: number;
    MAX_INPUT_BUFFER_SIZE: number;
    INTERPOLATION_DELAY: number;
    MAX_BUFFER_SIZE: number;
  },

  // Validation tolerances - loaded from database
  VALIDATION: {} as {
    POSITION_TOLERANCE: number;
    VELOCITY_TOLERANCE: number;
    MAX_POSITION_CHANGE_PER_MS: number;
    MAX_VELOCITY_CHANGE_PER_MS: number;
  },

  // Player entity config - loaded from database
  PLAYER: {} as {
    COLLISION_BOX: { WIDTH: number; HEIGHT: number };
    DISPLAY_SIZE: { WIDTH: number; HEIGHT: number };
    RADIUS: number;
  },

  // Animation settings - loaded from database
  ANIMATION: {} as {
    BREATHING_SCALE: { SCALE_Y: number; DURATION: number };
    HIT_EFFECT: { SCALE_Y: number; DURATION: number };
    DAMAGE_EFFECT: { SCALE_Y: number; DURATION: number };
  },

  // Server configuration - loaded from database
  SERVER: {} as {
    PORT: number;
    FRONTEND_PORT: number;
  },

  // UI styling - loaded from database
  UI: {} as {
    COLORS: {
      PRIMARY: string;
      SECONDARY: string;
      SUCCESS: string;
      DANGER: string;
      WARNING: string;
      TEXT: string;
      TEXT_SECONDARY: string;
      // Character colors for sprite tinting
      CHARACTER_DASH: string;
      CHARACTER_REX: string;
      CHARACTER_TITAN: string;
      CHARACTER_NINJA: string;
    };
    FONTS: {
      PRIMARY: string;
      SECONDARY: string;
    };
  },
};

/**
 * Asset keys and paths - loaded from database
 * All asset identifiers for images, audio, and spritesheets
 */
export const ASSET_KEYS = {
  IMAGES: {} as Record<string, string>,
  AUDIO: {} as Record<string, string>,
  SPRITESHEETS: {} as Record<string, string>,
};

/**
 * Asset paths - loaded from database
 * All asset file paths for consistent loading
 */
export const ASSET_PATHS = {
  VIDEOS: {} as Record<string, string>,
  SPRITESHEETS: {} as Record<string, string>,
  CARDS: {} as Record<string, string>,
};

/**
 * Update GAME_CONFIG with server constants from database
 * This function is called during game initialization after fetching /api/constants
 */
export function updateGameConfig(serverConstants: any): void {
  console.log('🔄 Updating game config from database constants...');

  // Scene Keys
  if (serverConstants.scenes) {
    GAME_CONFIG.SCENE_KEYS = {
      BOOT: serverConstants.scenes.boot,
      MENU: serverConstants.scenes.menu,
      CHARACTER_SELECT: serverConstants.scenes.character_select,
      STAGE_SELECT: serverConstants.scenes.stage_select,
      GAME: serverConstants.scenes.game,
      RESULT: serverConstants.scenes.result,
      LOBBY: serverConstants.scenes.lobby,
    };
  }

  // Asset Keys
  if (serverConstants.assets) {
    ASSET_KEYS.IMAGES = {
      LOGO: serverConstants.assets.images_logo,
      BACKGROUND_MENU: serverConstants.assets.images_background_menu,
      BACKGROUND_STAGE1: serverConstants.assets.images_background_stage1,
      BACKGROUND_STAGE2: serverConstants.assets.images_background_stage2,
      BACKGROUND_STAGE3: serverConstants.assets.images_background_stage3,
      CHARACTER_DASH: serverConstants.assets.images_character_dash,
      CHARACTER_REX: serverConstants.assets.images_character_rex,
      CHARACTER_TITAN: serverConstants.assets.images_character_titan,
      CHARACTER_NINJA: serverConstants.assets.images_character_ninja,
      DASH_CARD: serverConstants.assets.images_dash_card,
      NINJA_CARD: serverConstants.assets.images_ninja_card,
      REX_CARD: serverConstants.assets.images_rex_card,
      TITAN_CARD: serverConstants.assets.images_titan_card,
      PLATFORM: serverConstants.assets.images_platform,
      UI_BUTTON: serverConstants.assets.images_ui_button,
      UI_BUTTON_HOVER: serverConstants.assets.images_ui_button_hover,
      HEALTH_BAR: serverConstants.assets.images_health_bar,
      ENERGY_BAR: serverConstants.assets.images_energy_bar,
    };

    ASSET_KEYS.AUDIO = {
      MENU_MUSIC: serverConstants.assets.audio_menu_music,
      GAME_MUSIC: serverConstants.assets.audio_game_music,
      BATTLE_THEME: serverConstants.assets.audio_battle_theme,
      SKY_THEME: serverConstants.assets.audio_sky_theme,
      VOLCANO_THEME: serverConstants.assets.audio_volcano_theme,
      SFX_JUMP: serverConstants.assets.audio_sfx_jump,
      SFX_ATTACK: serverConstants.assets.audio_sfx_attack,
      SFX_HIT: serverConstants.assets.audio_sfx_hit,
      SFX_BUTTON: serverConstants.assets.audio_sfx_button,
      SFX_VICTORY: serverConstants.assets.audio_sfx_victory,
      SFX_DEFEAT: serverConstants.assets.audio_sfx_defeat,
    };

    ASSET_KEYS.SPRITESHEETS = {
      DASH_SPRITES: serverConstants.assets.spritesheets_dash_sprites,
      REX_SPRITES: serverConstants.assets.spritesheets_rex_sprites,
      TITAN_SPRITES: serverConstants.assets.spritesheets_titan_sprites,
      NINJA_SPRITES: serverConstants.assets.spritesheets_ninja_sprites,
      EFFECTS: serverConstants.assets.spritesheets_effects,
      UI_ELEMENTS: serverConstants.assets.spritesheets_ui_elements,
    };
  }

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

    GAME_CONFIG.PHYSICS.WORLD_BOUNDS = {
      WIDTH: serverConstants.physics.world_bounds_width,
      HEIGHT: serverConstants.physics.world_bounds_height,
      MIN_X: serverConstants.physics.world_bounds_min_x,
      MAX_X: serverConstants.physics.world_bounds_max_x,
      MIN_Y: serverConstants.physics.world_bounds_min_y,
      MAX_Y: serverConstants.physics.world_bounds_max_y,
      DEATH_ZONE_Y: serverConstants.physics.world_bounds_death_zone_y,
    };
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
      CRITICAL_INVULNERABILITY_DURATION:
        serverConstants.combat.critical_invulnerability_duration,
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

  // UI Constants
  if (serverConstants.ui) {
    GAME_CONFIG.UI.COLORS = {
      PRIMARY: serverConstants.ui.colors_primary,
      SECONDARY: serverConstants.ui.colors_secondary,
      SUCCESS: serverConstants.ui.colors_success,
      DANGER: serverConstants.ui.colors_danger,
      WARNING: serverConstants.ui.colors_warning,
      TEXT: serverConstants.ui.colors_text,
      TEXT_SECONDARY: serverConstants.ui.colors_text_secondary,
      // Character colors for sprite tinting
      CHARACTER_DASH: serverConstants.ui.colors_character_dash,
      CHARACTER_REX: serverConstants.ui.colors_character_rex,
      CHARACTER_TITAN: serverConstants.ui.colors_character_titan,
      CHARACTER_NINJA: serverConstants.ui.colors_character_ninja,
    };

    GAME_CONFIG.UI.FONTS = {
      PRIMARY: serverConstants.ui.fonts_primary,
      SECONDARY: serverConstants.ui.fonts_secondary,
    };
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
      MAX_POSITION_CHANGE_PER_MS:
        serverConstants.validation.max_position_change_per_ms,
      MAX_VELOCITY_CHANGE_PER_MS:
        serverConstants.validation.max_velocity_change_per_ms,
    });
  }

  // Player Constants
  if (serverConstants.player) {
    GAME_CONFIG.PLAYER.COLLISION_BOX = {
      WIDTH: serverConstants.player.collision_box_width,
      HEIGHT: serverConstants.player.collision_box_height,
    };

    GAME_CONFIG.PLAYER.DISPLAY_SIZE = {
      WIDTH: serverConstants.player.display_size_width,
      HEIGHT: serverConstants.player.display_size_height,
    };

    GAME_CONFIG.PLAYER.RADIUS = serverConstants.player.radius;
  }

  // Animation Constants
  if (serverConstants.animation) {
    GAME_CONFIG.ANIMATION.BREATHING_SCALE = {
      SCALE_Y: serverConstants.animation.breathing_scale_scale_y,
      DURATION: serverConstants.animation.breathing_scale_duration,
    };

    GAME_CONFIG.ANIMATION.HIT_EFFECT = {
      SCALE_Y: serverConstants.animation.hit_effect_scale_y,
      DURATION: serverConstants.animation.hit_effect_duration,
    };

    GAME_CONFIG.ANIMATION.DAMAGE_EFFECT = {
      SCALE_Y: serverConstants.animation.damage_effect_scale_y,
      DURATION: serverConstants.animation.damage_effect_duration,
    };
  }

  // Server Constants
  if (serverConstants.server) {
    Object.assign(GAME_CONFIG.SERVER, {
      PORT: serverConstants.server.port,
      FRONTEND_PORT: serverConstants.server.frontend_port,
    });
  }

  // Asset Paths
  if (serverConstants.asset_paths) {
    ASSET_PATHS.VIDEOS = {
      JUNGLE_CANOPY: serverConstants.asset_paths.jungle_canopy,
      ANCIENT_COLOSSEUM: serverConstants.asset_paths.ancient_colosseum,
      MAP_TABLE: serverConstants.asset_paths.map_table,
      JUNGLE_CLEARING: serverConstants.asset_paths.jungle_clearing,
    };

    ASSET_PATHS.SPRITESHEETS = {
      DASH: serverConstants.asset_paths.dash_spritesheet,
      REX: serverConstants.asset_paths.rex_spritesheet,
      NINJA: serverConstants.asset_paths.ninja_spritesheet,
      TITAN: serverConstants.asset_paths.titan_spritesheet,
    };

    ASSET_PATHS.CARDS = {
      DASH: serverConstants.asset_paths.dash_card,
      REX: serverConstants.asset_paths.rex_card,
      NINJA: serverConstants.asset_paths.ninja_card,
      TITAN: serverConstants.asset_paths.titan_card,
    };
  }

  console.log('✅ Game config updated with ALL database constants');
  console.log('📊 Updated categories:', Object.keys(serverConstants));
}

/**
 * Load characters from database API
 */
export async function loadCharacters(): Promise<void> {
  try {
    const response = await fetch('/api/characters');
    if (!response.ok) {
      throw new Error(`Failed to load characters: ${response.statusText}`);
    }

    const characters = await response.json();

    // Convert database character format to GAME_CONFIG format
    GAME_CONFIG.CHARACTERS = {};
    characters.forEach((char: any) => {
      GAME_CONFIG.CHARACTERS[char.id.toUpperCase()] = {
        name: char.name,
        speed: char.stats.speed,
        jumpVelocity: char.stats.jump_velocity,
        health: char.stats.health,
        attackDamage: char.stats.attack_damage,
        weight: char.stats.weight,
      };
    });

    console.log(`✅ Loaded ${characters.length} characters from database`);
  } catch (error) {
    throw new Error(
      `CRITICAL: Failed to load characters from database: ${error}`
    );
  }
}

/**
 * Load stages from database API
 */
export async function loadStages(): Promise<void> {
  try {
    const response = await fetch('/api/stages');
    if (!response.ok) {
      throw new Error(`Failed to load stages: ${response.statusText}`);
    }

    const stages = await response.json();

    // Convert database stage format to GAME_CONFIG format
    GAME_CONFIG.STAGES = {};
    stages.forEach((stage: any) => {
      GAME_CONFIG.STAGES[stage.id.toUpperCase()] = {
        name: stage.name,
        description: stage.description,
        difficulty: stage.config.difficulty,
        platforms: stage.config.platforms,
        hazards: stage.config.hazards,
        backgroundColor: stage.config.background_colors,
      };
    });

    console.log(`✅ Loaded ${stages.length} stages from database`);
  } catch (error) {
    throw new Error(`CRITICAL: Failed to load stages from database: ${error}`);
  }
}

export type CharacterType = keyof typeof GAME_CONFIG.CHARACTERS;
export type StageType = keyof typeof GAME_CONFIG.STAGES;
export type SceneKey = string;

// Helper functions to get character stats by type
export function getCharacterStats(characterType: string) {
  const normalizedType = characterType.toUpperCase();

  const character = GAME_CONFIG.CHARACTERS[normalizedType];

  // Strict validation - no fallbacks allowed
  if (!character || !character.health || character.health === 0) {
    throw new Error(
      `Character stats not loaded from database for ${characterType}. Database constants must be loaded before creating players.`
    );
  }

  return character;
}

/**
 * Initialize all constants from database
 * This function must be called before the game starts
 */
export async function initializeConstants(): Promise<void> {
  console.log('🔄 Initializing all constants from database...');

  try {
    // Load game constants
    const response = await fetch('/api/constants');
    if (!response.ok) {
      throw new Error(`Failed to load constants: ${response.statusText}`);
    }

    const apiResponse = await response.json();
    if (!apiResponse.success || !apiResponse.data) {
      throw new Error('Invalid constants response from server');
    }
    updateGameConfig(apiResponse.data);

    // Load characters and stages
    await Promise.all([loadCharacters(), loadStages()]);

    console.log('✅ All constants initialized successfully');
    console.log('🎮 Game is ready to start with database-driven configuration');
  } catch (error) {
    console.error('❌ CRITICAL ERROR: Failed to initialize constants:', error);
    throw new Error(`Game cannot start without database constants: ${error}`);
  }
}

/**
 * UI Color Utility Functions
 * --------------------------
 * Helper functions for accessing database-driven UI colors with fail-fast validation
 */

/**
 * Convert hex color string to numeric value for Phaser
 * @param hexColor - Color string like "#ff0000"
 * @returns Numeric color value like 0xff0000
 */
function hexToNumber(hexColor: string): number {
  return parseInt(hexColor.replace('#', '0x'), 16);
}

/**
 * Get numeric UI color with fail-fast validation
 * @param colorKey - Key from GAME_CONFIG.UI.COLORS
 * @returns Numeric color value for Phaser
 */
function getUIColor(colorKey: keyof typeof GAME_CONFIG.UI.COLORS): number {
  if (!GAME_CONFIG.UI.COLORS || !GAME_CONFIG.UI.COLORS[colorKey]) {
    throw new Error(
      `UI color '${colorKey}' not loaded from database. Check server connection and constants loading.`
    );
  }
  return hexToNumber(GAME_CONFIG.UI.COLORS[colorKey]);
}

/**
 * Get hex UI color string with fail-fast validation
 * @param colorKey - Key from GAME_CONFIG.UI.COLORS
 * @returns Hex color string like "#ff0000"
 */
function getUIColorHex(colorKey: keyof typeof GAME_CONFIG.UI.COLORS): string {
  if (!GAME_CONFIG.UI.COLORS || !GAME_CONFIG.UI.COLORS[colorKey]) {
    throw new Error(
      `UI color '${colorKey}' not loaded from database. Check server connection and constants loading.`
    );
  }
  return GAME_CONFIG.UI.COLORS[colorKey];
}

/**
 * UI Colors proxy for easy access to database-driven colors
 */
export const UI_COLORS = {
  // Numeric colors for Phaser methods
  PRIMARY: () => getUIColor('PRIMARY'),
  SECONDARY: () => getUIColor('SECONDARY'),
  SUCCESS: () => getUIColor('SUCCESS'),
  DANGER: () => getUIColor('DANGER'),
  WARNING: () => getUIColor('WARNING'),
  TEXT: () => getUIColor('TEXT'),
  TEXT_SECONDARY: () => getUIColor('TEXT_SECONDARY'),

  // Hex colors for CSS and text styling
  PRIMARY_HEX: () => getUIColorHex('PRIMARY'),
  SECONDARY_HEX: () => getUIColorHex('SECONDARY'),
  SUCCESS_HEX: () => getUIColorHex('SUCCESS'),
  DANGER_HEX: () => getUIColorHex('DANGER'),
  WARNING_HEX: () => getUIColorHex('WARNING'),
  TEXT_HEX: () => getUIColorHex('TEXT'),
  TEXT_SECONDARY_HEX: () => getUIColorHex('TEXT_SECONDARY'),
  // Character colors for sprite tinting
  CHARACTER_DASH: () => getUIColor('CHARACTER_DASH'),
  CHARACTER_REX: () => getUIColor('CHARACTER_REX'),
  CHARACTER_TITAN: () => getUIColor('CHARACTER_TITAN'),
  CHARACTER_NINJA: () => getUIColor('CHARACTER_NINJA'),
};
