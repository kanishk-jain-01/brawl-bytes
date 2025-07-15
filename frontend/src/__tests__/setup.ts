// Jest setup file for frontend tests
import 'jest';

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
