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
    GRAVITY: 800,
    JUMP_VELOCITY: -600,
    MOVE_SPEED: 200,
    FRICTION: 0.9,
  },

  CHARACTERS: {
    FAST_LIGHTWEIGHT: {
      name: 'Dash',
      speed: 250,
      jumpVelocity: -650,
      health: 80,
      attackDamage: 15,
      weight: 0.8,
    },
    BALANCED_ALLROUNDER: {
      name: 'Rex',
      speed: 200,
      jumpVelocity: -600,
      health: 100,
      attackDamage: 20,
      weight: 1.0,
    },
    HEAVY_HITTER: {
      name: 'Titan',
      speed: 150,
      jumpVelocity: -550,
      health: 120,
      attackDamage: 30,
      weight: 1.3,
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
    MAX_STOCKS: 3,
    MATCH_TIME: 180000, // 3 minutes in milliseconds
    RESPAWN_TIME: 2000, // 2 seconds
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
} as const;

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
