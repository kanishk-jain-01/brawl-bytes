// Jest setup file for frontend tests
/* eslint-disable max-classes-per-file, class-methods-use-this */
import 'jest';

// ---------------------------------------------------------------------------
// Mock GAME_CONFIG values so tests relying on constants work with the new
// database-driven setup. These values are lightweight stand-ins and ONLY used
// inside Jest – they never reach the production bundle.
// ---------------------------------------------------------------------------
import { GAME_CONFIG } from '../utils/constants';

// ---------------------------------------------------------------------------
// Mock the Phaser module so importing scenes doesn't pull in the entire engine
// (and its optional peer deps like phaser3spectorjs). We expose only the parts
// our tests interact with.
// ---------------------------------------------------------------------------

jest.mock('phaser', () => {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  class MockScene {
    public sys: any;

    public game: any;

    public registry: any;

    public cameras: any;

    public scene: any;

    constructor(config: any = {}) {
      // Minimal mock of properties accessed in tests
      this.sys = {};
      this.game = {};
      this.registry = { get: jest.fn(), set: jest.fn() } as any;
      this.cameras = { main: {} } as any;
      this.scene = {} as any;
      // Use config to avoid unused var warning
      if (config) {
        Object.assign(this, config);
      }
    }

    preload() {
      // Mock method - no implementation needed
    }

    create() {
      // Mock method - no implementation needed
    }

    update() {
      // Mock method - no implementation needed
    }
  }

  const PhaserStub = {
    AUTO: 'AUTO',
    Scene: MockScene,
    Scale: {
      FIT: 'FIT',
      CENTER_BOTH: 'CENTER_BOTH',
    },
    Math: {
      Between: jest.fn(() => 0),
      FloatBetween: jest.fn(() => 0),
    },
  } as any;

  return {
    __esModule: true,
    default: PhaserStub,
    ...PhaserStub,
  };
});

// Mock Phaser globally
global.Phaser = {
  Scene: class MockScene {
    constructor(config?: any) {
      // Use config to avoid unused var warning
      if (config) {
        Object.assign(this, config);
      }
    }

    preload() {
      // Mock method - no implementation needed
    }

    create() {
      // Mock method - no implementation needed
    }

    update() {
      // Mock method - no implementation needed
    }
  },
  Game: class MockGame {
    constructor(config: any) {
      // Use config to avoid unused var warning
      if (config) {
        Object.assign(this, config);
      }
    }
  },
  AUTO: 'AUTO',
  Scale: {
    FIT: 'FIT',
    CENTER_BOTH: 'CENTER_BOTH',
  },
} as any;

// Mock Canvas API
Object.defineProperty(window, 'HTMLCanvasElement', {
  value: class MockCanvas {
    getContext() {
      return {
        fillRect: jest.fn(),
        clearRect: jest.fn(),
        getImageData: jest.fn(() => ({ data: new Uint8ClampedArray() })),
        putImageData: jest.fn(),
        createImageData: jest.fn(() => ({ data: new Uint8ClampedArray() })),
        setTransform: jest.fn(),
        drawImage: jest.fn(),
        save: jest.fn(),
        restore: jest.fn(),
        beginPath: jest.fn(),
        moveTo: jest.fn(),
        lineTo: jest.fn(),
        closePath: jest.fn(),
        stroke: jest.fn(),
        fill: jest.fn(),
      };
    }

    toDataURL() {
      return '';
    }
  },
});

// Mock WebGL context
Object.defineProperty(window, 'WebGLRenderingContext', {
  value: class MockWebGLContext {},
});

// Mock requestAnimationFrame
global.requestAnimationFrame = (callback: FrameRequestCallback) => {
  return setTimeout(callback, 16) as any;
};

global.cancelAnimationFrame = (id: number) => {
  clearTimeout(id);
};

