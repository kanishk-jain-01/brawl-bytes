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
import { LoginScene } from '@/scenes/LoginScene';
import { GAME_CONFIG, initializeConstants, UI_COLORS } from '@/utils/constants';
import {
  createSocketManager,
  DEFAULT_SOCKET_CONFIG,
  SocketManager,
} from '@/managers/SocketManager';
import { getStoredToken } from '@/api/auth';

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
    const requestInput =
      typeof input === 'string' && input.startsWith('/api/')
        ? `${apiUrl}${input}`
        : input;
    return originalFetch(requestInput, init);
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

    // Constants loaded successfully - no need to update colors since we transition to game

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
        LoginScene,
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

    // Initialize global Socket.io connection before starting Phaser
    const socketManager = createSocketManager(DEFAULT_SOCKET_CONFIG);
    socketManager
      .connect()
      .then(async () => {
        const stored = getStoredToken();
        if (stored) {
          try {
            await SocketManager.authenticate(stored);
            console.log('Socket authenticated with stored token');
          } catch (_err) {
            console.warn('Stored token invalid, clearing', _err);
            localStorage.removeItem('brawlbytes_access_token');
          }
        }
      })
      .catch(connErr => {
        console.error('Socket connection failed:', connErr);
      });

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
 * Simple, consistent loading screen colors that are hardcoded for initial loading only
 * Once database constants are loaded, we transition to the game proper
 */
const INITIAL_LOADER_COLORS = {
  BACKGROUND: '#2c3e50',
  PRIMARY: '#3498db',
  DANGER: '#e74c3c',
  TEXT_SECONDARY: '#bdc3c7',
  WHITE: '#ecf0f1',
} as const;

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
      background: ${INITIAL_LOADER_COLORS.BACKGROUND};
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
        <div style="border: 3px solid ${INITIAL_LOADER_COLORS.WHITE}; border-top: 3px solid ${INITIAL_LOADER_COLORS.PRIMARY}; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto;"></div>
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
      <div style="text-align: center; color: ${INITIAL_LOADER_COLORS.DANGER};">
        <h2 style="margin-bottom: 20px;">🥊 Brawl Bytes</h2>
        <h3 style="margin-bottom: 20px; color: ${INITIAL_LOADER_COLORS.DANGER};">❌ Connection Error</h3>
        <p style="margin-bottom: 30px; max-width: 400px; margin-left: auto; margin-right: auto; line-height: 1.5;">${message}</p>
        <div style="margin-bottom: 20px;">
          <p style="font-size: 14px; color: ${INITIAL_LOADER_COLORS.TEXT_SECONDARY};">Make sure the backend server is running on port 3001</p>
        </div>
        <button onclick="window.location.reload()" style="
          margin-top: 20px;
          padding: 12px 24px;
          background: ${INITIAL_LOADER_COLORS.PRIMARY};
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

// Export a function that returns the game instance instead of a mutable variable
export default function getGameInstance(): Phaser.Game | undefined {
  return gameInstance;
}
