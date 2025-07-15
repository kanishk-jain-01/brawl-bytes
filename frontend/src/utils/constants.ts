export const GAME_CONFIG = {
  SCENE_KEYS: {
    BOOT: 'BootScene',
    MENU: 'MenuScene',
    CHARACTER_SELECT: 'CharacterSelectScene',
    GAME: 'GameScene',
    LOBBY: 'LobbyScene',
    RESULT: 'ResultScene',
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
export type SceneKey = typeof GAME_CONFIG.SCENE_KEYS[keyof typeof GAME_CONFIG.SCENE_KEYS];