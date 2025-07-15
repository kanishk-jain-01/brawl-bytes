/*
 * Game Scene
 * ----------
 * The main gameplay scene where the fighting action takes place.
 * Manages physics world, stage platforms, player entities, camera following, and UI elements.
 * Handles real-time input processing, collision detection, match timer, and health/stock tracking.
 * Features multiple platforms, world boundaries, respawn system, and debug information for development.
 * Supports both arrow keys and WASD for movement, with additional action keys for attacks.
 */

import Phaser from 'phaser';
import { getState } from '@/state/GameState';
import { GAME_CONFIG, CharacterType } from '../utils/constants';
import { Player } from '../entities/Player';

export class GameScene extends Phaser.Scene {
  private selectedCharacter: CharacterType | null = null;

  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;

  private wasdKeys: Record<string, Phaser.Input.Keyboard.Key> = {};

  private actionKeys: Record<string, Phaser.Input.Keyboard.Key> = {};

  private platforms: Phaser.Physics.Arcade.StaticGroup | null = null;

  private player: Player | null = null;

  private cameraTarget: Phaser.GameObjects.GameObject | null = null;

  private uiContainer: Phaser.GameObjects.Container | null = null;

  private gameStarted = false;

  private matchTimer: Phaser.Time.TimerEvent | null = null;

  private matchTimeRemaining = 0;

  constructor() {
    super({ key: GAME_CONFIG.SCENE_KEYS.GAME });
  }

  create(): void {
    // eslint-disable-next-line no-console
    console.log('GameScene: Starting game');

    // Retrieve selected character from global state, fallback to default
    this.selectedCharacter =
      getState().selectedCharacter || 'BALANCED_ALLROUNDER';
    // eslint-disable-next-line no-console
    console.log(`GameScene: Selected character - ${this.selectedCharacter}`);

    this.setupPhysics();
    this.createStage();
    this.setupCamera();
    this.setupInput();
    this.createUI();
    this.startMatch();
  }

  private setupPhysics(): void {
    // Set world bounds (larger than screen for camera movement)
    this.physics.world.setBounds(0, 0, 2000, 1200);

    // Configure physics
    this.physics.world.gravity.y = GAME_CONFIG.PHYSICS.GRAVITY;

    // Enable physics debugging if in development
    if (process.env.NODE_ENV === 'development') {
      this.physics.world.createDebugGraphic();
    }
  }

  private createStage(): void {
    // Create stage background
    this.createStageBackground();

    // Create platforms
    this.createPlatforms();

    // Create boundaries
    this.createBoundaries();

    // Create player
    this.createPlayer();
  }

  private createStageBackground(): void {
    // Create gradient background
    const graphics = this.add.graphics();
    graphics.fillGradientStyle(0x87ceeb, 0x87ceeb, 0x98fb98, 0x98fb98, 1);
    graphics.fillRect(
      0,
      0,
      this.physics.world.bounds.width,
      this.physics.world.bounds.height
    );

    // Add some decorative clouds
    for (let i = 0; i < 5; i += 1) {
      const x = Phaser.Math.Between(100, this.physics.world.bounds.width - 100);
      const y = Phaser.Math.Between(50, 200);
      const cloud = this.add.circle(x, y, 40, 0xffffff, 0.8);
      cloud.setScrollFactor(0.5); // Parallax effect
    }
  }

