// Jest setup file for frontend tests
import 'jest';

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

    constructor(_config: any = {}) {
      // Minimal mock of properties accessed in tests
      this.sys = {};
      this.game = {};
      this.registry = { get: jest.fn(), set: jest.fn() } as any;
      this.cameras = { main: {} } as any;
      this.scene = {} as any;
    }

    preload() {}

    create() {}

    update() {}
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
    constructor(_config?: any) {}

    preload() {}

    create() {}

    update() {}
  },
  Game: class MockGame {
    constructor(_config: any) {}
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
