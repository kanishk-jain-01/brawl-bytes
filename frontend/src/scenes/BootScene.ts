/*
 * Boot Scene
 * ----------
 * The initial loading scene that handles asset loading and displays a loading screen.
 * This scene preloads all game assets (images, audio, spritesheets) with a visual progress bar.
 * Once loading is complete, it displays the game title and waits for user input to transition to the MenuScene.
 * Features animated loading bar, file progress tracking, and smooth scene transitions.
 */

import Phaser from 'phaser';
import { GAME_CONFIG, ASSET_KEYS } from '@/utils/constants';
import { getStoredToken } from '@/api/auth';

export class BootScene extends Phaser.Scene {
  private loadingText!: Phaser.GameObjects.Text;

  private progressBar!: Phaser.GameObjects.Graphics;

  private progressBox!: Phaser.GameObjects.Graphics;

  private percentText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: GAME_CONFIG.SCENE_KEYS.BOOT });
  }

  preload(): void {
    this.createLoadingScreen();
    this.setupLoadingEvents();
    this.loadAssets();
  }

  private createLoadingScreen(): void {
    const { width, height } = this.cameras.main;

    // Create loading background
    this.add.rectangle(width / 2, height / 2, width, height, 0x2c3e50);

    // Create progress box
    this.progressBox = this.add.graphics();
    this.progressBox.fillStyle(0x222222, 0.8);
    this.progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);

    // Create progress bar
    this.progressBar = this.add.graphics();

    // Create loading text
    this.loadingText = this.add.text(
      width / 2,
      height / 2 - 80,
      'Loading Game Assets...',
      {
        fontSize: '24px',
        color: GAME_CONFIG.UI.COLORS.TEXT,
        fontFamily: GAME_CONFIG.UI.FONTS.PRIMARY,
      }
    );
    this.loadingText.setOrigin(0.5);

    // Create percentage text
    this.percentText = this.add.text(width / 2, height / 2, '0%', {
      fontSize: '18px',
      color: GAME_CONFIG.UI.COLORS.TEXT_SECONDARY,
      fontFamily: GAME_CONFIG.UI.FONTS.SECONDARY,
    });
    this.percentText.setOrigin(0.5);
  }

  private setupLoadingEvents(): void {
    const { width, height } = this.cameras.main;

    this.load.on('progress', (value: number) => {
      const percentage = Math.round(value * 100);
      this.percentText.setText(`${percentage}%`);

      this.progressBar.clear();
      this.progressBar.fillStyle(0x3498db, 1);
      this.progressBar.fillRect(
        width / 2 - 150,
        height / 2 - 15,
        300 * value,
        30
      );
    });

    this.load.on('fileprogress', (file: Phaser.Loader.File) => {
      this.loadingText.setText(`Loading: ${file.key}`);
    });

    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      console.error(`Failed to load asset: ${file.key} from ${file.url}`);
      this.loadingText.setText(`Error loading: ${file.key}`);
      this.loadingText.setStyle({ color: '#ff0000' });
    });

    this.load.on('complete', () => {
      this.loadingText.setText('Loading Complete!');
      this.percentText.setText('100%');

      // Automatically transition to next scene after a brief delay
      this.time.delayedCall(500, () => {
        this.startGame();
      });
    });
  }

  private loadAssets(): void {
    // Using frontend-served assets and jungle-themed placeholders

    // Load logo (use placeholder for now since jungle logo doesn't exist yet)
    this.load.image(
      ASSET_KEYS.IMAGES.LOGO,
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzRjYWY1MCIvPgogIDx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjI0IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+QkI8L3RleHQ+Cjwvc3ZnPg=='
    );

    // Load UI buttons (use jungle-themed placeholders for now)
    this.load.image(
      ASSET_KEYS.IMAGES.UI_BUTTON,
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjYwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgogIDxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iNjAiIGZpbGw9IiM1ZDRlMzciIHJ4PSI1Ii8+CiAgPHJlY3QgeD0iMyIgeT0iMyIgd2lkdGg9IjE5NCIgaGVpZ2h0PSI1NCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOGQ2ZTYzIiBzdHJva2Utd2lkdGg9IjIiIHJ4PSIzIi8+Cjwvc3ZnPg=='
    );

    this.load.image(
      ASSET_KEYS.IMAGES.UI_BUTTON_HOVER,
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjYwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgogIDxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iNjAiIGZpbGw9IiNmOWE4MjUiIHJ4PSI1Ii8+CiAgPHJlY3QgeD0iMyIgeT0iMyIgd2lkdGg9IjE5NCIgaGVpZ2h0PSI1NCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmZmZmZmIiBzdHJva2Utd2lkdGg9IjIiIHJ4PSIzIi8+Cjwvc3ZnPg=='
    );

    // Load platform (keep existing base64 for now)
    this.load.image(
      ASSET_KEYS.IMAGES.PLATFORM,
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgogIDxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAiIGZpbGw9IiM5NWE1YTYiLz4KICA8cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjUiIGZpbGw9IiM3ZjhlOGYiLz4KPC9zdmc+'
    );

    // Load character spritesheets - 192x192 pixels, 4x4 grid = 48x48 per frame
    this.load.spritesheet(
      ASSET_KEYS.SPRITESHEETS.DASH_SPRITES,
      '/assets/dash_spritesheet.png',
      { frameWidth: 48, frameHeight: 48 }
    );

    this.load.spritesheet(
      ASSET_KEYS.SPRITESHEETS.REX_SPRITES,
      '/assets/rex_spritesheet.png',
      { frameWidth: 48, frameHeight: 48 }
    );

    this.load.spritesheet(
      ASSET_KEYS.SPRITESHEETS.NINJA_SPRITES,
      '/assets/ninja_spritesheet.png',
      { frameWidth: 48, frameHeight: 48 }
    );

    this.load.spritesheet(
      ASSET_KEYS.SPRITESHEETS.TITAN_SPRITES,
      '/assets/titan_spritesheet.png',
      { frameWidth: 192, frameHeight: 192 }
    );

    // Load character card images
    this.load.image(ASSET_KEYS.IMAGES.DASH_CARD, '/assets/dash_card.jpg');
    this.load.image(ASSET_KEYS.IMAGES.NINJA_CARD, '/assets/ninja_card.jpg');
    this.load.image(ASSET_KEYS.IMAGES.REX_CARD, '/assets/rex_card.jpg');
    this.load.image(ASSET_KEYS.IMAGES.TITAN_CARD, '/assets/titan_card.jpg');

    // Load jungle canopy video background (served from frontend to avoid CORS)
    this.load.video({
      key: 'jungle_canopy',
      url: '/assets/backgrounds/jungle-canopy.mp4',
      noAudio: false,
    });

    // Load ancient colosseum video background for character select
    this.load.video({
      key: 'ancient_colosseum',
      url: '/assets/backgrounds/ancient-colosseum.mp4',
      noAudio: false,
    });

    // Load map table video background for stage select
    this.load.video({
      key: 'map_table',
      url: '/assets/backgrounds/map-table.mp4',
      noAudio: false,
    });

    // Load jungle clearing video background for lobby
    this.load.video({
      key: 'jungle_clearing',
      url: '/assets/backgrounds/jungle-clearing.mp4',
      noAudio: false,
    });

    // Load player placeholder
    this.load.image(
      'player_placeholder',
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iODAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjgwIiBmaWxsPSIjZmZmZmZmIiBzdHJva2U9IiMwMDAwMDAiIHN0cm9rZS13aWR0aD0iMiIgcng9IjUiLz4KPC9zdmc+'
    );

    // Simulate loading time for development
    for (let i = 0; i < 10; i += 1) {
      this.load.image(
        `placeholder_${i}`,
        'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
      );
    }
  }

  private startGame(): void {
    this.tweens.killAll();
    this.cameras.main.fadeOut(300, 0, 0, 0);

    this.cameras.main.once('camerafadeoutcomplete', () => {
      const nextScene = getStoredToken()
        ? GAME_CONFIG.SCENE_KEYS.MENU
        : 'LOGIN_SCENE';
      console.log(`Transitioning to ${nextScene}...`);
      this.scene.start(nextScene);
    });
  }
}