  private createPlatforms(): void {
    this.platforms = this.physics.add.staticGroup();

    // Main platform (ground)
    const mainPlatform = this.platforms.create(
      this.physics.world.bounds.width / 2,
      this.physics.world.bounds.height - 50,
      'platform'
    );
    mainPlatform.setScale(10, 1).refreshBody();
    mainPlatform.setTint(0x8b4513);

    // Left platform
    const leftPlatform = this.platforms.create(400, 800, 'platform');
    leftPlatform.setScale(4, 1).refreshBody();
    leftPlatform.setTint(0x8b4513);

    // Right platform
    const rightPlatform = this.platforms.create(1600, 800, 'platform');
    rightPlatform.setScale(4, 1).refreshBody();
    rightPlatform.setTint(0x8b4513);

    // Center elevated platform
    const centerPlatform = this.platforms.create(1000, 600, 'platform');
    centerPlatform.setScale(3, 1).refreshBody();
    centerPlatform.setTint(0x8b4513);

    // Top platforms
    const topLeftPlatform = this.platforms.create(600, 400, 'platform');
    topLeftPlatform.setScale(2, 1).refreshBody();
    topLeftPlatform.setTint(0x8b4513);

    const topRightPlatform = this.platforms.create(1400, 400, 'platform');
    topRightPlatform.setScale(2, 1).refreshBody();
    topRightPlatform.setTint(0x8b4513);
  }

  private createBoundaries(): void {
    // Create invisible boundaries to prevent players from falling off the world
    const boundaries = this.physics.add.staticGroup();

    // Bottom boundary (death zone)
    const bottomBoundary = boundaries.create(
      this.physics.world.bounds.width / 2,
      this.physics.world.bounds.height + 50,
      ''
    );
    bottomBoundary.setSize(this.physics.world.bounds.width, 100);
    bottomBoundary.setVisible(false);

    // Side boundaries
    const leftBoundary = boundaries.create(
      -50,
      this.physics.world.bounds.height / 2,
      ''
    );
    leftBoundary.setSize(100, this.physics.world.bounds.height);
    leftBoundary.setVisible(false);

    const rightBoundary = boundaries.create(
      this.physics.world.bounds.width + 50,
      this.physics.world.bounds.height / 2,
      ''
    );
    rightBoundary.setSize(100, this.physics.world.bounds.height);
    rightBoundary.setVisible(false);
  }

  private createPlayer(): void {
    if (!this.selectedCharacter) return;

    const spawnX = this.physics.world.bounds.width / 2;
    const spawnY = this.physics.world.bounds.height - 200;

    // Create player using the Player entity class
    this.player = new Player({
      scene: this,
      x: spawnX,
      y: spawnY,
      characterType: this.selectedCharacter,
      playerId: 'local_player',
      isLocalPlayer: true,
    });

    // Set up collisions with platforms
    if (this.platforms) {
      this.physics.add.collider(this.player, this.platforms);
    }

    // Set camera target
    this.cameraTarget = this.player;
  }

  private setupCamera(): void {
    // Set camera bounds to world bounds
    this.cameras.main.setBounds(
      0,
      0,
      this.physics.world.bounds.width,
      this.physics.world.bounds.height
    );

    // Follow the player
    if (this.cameraTarget) {
      this.cameras.main.startFollow(this.cameraTarget);
    }

    // Set camera zoom and smoothing
    this.cameras.main.setZoom(1);
    this.cameras.main.setLerp(0.1, 0.1);

    // Set camera deadzone (area where player can move without camera following)
    this.cameras.main.setDeadzone(200, 100);
  }

  private setupInput(): void {
    // Arrow keys
    this.cursors = this.input.keyboard?.createCursorKeys() || null;

    // WASD keys
    if (this.input.keyboard) {
      this.wasdKeys = {
        W: this.input.keyboard.addKey('W'),
        A: this.input.keyboard.addKey('A'),
        S: this.input.keyboard.addKey('S'),
        D: this.input.keyboard.addKey('D'),
      };

      // Action keys
      this.actionKeys = {
        SPACE: this.input.keyboard.addKey('SPACE'),
        X: this.input.keyboard.addKey('X'),
        Z: this.input.keyboard.addKey('Z'),
        C: this.input.keyboard.addKey('C'),
        ESC: this.input.keyboard.addKey('ESC'),
      };
    }

    // ESC to return to character select
    this.actionKeys.ESC?.on('down', () => {
      this.returnToCharacterSelect();
    });
  }

  private createUI(): void {
    this.uiContainer = this.add.container(0, 0);
    this.uiContainer.setScrollFactor(0); // UI doesn't scroll with camera

    // Create match timer
    this.createMatchTimer();

    // Create player HUD
    this.createPlayerHUD();

    // Create debug info (development only)
    if (process.env.NODE_ENV === 'development') {
      this.createDebugInfo();
    }
  }

