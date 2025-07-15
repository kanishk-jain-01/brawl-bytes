/*
 * Main Game Entry Point
 * ---------------------
 * This file initializes the Phaser game engine and sets up the core game configuration.
 * It defines the game window dimensions, physics settings, scene order, and rendering options.
 * The game starts by loading the BootScene, which handles asset loading and transitions to the MenuScene.
 */

import Phaser from 'phaser';
import { BootScene } from '@/scenes/BootScene';
import { MenuScene } from '@/scenes/MenuScene';
import { CharacterSelectScene } from '@/scenes/CharacterSelectScene';
import { GameScene } from '@/scenes/GameScene';
import { GAME_CONFIG, updateGameConfig } from '@/utils/constants';

/**
 * Load game constants from server (required for game to function)
 */
async function loadGameConstants(): Promise<void> {
  const apiUrl =
    (import.meta.env?.VITE_API_URL as string) || 'http://localhost:3001';

  const response = await fetch(`${apiUrl}/api/constants`);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch constants: ${response.status} ${response.statusText}`
    );
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error('API returned error response');
  }

  updateGameConfig(result.data);
  console.log('✅ Loaded constants from server');
}

/**
 * Initialize game with server constants
 */
async function initializeGame(): Promise<Phaser.Game> {
  console.log('🎮 Starting Brawl Bytes...');

  // Show loading indicator
  showLoadingIndicator('Fetching game configuration...');

  try {
    // Load constants from server
    await loadGameConstants();

    // Update loading indicator
    showLoadingIndicator('Starting game engine...');

    // Create Phaser config with updated constants
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 1280,
      height: 720,
      parent: 'game-container',
      backgroundColor: '#2c3e50',
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { x: 0, y: GAME_CONFIG.PHYSICS.GRAVITY },
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

    // Create the game
    const game = new Phaser.Game(config);

    // Hide loading indicator
    hideLoadingIndicator();

    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).game = game;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).gameConfig = GAME_CONFIG;
    }

    console.log('✅ Brawl Bytes initialized successfully!');
    return game;
  } catch (error) {
    console.error('❌ Failed to initialize game:', error);

    // Check if it's a constants loading error
    if (error instanceof Error && error.message.includes('constants')) {
      showErrorMessage(
        'Unable to connect to game server. Please check your connection and try again.'
      );
    } else {
      showErrorMessage('Failed to initialize game. Please refresh the page.');
    }

    throw error;
  }
}

/**
 * Show loading indicator
 */
function showLoadingIndicator(message: string): void {
  let loader = document.getElementById('game-loader');
  if (!loader) {
    loader = document.createElement('div');
    loader.id = 'game-loader';
    loader.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: #2c3e50;
      color: white;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      z-index: 9999;
      font-family: Arial, sans-serif;
    `;
    document.body.appendChild(loader);
  }

  loader.innerHTML = `
    <div style="text-align: center;">
      <h2 style="margin-bottom: 20px;">🥊 Brawl Bytes</h2>
      <div style="margin-bottom: 20px;">
        <div style="border: 3px solid #f3f3f3; border-top: 3px solid #3498db; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto;"></div>
      </div>
      <p>${message}</p>
    </div>
    <style>
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    </style>
  `;
}

/**
 * Hide loading indicator
 */
function hideLoadingIndicator(): void {
  const loader = document.getElementById('game-loader');
  if (loader) {
    loader.remove();
  }
}

/**
 * Show error message
 */
function showErrorMessage(message: string): void {
  const loader = document.getElementById('game-loader');
  if (loader) {
    loader.innerHTML = `
      <div style="text-align: center; color: #e74c3c;">
        <h2 style="margin-bottom: 20px;">🥊 Brawl Bytes</h2>
        <h3 style="margin-bottom: 20px; color: #e74c3c;">❌ Connection Error</h3>
        <p style="margin-bottom: 30px; max-width: 400px; margin-left: auto; margin-right: auto; line-height: 1.5;">${message}</p>
        <div style="margin-bottom: 20px;">
          <p style="font-size: 14px; color: #bdc3c7;">Make sure the backend server is running on port 4000</p>
        </div>
        <button onclick="window.location.reload()" style="
          margin-top: 20px;
          padding: 12px 24px;
          background: #3498db;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 16px;
          font-weight: bold;
        ">Try Again</button>
      </div>
    `;
  }
}

// Initialize the game
let game: Phaser.Game | undefined;
initializeGame()
  .then(gameInstance => {
    game = gameInstance;
  })
  .catch(error => {
    console.error('Game initialization failed:', error);
  });

export default game;
