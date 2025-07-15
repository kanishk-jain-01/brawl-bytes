import Phaser from 'phaser';
import { GAME_CONFIG, ASSET_KEYS } from '@/utils/constants';

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

    this.load.on('complete', () => {
      this.loadingText.setText('Loading Complete!');
      this.percentText.setText('100%');

      this.time.delayedCall(500, () => {
        this.loadingText.setText('BRAWL BYTES');
        this.loadingText.setFontSize('48px');
        this.loadingText.setStyle({ fontStyle: 'bold' });
        this.percentText.setText('Press any key to continue');
        this.percentText.setFontSize('20px');
        this.percentText.setY(height / 2 + 60);
      });
    });
  }

  private loadAssets(): void {
    // Load logo (placeholder for now)
    this.load.image(
      ASSET_KEYS.IMAGES.LOGO,
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzMzNzNkYyIvPgogIDx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjI0IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+QkI8L3RleHQ+Cjwvc3ZnPg=='
    );

    // Load placeholder UI button
    this.load.image(
      ASSET_KEYS.IMAGES.UI_BUTTON,
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjYwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgogIDxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iNjAiIGZpbGw9IiMzNDk4ZGIiIHJ4PSI1Ii8+CiAgPHJlY3QgeD0iMyIgeT0iMyIgd2lkdGg9IjE5NCIgaGVpZ2h0PSI1NCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmZmZmZmIiBzdHJva2Utd2lkdGg9IjIiIHJ4PSIzIi8+Cjwvc3ZnPg=='
    );

    // Load placeholder platform
    this.load.image(
      ASSET_KEYS.IMAGES.PLATFORM,
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgogIDxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAiIGZpbGw9IiM5NWE1YTYiLz4KICA8cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjUiIGZpbGw9IiM3ZjhlOGYiLz4KPC9zdmc+'
    );

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

  create(): void {
    this.setupInputHandlers();
  }

  private setupInputHandlers(): void {
    let inputEnabled = false;

    // Enable input after a delay (loading has already completed by create())
    this.time.delayedCall(1000, () => {
      inputEnabled = true;
      this.setupBlinkingText();
    });

    // Listen for any key press
    this.input.keyboard?.on('keydown', () => {
      if (inputEnabled) {
        this.startGame();
      }
    });

    // Listen for click/touch
    this.input.on('pointerdown', () => {
      if (inputEnabled) {
        this.startGame();
      }
    });
  }

  private setupBlinkingText(): void {
    this.tweens.add({
      targets: this.percentText,
      alpha: 0.3,
      duration: 1000,
      yoyo: true,
      repeat: -1,
    });
  }

  private startGame(): void {
    this.tweens.killAll();
    this.cameras.main.fadeOut(300, 0, 0, 0);

    this.cameras.main.once('camerafadeoutcomplete', () => {
      // eslint-disable-next-line no-console
      console.log('Transitioning to MenuScene...');
      this.scene.start(GAME_CONFIG.SCENE_KEYS.MENU);
    });
  }
}