  private createMatchTimer(): void {
    if (!this.uiContainer) return;

    const timerBg = this.add.rectangle(
      this.cameras.main.centerX,
      50,
      200,
      60,
      0x2c3e50,
      0.8
    );
    timerBg.setStrokeStyle(2, 0x3498db);
    this.uiContainer.add(timerBg);

    const timerText = this.add
      .text(
        this.cameras.main.centerX,
        50,
        GameScene.formatTime(GAME_CONFIG.GAME.MATCH_TIME),
        {
          fontSize: '24px',
          fontFamily: GAME_CONFIG.UI.FONTS.PRIMARY,
          color: GAME_CONFIG.UI.COLORS.TEXT,
          fontStyle: 'bold',
        }
      )
      .setOrigin(0.5);
    this.uiContainer.add(timerText);

    // Store reference for updates
    timerText.setName('matchTimer');
  }

  private createPlayerHUD(): void {
    if (!this.uiContainer || !this.player) return;

    const character = this.player.getCharacterData();
    const health = this.player.getHealth();
    const stocks = this.player.getStocks();

    // Health bar
    const healthBarBg = this.add.rectangle(150, 100, 250, 30, 0x2c3e50, 0.8);
    healthBarBg.setStrokeStyle(2, 0x3498db);
    this.uiContainer.add(healthBarBg);

    const healthBar = this.add.rectangle(150, 100, 240, 20, 0x27ae60);
    healthBar.setName('healthBar');
    this.uiContainer.add(healthBar);

    const healthText = this.add
      .text(150, 100, `${health}/${character.health}`, {
        fontSize: '16px',
        fontFamily: GAME_CONFIG.UI.FONTS.PRIMARY,
        color: GAME_CONFIG.UI.COLORS.TEXT,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    healthText.setName('healthText');
    this.uiContainer.add(healthText);

    // Stock counter
    const stockText = this.add.text(50, 150, `Lives: ${stocks}`, {
      fontSize: '18px',
      fontFamily: GAME_CONFIG.UI.FONTS.PRIMARY,
      color: GAME_CONFIG.UI.COLORS.TEXT,
      fontStyle: 'bold',
    });
    stockText.setName('stockText');
    this.uiContainer.add(stockText);

    // Character name
    const nameText = this.add.text(50, 50, character.name, {
      fontSize: '20px',
      fontFamily: GAME_CONFIG.UI.FONTS.PRIMARY,
      color: GAME_CONFIG.UI.COLORS.TEXT,
      fontStyle: 'bold',
    });
    this.uiContainer.add(nameText);
  }

  private createDebugInfo(): void {
    if (!this.uiContainer) return;

    const debugText = this.add
      .text(this.cameras.main.width - 20, 20, 'Debug Info', {
        fontSize: '14px',
        fontFamily: GAME_CONFIG.UI.FONTS.SECONDARY,
        color: GAME_CONFIG.UI.COLORS.TEXT_SECONDARY,
      })
      .setOrigin(1, 0);
    debugText.setName('debugText');
    this.uiContainer.add(debugText);
  }

  private startMatch(): void {
    this.gameStarted = true;
    this.matchTimeRemaining = GAME_CONFIG.GAME.MATCH_TIME;

    // Start match timer
    this.matchTimer = this.time.addEvent({
      delay: 1000, // 1 second
      callback: this.updateMatchTimer,
      callbackScope: this,
      loop: true,
    });

    // eslint-disable-next-line no-console
    console.log('GameScene: Match started');
  }

  private updateMatchTimer(): void {
    if (!this.gameStarted) return;

    this.matchTimeRemaining -= 1000;

    if (this.matchTimeRemaining <= 0) {
      this.endMatch();
      return;
    }

    // Update timer display
    const timerText = this.uiContainer?.getByName(
      'matchTimer'
    ) as Phaser.GameObjects.Text;
    if (timerText) {
      timerText.setText(GameScene.formatTime(this.matchTimeRemaining));
    }
  }

  private static formatTime(milliseconds: number): string {
    const totalSeconds = Math.ceil(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  private endMatch(): void {
    this.gameStarted = false;

    if (this.matchTimer) {
      this.matchTimer.remove();
    }

    // eslint-disable-next-line no-console
    console.log('GameScene: Match ended');

    // For now, return to character select
    this.time.delayedCall(2000, () => {
      this.returnToCharacterSelect();
    });
  }

  private returnToCharacterSelect(): void {
    // eslint-disable-next-line no-console
    console.log('GameScene: Returning to character select');

    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start(GAME_CONFIG.SCENE_KEYS.CHARACTER_SELECT);
    });
  }

  update(): void {
    if (!this.gameStarted || !this.player) return;

    this.handlePlayerInput();
    this.player.update();
    this.updateUI();
    this.updateDebugInfo();
  }

  private handlePlayerInput(): void {
    if (!this.player || !this.cursors) return;

    // Gather input state
    const inputState = {
      left: this.cursors.left.isDown || this.wasdKeys.A?.isDown || false,
      right: this.cursors.right.isDown || this.wasdKeys.D?.isDown || false,
      up:
        this.cursors.up.isDown ||
        this.wasdKeys.W?.isDown ||
        this.actionKeys.SPACE?.isDown ||
        false,
      down: this.cursors.down.isDown || this.wasdKeys.S?.isDown || false,
      attack: this.actionKeys.X?.isDown || false,
      special: this.actionKeys.Z?.isDown || false,
    };

    // Update player input state
    this.player.updateInputState(inputState);
  }

  private updateUI(): void {
    if (!this.uiContainer || !this.player) return;

    const health = this.player.getHealth();
    const maxHealth = this.player.getMaxHealth();
    const stocks = this.player.getStocks();

    // Update health bar
    const healthBar = this.uiContainer.getByName(
      'healthBar'
    ) as Phaser.GameObjects.Rectangle;
    const healthText = this.uiContainer.getByName(
      'healthText'
    ) as Phaser.GameObjects.Text;

    if (healthBar && healthText) {
      const healthPercent = health / maxHealth;
      healthBar.setScale(healthPercent, 1);
      healthText.setText(`${health}/${maxHealth}`);

      // Color based on health
      if (healthPercent > 0.6) {
        healthBar.setFillStyle(0x27ae60);
      } else if (healthPercent > 0.3) {
        healthBar.setFillStyle(0xf39c12);
      } else {
        healthBar.setFillStyle(0xe74c3c);
      }
    }

    // Update stock counter
    const stockText = this.uiContainer.getByName(
      'stockText'
    ) as Phaser.GameObjects.Text;
    if (stockText) {
      stockText.setText(`Lives: ${stocks}`);
    }
  }

  private updateDebugInfo(): void {
    if (
      process.env.NODE_ENV !== 'development' ||
      !this.uiContainer ||
      !this.player
    )
      return;

    const debugText = this.uiContainer.getByName(
      'debugText'
    ) as Phaser.GameObjects.Text;
    if (debugText) {
      const velocity = this.player.body?.velocity;
      const position = this.player;

      debugText.setText(
        [
          'Debug Info:',
          `Position: ${Math.round(position.x)}, ${Math.round(position.y)}`,
          `Velocity: ${Math.round(velocity?.x || 0)}, ${Math.round(velocity?.y || 0)}`,
          `On Ground: ${this.player.body?.touching.down || false}`,
          `Character: ${this.selectedCharacter}`,
          `Health: ${this.player.getHealth()}/${this.player.getMaxHealth()}`,
          `Stocks: ${this.player.getStocks()}`,
          '',
          'Controls:',
          'Arrow Keys / WASD: Move',
          'Space: Jump',
          'X: Attack',
          'Z: Special',
          'ESC: Return to Character Select',
        ].join('\n')
      );
    }
  }
}
