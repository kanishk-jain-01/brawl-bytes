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
import { StageSelectScene } from '@/scenes/StageSelectScene';
import { PreMatchLobbyScene } from '@/scenes/PreMatchLobbyScene';
import { GameScene } from '@/scenes/GameScene';
import { GAME_CONFIG, initializeConstants, UI_COLORS } from '@/utils/constants';

/**
 * Load all game constants, characters, and stages from database
 */
async function loadGameConstants(): Promise<void> {
  // Set API base URL for fetch requests
  const apiUrl =
    (import.meta.env?.VITE_API_URL as string) || 'http://localhost:3001';

  // Override fetch to use the API URL for relative paths
  const originalFetch = window.fetch;
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input === 'string' && input.startsWith('/api/')) {
      input = `${apiUrl}${input}`;
    }
    return originalFetch(input, init);
  };

  try {
    await initializeConstants();
    console.log('✅ All constants loaded from database');
  } finally {
    // Restore original fetch
    window.fetch = originalFetch;
  }
}

/**
 * Initialize game with server constants
 */
async function initializeGame(): Promise<Phaser.Game> {
  console.log('🎮 Starting Brawl Bytes...');

  try {
    // Update loading indicator
    // eslint-disable-next-line no-use-before-define
    showLoadingIndicator('Loading game configuration from database...');

    // Load all constants, characters, and stages from database
    await loadGameConstants();

    // Update loading indicator with database colors now that constants are loaded
    // eslint-disable-next-line no-use-before-define
    updateLoaderColors();
    
    // Update loading indicator
    // eslint-disable-next-line no-use-before-define
    showLoadingIndicator('Starting game engine...');

    // Create Phaser config with updated constants
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 1280,
      height: 720,
      parent: 'game-container',
      backgroundColor: UI_COLORS.SECONDARY_HEX(),
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { x: 0, y: GAME_CONFIG.PHYSICS.GRAVITY },
          debug: process.env.NODE_ENV === 'development',
          fps: 60,
        },
      },
      scene: [
        BootScene,
        MenuScene,
        CharacterSelectScene,
        StageSelectScene,
        PreMatchLobbyScene,
        GameScene,
      ],
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

    // Now that constants are loaded, create the game with scenes
    const game = new Phaser.Game(config);

    // Hide loading indicator
    // eslint-disable-next-line no-use-before-define
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
      // eslint-disable-next-line no-use-before-define
      showErrorMessage(
        'Unable to connect to game server. Please check your connection and try again.'
      );
    } else {
      // eslint-disable-next-line no-use-before-define
      showErrorMessage('Failed to initialize game. Please refresh the page.');
    }

    throw error;
  }
}

/**
 * Fallback colors for loader (before database constants are loaded)
 */
const LOADER_FALLBACK_COLORS = {
  BACKGROUND: '#2c3e50',
  PRIMARY: '#3498db', 
  DANGER: '#e74c3c',
  TEXT_SECONDARY: '#bdc3c7',
  WHITE: '#f3f3f3',
};

/**
 * Get color for loader - uses fallback if constants not loaded yet
 */
function getLoaderColor(type: keyof typeof LOADER_FALLBACK_COLORS): string {
  try {
    // Try to use database colors if loaded
    switch (type) {
      case 'BACKGROUND': return UI_COLORS.SECONDARY_HEX();
      case 'PRIMARY': return UI_COLORS.PRIMARY_HEX(); 
      case 'DANGER': return UI_COLORS.DANGER_HEX();
      case 'TEXT_SECONDARY': return UI_COLORS.TEXT_SECONDARY_HEX();
      case 'WHITE': return UI_COLORS.PRIMARY_HEX();
      default: return LOADER_FALLBACK_COLORS[type];
    }
  } catch {
    // Fallback if constants not loaded yet
    return LOADER_FALLBACK_COLORS[type];
  }
}

/**
 * Update loader colors after constants are loaded
 */
function updateLoaderColors(): void {
  const loader = document.getElementById('game-loader');
  if (loader) {
    // Update the background color
    loader.style.background = getLoaderColor('BACKGROUND');
    
    // Find and update spinner colors if it exists
    const spinner = loader.querySelector('div[style*="border"]');
    if (spinner instanceof HTMLElement) {
      spinner.style.border = `3px solid ${getLoaderColor('WHITE')}`;
      spinner.style.borderTop = `3px solid ${getLoaderColor('PRIMARY')}`;
    }
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
      background: ${getLoaderColor('BACKGROUND')};
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
        <div style="border: 3px solid ${getLoaderColor('WHITE')}; border-top: 3px solid ${getLoaderColor('PRIMARY')}; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto;"></div>
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
      <div style="text-align: center; color: ${getLoaderColor('DANGER')};">
        <h2 style="margin-bottom: 20px;">🥊 Brawl Bytes</h2>
        <h3 style="margin-bottom: 20px; color: ${getLoaderColor('DANGER')};">❌ Connection Error</h3>
        <p style="margin-bottom: 30px; max-width: 400px; margin-left: auto; margin-right: auto; line-height: 1.5;">${message}</p>
        <div style="margin-bottom: 20px;">
          <p style="font-size: 14px; color: ${getLoaderColor('TEXT_SECONDARY')};">Make sure the backend server is running on port 3001</p>
        </div>
        <button onclick="window.location.reload()" style="
          margin-top: 20px;
          padding: 12px 24px;
          background: ${getLoaderColor('PRIMARY')};
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

// Show initial loading screen
showLoadingIndicator('Initializing Brawl Bytes...');

// Initialize the game
let gameInstance: Phaser.Game | undefined;

initializeGame()
  .then(gameResult => {
    gameInstance = gameResult;

    // Initialize enhanced connection status display
    // Note: Socket manager is initialized within the scenes, so we'll set this up there
    console.log(
      'Game initialized successfully with enhanced reconnection features'
    );
  })
  .catch(error => {
    console.error('Game initialization failed:', error);
    showErrorMessage('Failed to initialize game. Please refresh the page.');
  });

// eslint-disable-next-line import/no-mutable-exports
export default gameInstance;