// Populate physics & gameplay constants
Object.assign(GAME_CONFIG, {
  // Scene keys are rarely used in unit-tests
  SCENE_KEYS: {
    BOOT: 'BOOT',
    MENU: 'MENU',
    CHARACTER_SELECT: 'CHARACTER_SELECT',
    STAGE_SELECT: 'STAGE_SELECT',
    GAME: 'GAME',
    RESULT: 'RESULT',
    LOBBY: 'LOBBY',
  },
  PHYSICS: {
    GRAVITY: 1000,
    JUMP_VELOCITY: -400,
    DOUBLE_JUMP_VELOCITY: -350,
    MOVE_SPEED: 200,
    MAX_VELOCITY: 500,
    MAX_ACCELERATION: 1500,
    FRICTION: 0.1,
    AIR_RESISTANCE: 0.05,
    BOUNCE_FACTOR: 0.2,
    WALKING_THRESHOLD: 50,
    DOUBLE_JUMP_MULTIPLIER: 0.8,
    WORLD_BOUNDS: {
      WIDTH: 2000,
      HEIGHT: 1200,
      MIN_X: 0,
      MAX_X: 2000,
      MIN_Y: 0,
      MAX_Y: 1200,
      DEATH_ZONE_Y: 1400,
    },
  },
  DAMAGE: {
    FALL_DAMAGE: 10,
    MAX_DAMAGE_PER_HIT: 50,
    MIN_DAMAGE_PER_HIT: 5,
    CRITICAL_MULTIPLIER: 2,
    CRITICAL_CHANCE: 0.1,
  },
  TIMING: {
    ATTACK_COOLDOWN: 500,
    INVULNERABILITY_DURATION: 1000,
    CRITICAL_INVULNERABILITY_DURATION: 1500,
    RESPAWN_INVULNERABILITY: 2000,
    FLASH_INTERVAL: 100,
    MAX_COMBO_TIME: 1500,
  },
  COMBAT: {
    ATTACK_RANGE: 50,
    MAX_KNOCKBACK_VELOCITY: 600,
  },
  GAME: {
    MAX_STOCKS: 3,
    MATCH_TIME: 300,
    RESPAWN_TIME: 3000,
    MAX_PLAYERS: 4,
  },
  NETWORK: {
    POSITION_SYNC_RATE: 50,
    MAX_INPUT_BUFFER_SIZE: 60,
    INTERPOLATION_DELAY: 100,
    MAX_BUFFER_SIZE: 120,
  },
  VALIDATION: {
    POSITION_TOLERANCE: 5,
    VELOCITY_TOLERANCE: 5,
    MAX_POSITION_CHANGE_PER_MS: 1,
    MAX_VELOCITY_CHANGE_PER_MS: 1,
  },
  PLAYER: {
    COLLISION_BOX: { WIDTH: 50, HEIGHT: 70 },
    DISPLAY_SIZE: { WIDTH: 50, HEIGHT: 100 },
    RADIUS: 25,
  },
  CHARACTERS: {
    REX: {
      name: 'Balanced All-rounder',
      speed: 200,
      jumpVelocity: -400,
      health: 100,
      attackDamage: 10,
      weight: 1.0,
    },
    TITAN: {
      name: 'Heavy Hitter',
      speed: 150,
      jumpVelocity: -350,
      health: 120,
      attackDamage: 15,
      weight: 1.5,
    },
    DASH: {
      name: 'Fast Lightweight',
      speed: 250,
      jumpVelocity: -450,
      health: 80,
      attackDamage: 8,
      weight: 0.8,
    },
  },
  STAGES: {
    BATTLE_ARENA: {
      name: 'Battle Arena',
      description: 'Standard competitive stage',
      difficulty: 'Easy',
      platforms: [
        { x: 600, y: 700, width: 2, height: 0.5 },
        { x: 400, y: 500, width: 1.5, height: 0.5 },
        { x: 800, y: 500, width: 1.5, height: 0.5 },
      ],
      hazards: [],
      backgroundColor: { top: 0x87ceeb, bottom: 0x1e90ff },
    },
    FLOATING_ISLANDS: {
      name: 'Floating Islands',
      description: 'Platforms in the sky',
      difficulty: 'Medium',
      platforms: [
        { x: 300, y: 600, width: 1, height: 0.5 },
        { x: 600, y: 400, width: 1, height: 0.5 },
        { x: 900, y: 600, width: 1, height: 0.5 },
      ],
      hazards: [],
      backgroundColor: { top: 0xf0e68c, bottom: 0xffd700 },
    },
    VOLCANIC_CHAMBER: {
      name: 'Volcanic Chamber',
      description: "Watch your step – it's hot!",
      difficulty: 'Hard',
      platforms: [{ x: 600, y: 650, width: 2, height: 0.5 }],
      hazards: [{ type: 'lava', x: 0, y: 1050, width: 2000, height: 150 }],
      backgroundColor: { top: 0x8b0000, bottom: 0x4b0082 },
    },
  },
  UI: {
    COLORS: {
      PRIMARY: '#ffffff',
      SECONDARY: '#cccccc',
      SUCCESS: '#00ff00',
      DANGER: '#ff0000',
      WARNING: '#ffff00',
      TEXT: '#000000',
      TEXT_SECONDARY: '#333333',
    },
    FONTS: {
      PRIMARY: 'Arial',
      SECONDARY: 'Verdana',
    },
  },
  // Animation constants required for visual feedback tests
  ANIMATION: {
    BREATHING_SCALE: { SCALE_Y: 1.05, DURATION: 5000 },
    HIT_EFFECT: { SCALE_Y: 1.2, DURATION: 200 },
    DAMAGE_EFFECT: { SCALE_Y: 0.9, DURATION: 200 },
  },
} as any);

// Ensure the runtime sees the populated config immediately
console.info('\u2705 Mock GAME_CONFIG populated for Jest');

// Alias database identifiers to legacy identifiers for character mapping
GAME_CONFIG.CHARACTERS.REX = GAME_CONFIG.CHARACTERS.REX;
GAME_CONFIG.CHARACTERS.DASH = GAME_CONFIG.CHARACTERS.DASH;
GAME_CONFIG.CHARACTERS.TITAN = GAME_CONFIG.CHARACTERS.TITAN;
