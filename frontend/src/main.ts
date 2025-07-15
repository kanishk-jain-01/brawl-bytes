import Phaser from 'phaser';
import { BootScene } from '@/scenes/BootScene';
import { MenuScene } from '@/scenes/MenuScene';
import { CharacterSelectScene } from '@/scenes/CharacterSelectScene';
import { GameScene } from '@/scenes/GameScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 1280,
  height: 720,
  parent: 'game-container',
  backgroundColor: '#2c3e50',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 800 },
      debug: process.env.NODE_ENV === 'development',
      fps: 60,
    },
  },
  scene: [BootScene, MenuScene, CharacterSelectScene, GameScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    min: {
      width: 800,
      height: 600,
    },
    max: {
      width: 1920,
      height: 1080,
    },
  },
  render: {
    pixelArt: false,
    antialias: true,
    powerPreference: 'high-performance',
  },
  audio: {
    disableWebAudio: false,
  },
  dom: {
    createContainer: true,
  },
  fps: {
    target: 60,
    forceSetTimeOut: true,
  },
};

const game = new Phaser.Game(config);

if (process.env.NODE_ENV === 'development') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).game = game;
}

export default game;
