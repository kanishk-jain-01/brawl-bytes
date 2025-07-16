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
import { DamageType } from '@/types';
import type { DamageInfo } from '@/types';
import { GAME_CONFIG, CharacterType, StageType } from '../utils/constants';
import { Player } from '../entities/Player';
import { Stage } from '../entities/Stage';
import { getSocketManager } from '../utils/socket';
import { createConnectionStatusDisplay, ConnectionStatusDisplay } from '../utils/ConnectionStatusDisplay';

export class GameScene extends Phaser.Scene {
  private selectedCharacter: CharacterType | null = null;

  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;

  private wasdKeys: Record<string, Phaser.Input.Keyboard.Key> = {};

  private actionKeys: Record<string, Phaser.Input.Keyboard.Key> = {};

  private stage: Stage | null = null;

  private selectedStage: StageType = 'BATTLE_ARENA';

  private player: Player | null = null;

  private players: Player[] = [];

  private remotePlayers: Map<string, Player> = new Map();

  private activeHitboxes: Phaser.GameObjects.Rectangle[] = [];

  private connectionStatusDisplay: ConnectionStatusDisplay | null = null;

  private cameraTarget: Phaser.GameObjects.GameObject | null = null;

  private uiContainer: Phaser.GameObjects.Container | null = null;

  private gameStarted = false;

  private gamePaused = false;

  private pauseReason: string | null = null;

  private pauseOverlay: Phaser.GameObjects.Container | null = null;

  private matchTimer: Phaser.Time.TimerEvent | null = null;

  private matchTimeRemaining = 0;

  constructor() {
    super({ key: GAME_CONFIG.SCENE_KEYS.GAME });
  }

  create(): void {
    // eslint-disable-next-line no-console
    console.log('GameScene: Starting game');

    // Retrieve selected character from global state, fallback to default
    const rawCharacter = getState().selectedCharacter || 'BALANCED_ALLROUNDER';
    // Map old character names to new ones
    this.selectedCharacter = this.mapCharacterName(rawCharacter);
    // eslint-disable-next-line no-console
    console.log(`GameScene: Selected character - ${this.selectedCharacter}`);

    this.setupPhysics();
    this.createStage();
    this.setupCamera();
    this.setupInput();
    this.createUI();
    this.initializeConnectionStatusDisplay();
    this.setupAttackSystem();
    this.setupNetworking();
    this.startMatch();
  }

  private setupPhysics(): void {
    // Set world bounds (larger than screen for camera movement)
    this.physics.world.setBounds(
      0,
      0,
      GAME_CONFIG.PHYSICS.WORLD_BOUNDS.WIDTH,
      GAME_CONFIG.PHYSICS.WORLD_BOUNDS.HEIGHT
    );

    // Configure physics
    this.physics.world.gravity.y = GAME_CONFIG.PHYSICS.GRAVITY;

    // Enable physics debugging if in development
    if (process.env.NODE_ENV === 'development') {
      this.physics.world.createDebugGraphic();
    }
  }

  private createStage(): void {
    // Create stage using Stage entity
    this.stage = new Stage({
      scene: this,
      stageType: this.selectedStage,
      worldWidth: this.physics.world.bounds.width,
      worldHeight: this.physics.world.bounds.height,
    });

    // Set up stage event listeners
    this.setupStageEvents();

    // Create player
    this.createPlayer();
  }

  private setupStageEvents(): void {
    // Listen for stage-related events
    this.events.on('playerFellOffStage', (player: Player) => {
      this.handlePlayerFallOffStage(player);
    });

    this.events.on(
      'playerHitHazard',
      (data: {
        player: Player;
        hazardType: string;
        damage: number;
        knockback: { x: number; y: number };
      }) => {
        this.handlePlayerHitHazard(data);
      }
    );

    // Listen for spawn point requests
    this.events.on('getSpawnPoint', (spawnEvent: { x: number; y: number }) => {
      if (this.stage) {
        const spawnPoints = this.stage.getSpawnPoints();
        const randomSpawn = Phaser.Math.RND.pick(spawnPoints);
        // eslint-disable-next-line no-param-reassign
        spawnEvent.x = randomSpawn.x;
        // eslint-disable-next-line no-param-reassign
        spawnEvent.y = randomSpawn.y;
      }
    });

    // Listen for damage events for UI updates
    this.events.on(
      'playerDamaged',
      (data: { playerId: string; damage: number; damageType: string }) => {
        // eslint-disable-next-line no-console
        console.log(
          `Damage dealt: ${data.damage} ${data.damageType} to ${data.playerId}`
        );
      }
    );

    // Listen for healing events
    this.events.on(
      'playerHealed',
      (data: { playerId: string; healAmount: number }) => {
        // eslint-disable-next-line no-console
        console.log(`Healing: ${data.healAmount} to ${data.playerId}`);
      }
    );

    // Listen for respawn events
    this.events.on(
      'playerRespawned',
      (data: { playerId: string; spawnX: number; spawnY: number }) => {
        // eslint-disable-next-line no-console
        console.log(
          `Player ${data.playerId} respawned at (${data.spawnX}, ${data.spawnY})`
        );
      }
    );

    // Listen for player defeat events
    this.events.on('playerDefeated', (playerId: string) => {
      this.handlePlayerDefeated(playerId);
    });
  }

  private handlePlayerFallOffStage(player: Player): void {
    // Apply fall damage using new damage system
    const fallDamage: DamageInfo = {
      amount: GAME_CONFIG.DAMAGE.FALL_DAMAGE,
      type: DamageType.FALL,
      source: 'stage_fall',
    };

    player.takeDamage(fallDamage);

    // Visual feedback
    this.cameras.main.shake(200, 0.03);

    // eslint-disable-next-line no-console
    console.log(`${player.playerId} fell off the stage!`);
  }

  private handlePlayerHitHazard(data: {
    player: Player;
    hazardType: string;
    damage: number;
    knockback: { x: number; y: number };
  }): void {
    // Apply hazard damage using new damage system
    const hazardDamage: DamageInfo = {
      amount: data.damage,
      type: DamageType.ENVIRONMENTAL,
      knockback: data.knockback,
      source: `hazard_${data.hazardType}`,
    };

    data.player.takeDamage(hazardDamage);

    // Visual feedback
    this.cameras.main.shake(150, 0.025);

    // eslint-disable-next-line no-console
    console.log(
      `${data.player.playerId} hit ${data.hazardType} hazard for ${data.damage} damage`
    );
  }

  private createPlayer(): void {
    if (!this.selectedCharacter || !this.stage) return;

    // Get spawn points from stage
    const spawnPoints = this.stage.getSpawnPoints();

    // Create main player
    this.player = new Player({
      scene: this,
      x: spawnPoints[0].x,
      y: spawnPoints[0].y,
      characterType: this.selectedCharacter,
      playerId: 'local_player',
      isLocalPlayer: true,
    });

    // Add player to players array
    this.players.push(this.player);

    // Create a second player for testing combat (dummy AI)
    const dummyPlayer = new Player({
      scene: this,
      x: spawnPoints[1].x,
      y: spawnPoints[1].y,
      characterType: 'TITAN',
      playerId: 'dummy_player',
      isLocalPlayer: false,
    });

    this.players.push(dummyPlayer);

    // Set up stage collisions for both players
    this.stage.setupPlayerCollisions(this.player);
    this.stage.setupPlayerCollisions(dummyPlayer);

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

  private initializeConnectionStatusDisplay(): void {
    const socketManager = getSocketManager();
    if (socketManager) {
      this.connectionStatusDisplay = createConnectionStatusDisplay(socketManager, {
        position: 'top-left',
        showOnlyOnProblems: true,
        autoHide: true,
        autoHideDelay: 3000
      });
      
      // Configure reconnection settings for game context
      socketManager.setReconnectionConfig({
        maxAttempts: 8, // More attempts during gameplay
        baseDelay: 1000, // 1 second base delay
        maxDelay: 15000, // Max 15 seconds between attempts
        backoffFactor: 1.4 // Moderate exponential backoff
      });
      
      console.log('Connection status display initialized for GameScene');
    }
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
      this.endMatch('timer');
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

  private handlePlayerDefeated(playerId: string): void {
    // eslint-disable-next-line no-console
    console.log(`Player ${playerId} was defeated!`);

    // Check if match should end due to player elimination
    this.checkMatchEndConditions();
  }

  private checkMatchEndConditions(): void {
    if (!this.gameStarted) return;

    const activePlayers = this.players.filter(player => !player.isDefeated());
    const localPlayer = this.players.find(player => player.isLocalPlayer);

    // Check victory conditions
    if (activePlayers.length <= 1) {
      // Only one player remaining - they win
      const winner = activePlayers[0];
      this.endMatch('elimination', winner);
    } else if (localPlayer && localPlayer.isDefeated()) {
      // Local player defeated - they lose
      this.endMatch('defeat', localPlayer);
    }
  }

  private endMatch(
    reason: 'timer' | 'elimination' | 'defeat',
    winner?: Player
  ): void {
    this.gameStarted = false;

    if (this.matchTimer) {
      this.matchTimer.remove();
    }

    // eslint-disable-next-line no-console
    console.log(`GameScene: Match ended due to ${reason}`);

    // Show match results
    this.showMatchResults(reason, winner);

    // Return to character select after showing results
    this.time.delayedCall(3000, () => {
      this.returnToCharacterSelect();
    });
  }

  private showMatchResults(
    reason: 'timer' | 'elimination' | 'defeat',
    winner?: Player
  ): void {
    // Create results overlay
    const overlay = this.add.rectangle(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      this.cameras.main.width,
      this.cameras.main.height,
      0x000000,
      0.8
    );
    overlay.setScrollFactor(0);

    let resultText = '';
    let resultColor: string = GAME_CONFIG.UI.COLORS.TEXT;

    switch (reason) {
      case 'timer': {
        // Time ran out - determine winner by remaining stocks and health
        const activePlayers = this.players.filter(
          player => !player.isDefeated()
        );
        const localPlayer = this.players.find(player => player.isLocalPlayer);

        if (activePlayers.length === 0) {
          resultText = 'DRAW!';
          resultColor = GAME_CONFIG.UI.COLORS.TEXT_SECONDARY;
        } else if (localPlayer && !localPlayer.isDefeated()) {
          // Compare local player with opponents
          const opponent = activePlayers.find(player => !player.isLocalPlayer);
          if (opponent) {
            if (localPlayer.getStocks() > opponent.getStocks()) {
              resultText = 'VICTORY!';
              resultColor = GAME_CONFIG.UI.COLORS.SUCCESS;
            } else if (localPlayer.getStocks() < opponent.getStocks()) {
              resultText = 'DEFEAT!';
              resultColor = GAME_CONFIG.UI.COLORS.DANGER;
            } else if (localPlayer.getHealth() > opponent.getHealth()) {
              // Same stocks - compare health
              resultText = 'VICTORY!';
              resultColor = GAME_CONFIG.UI.COLORS.SUCCESS;
            } else if (localPlayer.getHealth() < opponent.getHealth()) {
              resultText = 'DEFEAT!';
              resultColor = GAME_CONFIG.UI.COLORS.DANGER;
            } else {
              resultText = 'DRAW!';
              resultColor = GAME_CONFIG.UI.COLORS.TEXT_SECONDARY;
            }
          } else {
            resultText = 'VICTORY!';
            resultColor = GAME_CONFIG.UI.COLORS.SUCCESS;
          }
        } else {
          resultText = 'DEFEAT!';
          resultColor = GAME_CONFIG.UI.COLORS.DANGER;
        }
        break;
      }

      case 'elimination': {
        if (winner) {
          if (winner.isLocalPlayer) {
            resultText = 'VICTORY!';
            resultColor = GAME_CONFIG.UI.COLORS.SUCCESS;
          } else {
            resultText = 'DEFEAT!';
            resultColor = GAME_CONFIG.UI.COLORS.DANGER;
          }
        } else {
          resultText = 'MATCH COMPLETE!';
        }
        break;
      }

      case 'defeat': {
        resultText = 'DEFEAT!';
        resultColor = GAME_CONFIG.UI.COLORS.DANGER;
        break;
      }

      default:
        resultText = 'MATCH COMPLETE!';
        break;
    }

    // Main result text
    this.add
      .text(
        this.cameras.main.centerX,
        this.cameras.main.centerY - 50,
        resultText,
        {
          fontSize: '48px',
          fontFamily: GAME_CONFIG.UI.FONTS.PRIMARY,
          color: resultColor,
          fontStyle: 'bold',
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0);

    // Subtitle text
    let subtitleText = '';
    switch (reason) {
      case 'timer':
        subtitleText = 'Time ran out!';
        break;
      case 'elimination':
        subtitleText = winner
          ? `${winner.getCharacterData().name} wins!`
          : 'Last player standing!';
        break;
      case 'defeat':
        subtitleText = 'Better luck next time!';
        break;
      default:
        subtitleText = 'Match complete!';
        break;
    }

    this.add
      .text(
        this.cameras.main.centerX,
        this.cameras.main.centerY + 20,
        subtitleText,
        {
          fontSize: '24px',
          fontFamily: GAME_CONFIG.UI.FONTS.PRIMARY,
          color: GAME_CONFIG.UI.COLORS.TEXT_SECONDARY,
          fontStyle: 'normal',
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0);

    // Show final stats
    const localPlayer = this.players.find(player => player.isLocalPlayer);
    if (localPlayer) {
      this.add
        .text(
          this.cameras.main.centerX,
          this.cameras.main.centerY + 80,
          `Final Stats - Lives: ${localPlayer.getStocks()} | Health: ${localPlayer.getHealth()}/${localPlayer.getMaxHealth()}`,
          {
            fontSize: '18px',
            fontFamily: GAME_CONFIG.UI.FONTS.SECONDARY,
            color: GAME_CONFIG.UI.COLORS.TEXT,
            fontStyle: 'normal',
          }
        )
        .setOrigin(0.5)
        .setScrollFactor(0);

      // Add return instruction
      this.add
        .text(
          this.cameras.main.centerX,
          this.cameras.main.centerY + 120,
          'Returning to Character Select...',
          {
            fontSize: '16px',
            fontFamily: GAME_CONFIG.UI.FONTS.SECONDARY,
            color: GAME_CONFIG.UI.COLORS.TEXT_SECONDARY,
            fontStyle: 'italic',
          }
        )
        .setOrigin(0.5)
        .setScrollFactor(0);
    }

    // Add some visual flair
    this.cameras.main.flash(500, 255, 255, 255, false);

    // Play different screen shake based on result
    if (resultText === 'VICTORY!') {
      this.cameras.main.shake(1000, 0.02);
    } else if (resultText === 'DEFEAT!') {
      this.cameras.main.shake(500, 0.01);
    }
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

    // Skip input handling and player updates if game is paused
    if (!this.gamePaused) {
      this.handlePlayerInput();

      // Update all players
      this.players.forEach(player => {
        player.update();
      });
    }

    // Always update UI and debug info (even when paused)
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
          `Game Paused: ${this.gamePaused ? `Yes (${this.pauseReason})` : 'No'}`,
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

  private setupAttackSystem(): void {
    // Listen for attack hitbox creation
    this.events.on(
      'attackHitboxCreated',
      (attackData: {
        hitbox: Phaser.GameObjects.Rectangle;
        attacker: Player;
        damage: number;
        knockback: { x: number; y: number };
      }) => {
        this.activeHitboxes.push(attackData.hitbox);
        this.setupHitboxCollision(attackData);
      }
    );

    // Listen for attack hitbox destruction
    this.events.on(
      'attackHitboxDestroyed',
      (hitbox: Phaser.GameObjects.Rectangle) => {
        const index = this.activeHitboxes.indexOf(hitbox);
        if (index > -1) {
          this.activeHitboxes.splice(index, 1);
        }
      }
    );
  }

  private setupHitboxCollision(attackData: {
    hitbox: Phaser.GameObjects.Rectangle;
    attacker: Player;
    damage: number;
    knockback: { x: number; y: number };
  }): void {
    // Set up collision detection with all players except the attacker
    this.players.forEach(player => {
      if (player !== attackData.attacker && !player.isDefeated()) {
        this.physics.add.overlap(
          attackData.hitbox,
          player,
          () => {
            this.handleAttackHit(
              attackData.attacker,
              player,
              attackData.damage,
              attackData.knockback
            );
          },
          undefined,
          this
        );
      }
    });
  }

  private handleAttackHit(
    attacker: Player,
    victim: Player,
    damage: number,
    knockback: { x: number; y: number }
  ): void {
    // Calculate if this is a critical hit
    const isCritical = Math.random() < GAME_CONFIG.DAMAGE.CRITICAL_CHANCE;

    // Create damage info using new system
    const attackDamage: DamageInfo = {
      amount: damage,
      type: DamageType.PHYSICAL,
      knockback,
      isCritical,
      source: `attack_${attacker.playerId}`,
    };

    // Apply damage using new system
    victim.takeDamage(attackDamage);

    // Visual feedback (enhanced for critical hits)
    const shakeIntensity = isCritical ? 0.04 : 0.02;
    const shakeDuration = isCritical ? 200 : 100;
    this.cameras.main.shake(shakeDuration, shakeIntensity);

    // Audio feedback (placeholder)
    // this.sound.play(isCritical ? 'critical_hit_sound' : 'hit_sound');

    // eslint-disable-next-line no-console
    console.log(
      `${attacker.playerId} hit ${victim.playerId} for ${damage} damage${isCritical ? ' (CRITICAL!)' : ''}`
    );
  }

  private setupNetworking(): void {
    const socketManager = getSocketManager();
    if (!socketManager) return;

    // Listen for player input events from other players
    socketManager.on('playerInput', (data: any) => {
      this.handleRemotePlayerInput(data);
    });

    // Listen for player move events
    socketManager.on('playerMove', (data: any) => {
      this.handleRemotePlayerMove(data);
    });

    // Listen for player attack events
    socketManager.on('playerAttack', (data: any) => {
      this.handleRemotePlayerAttack(data);
    });

    // Listen for players joining the game
    socketManager.on('playerJoined', (data: any) => {
      this.handlePlayerJoined(data);
    });

    // Listen for players leaving the game
    socketManager.on('playerLeft', (data: any) => {
      this.handlePlayerLeft(data);
    });

    // Listen for game events
    socketManager.on('gameEvent', (data: any) => {
      this.handleGameEvent(data);
    });

    // Listen for server state updates (for prediction reconciliation)
    socketManager.on('serverState', (data: any) => {
      this.handleServerState(data);
    });

    // Listen for position corrections
    socketManager.on('positionCorrection', (data: any) => {
      this.handlePositionCorrection(data);
    });

    // Listen for game pause/resume events
    socketManager.on('gamePaused', (data: any) => {
      this.handleGamePaused(data);
    });

    socketManager.on('gameResumed', (data: any) => {
      this.handleGameResumed(data);
    });

    // Listen for player disconnect/reconnect events
    socketManager.on('playerDisconnected', (data: any) => {
      this.handlePlayerDisconnected(data);
    });

    socketManager.on('playerReconnected', (data: any) => {
      this.handlePlayerReconnected(data);
    });

    // eslint-disable-next-line no-console
    console.log('GameScene: Network event listeners set up');
  }

  private handleRemotePlayerInput(data: {
    playerId: string;
    inputType: string;
    data: any;
  }): void {
    const remotePlayer = this.remotePlayers.get(data.playerId);
    if (!remotePlayer) return;

    switch (data.inputType) {
      case 'jump':
        remotePlayer.applyRemoteAction('jump');
        break;
      case 'special':
        remotePlayer.applyRemoteAction('special');
        break;
      default:
        // Unknown input type, ignore
        break;
    }
  }

  private handleRemotePlayerMove(data: {
    playerId: string;
    position: { x: number; y: number };
    velocity: { x: number; y: number };
  }): void {
    const remotePlayer = this.remotePlayers.get(data.playerId);
    if (!remotePlayer) return;

    remotePlayer.applyRemotePosition(data.position, data.velocity);
  }

  private handleRemotePlayerAttack(data: {
    playerId: string;
    attackType: string;
    direction: number;
    hitbox?: any;
  }): void {
    const remotePlayer = this.remotePlayers.get(data.playerId);
    if (!remotePlayer) return;

    remotePlayer.applyRemoteAttack(data.attackType, data.direction);
  }

  private handlePlayerJoined(data: {
    playerId: string;
    username: string;
  }): void {
    // Create a remote player if they don't exist
    if (!this.remotePlayers.has(data.playerId)) {
      this.createRemotePlayer(data.playerId, data.username);
    }
  }

  private handlePlayerLeft(data: { playerId: string }): void {
    const remotePlayer = this.remotePlayers.get(data.playerId);
    if (remotePlayer) {
      remotePlayer.destroy();
      this.remotePlayers.delete(data.playerId);

      // Remove from players array
      const index = this.players.indexOf(remotePlayer);
      if (index > -1) {
        this.players.splice(index, 1);
      }
    }
  }

  private handleGameEvent(data: any): void {
    switch (data.type) {
      case 'player_hit':
        this.handleRemotePlayerHit(data.data);
        break;
      case 'player_ko':
        this.handleRemotePlayerKO(data.data);
        break;
      default:
        // eslint-disable-next-line no-console
        console.log('Unknown game event:', data);
    }
  }

  private createRemotePlayer(playerId: string, username: string): void {
    if (!this.stage) return;

    // Create remote player at a spawn point
    const spawnPoints = this.stage.getSpawnPoints();
    const spawnPoint =
      spawnPoints[Math.floor(Math.random() * spawnPoints.length)];
    const remotePlayer = new Player({
      scene: this,
      x: spawnPoint.x,
      y: spawnPoint.y,
      characterType: 'BALANCED_ALLROUNDER', // Default, will be updated by character selection sync
      playerId,
      isLocalPlayer: false,
    });

    this.remotePlayers.set(playerId, remotePlayer);
    this.players.push(remotePlayer);

    // eslint-disable-next-line no-console
    console.log(`Created remote player: ${username} (${playerId})`);
  }

  private handleRemotePlayerHit(data: {
    targetPlayerId: string;
    damage: number;
    knockback: any;
  }): void {
    const targetPlayer = this.remotePlayers.get(data.targetPlayerId);
    if (!targetPlayer) return;

    // Apply damage and knockback effects
    targetPlayer.takeDamage({
      amount: data.damage,
      type: DamageType.PHYSICAL,
      source: 'remote_player',
    });
  }

  private handleRemotePlayerKO(data: { targetPlayerId: string }): void {
    const targetPlayer = this.remotePlayers.get(data.targetPlayerId);
    if (!targetPlayer) return;

    // Handle KO effects
    targetPlayer.respawn();
  }

  private handleServerState(data: {
    position: { x: number; y: number };
    velocity: { x: number; y: number };
    sequence: number;
    timestamp: number;
  }): void {
    // Apply server state to local player for reconciliation
    if (this.player) {
      this.player.applyServerState(
        data.position,
        data.velocity,
        data.sequence,
        data.timestamp
      );
    }
  }

  private handlePositionCorrection(data: {
    position: { x: number; y: number };
    velocity: { x: number; y: number };
    sequence: number;
    timestamp: number;
  }): void {
    // Handle server correction (more aggressive than normal server state)
    if (this.player) {
      this.player.applyServerState(
        data.position,
        data.velocity,
        data.sequence,
        data.timestamp
      );
      // eslint-disable-next-line no-console
      console.warn('Position corrected by server');
    }
  }

  // Public getters for game state
  public isGamePaused(): boolean {
    return this.gamePaused;
  }

  public getPauseReason(): string | null {
    return this.pauseReason;
  }

  /**
   * Map old character names to new centralized names
   */
  // Game pause/resume handlers
  private handleGamePaused(data: {
    reason: string;
    disconnectedPlayer?: { userId: string; username: string };
    pausedAt: string;
  }): void {
    console.log('Game paused:', data);
    
    this.gamePaused = true;
    this.pauseReason = data.reason;
    
    // Pause physics
    this.physics.pause();
    
    // Pause timers
    if (this.matchTimer) {
      this.matchTimer.paused = true;
    }
    
    // Show pause overlay
    this.showPauseOverlay(data);
    
    // Disable player input
    this.disablePlayerInput();
    
    console.log(`Game paused due to: ${data.reason}`);
  }

  private handleGameResumed(data: {
    reason: string;
    resumedAt: string;
  }): void {
    console.log('Game resumed:', data);
    
    this.gamePaused = false;
    this.pauseReason = null;
    
    // Resume physics
    this.physics.resume();
    
    // Resume timers
    if (this.matchTimer) {
      this.matchTimer.paused = false;
    }
    
    // Hide pause overlay
    this.hidePauseOverlay();
    
    // Re-enable player input
    this.enablePlayerInput();
    
    console.log(`Game resumed: ${data.reason}`);
  }

  private handlePlayerDisconnected(data: {
    playerId: string;
    username: string;
    gracePeriod: number;
    gameState: string;
  }): void {
    console.log('Player disconnected:', data);
    
    // Show notification about disconnected player
    this.showPlayerDisconnectedNotification(data);
    
    // Mark remote player as disconnected if they exist
    const remotePlayer = this.remotePlayers.get(data.playerId);
    if (remotePlayer) {
      this.setPlayerDisconnectedState(remotePlayer, true);
    }
  }

  private handlePlayerReconnected(data: {
    playerId: string;
    username: string;
    disconnectionDuration: number;
    gameState: string;
  }): void {
    console.log('Player reconnected:', data);
    
    // Show welcome back notification
    this.showPlayerReconnectedNotification(data);
    
    // Mark remote player as connected if they exist
    const remotePlayer = this.remotePlayers.get(data.playerId);
    if (remotePlayer) {
      this.setPlayerDisconnectedState(remotePlayer, false);
    }
  }

  private showPauseOverlay(data: {
    reason: string;
    disconnectedPlayer?: { userId: string; username: string };
    pausedAt: string;
  }): void {
    if (this.pauseOverlay) {
      return; // Already showing
    }

    // Create pause overlay container
    this.pauseOverlay = this.add.container(
      this.cameras.main.centerX,
      this.cameras.main.centerY
    );

    // Semi-transparent background
    const background = this.add.rectangle(
      0, 0,
      this.cameras.main.width,
      this.cameras.main.height,
      0x000000,
      0.7
    );
    this.pauseOverlay.add(background);

    // Pause icon
    const pauseIcon = this.add.text(0, -80, '⏸️', {
      fontSize: '64px',
    }).setOrigin(0.5);
    this.pauseOverlay.add(pauseIcon);

    // Main title
    const title = this.add.text(0, -20, 'GAME PAUSED', {
      fontSize: '32px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.pauseOverlay.add(title);

    // Reason text
    let reasonText = '';
    switch (data.reason) {
      case 'player_disconnect':
        reasonText = data.disconnectedPlayer 
          ? `${data.disconnectedPlayer.username} disconnected`
          : 'A player disconnected';
        break;
      default:
        reasonText = 'Game paused';
    }

    const reason = this.add.text(0, 20, reasonText, {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: '#cccccc',
    }).setOrigin(0.5);
    this.pauseOverlay.add(reason);

    // Waiting message
    const waitingText = this.add.text(0, 50, 'Waiting for all players to reconnect...', {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#999999',
    }).setOrigin(0.5);
    this.pauseOverlay.add(waitingText);

    // Set high depth to ensure it's on top
    this.pauseOverlay.setDepth(1000);

    // Add subtle animation
    this.tweens.add({
      targets: this.pauseOverlay,
      alpha: { from: 0, to: 1 },
      duration: 300,
      ease: 'Power2'
    });
  }

  private hidePauseOverlay(): void {
    if (!this.pauseOverlay) {
      return;
    }

    // Animate out and destroy
    this.tweens.add({
      targets: this.pauseOverlay,
      alpha: 0,
      duration: 300,
      ease: 'Power2',
      onComplete: () => {
        if (this.pauseOverlay) {
          this.pauseOverlay.destroy();
          this.pauseOverlay = null;
        }
      }
    });
  }

  private disablePlayerInput(): void {
    // Disable keyboard input processing
    this.input.keyboard?.disableGlobalCapture();
  }

  private enablePlayerInput(): void {
    // Re-enable keyboard input processing
    this.input.keyboard?.enableGlobalCapture();
  }

  private showPlayerDisconnectedNotification(data: {
    playerId: string;
    username: string;
    gracePeriod: number;
  }): void {
    // Create temporary notification
    const notification = this.add.container(
      this.cameras.main.width - 20,
      100
    );

    const background = this.add.rectangle(
      0, 0, 300, 60,
      0x333333, 0.9
    ).setOrigin(1, 0);

    const icon = this.add.text(-10, 10, '⚠️', {
      fontSize: '16px',
    }).setOrigin(1, 0);

    const text = this.add.text(-30, 10, `${data.username} disconnected`, {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffaa00',
    }).setOrigin(1, 0);

    const subText = this.add.text(-30, 30, `Reconnecting... (${Math.ceil(data.gracePeriod / 1000)}s)`, {
      fontSize: '12px',
      fontFamily: 'Arial, sans-serif',
      color: '#cccccc',
    }).setOrigin(1, 0);

    notification.add([background, icon, text, subText]);
    notification.setDepth(999);

    // Animate in
    notification.setAlpha(0);
    this.tweens.add({
      targets: notification,
      alpha: 1,
      duration: 300,
      ease: 'Power2'
    });

    // Auto-remove after grace period
    this.time.delayedCall(data.gracePeriod + 1000, () => {
      this.tweens.add({
        targets: notification,
        alpha: 0,
        duration: 300,
        ease: 'Power2',
        onComplete: () => notification.destroy()
      });
    });
  }

  private showPlayerReconnectedNotification(data: {
    playerId: string;
    username: string;
    disconnectionDuration: number;
  }): void {
    // Create temporary notification
    const notification = this.add.container(
      this.cameras.main.width - 20,
      100
    );

    const background = this.add.rectangle(
      0, 0, 300, 60,
      0x2d5016, 0.9
    ).setOrigin(1, 0);

    const icon = this.add.text(-10, 10, '✅', {
      fontSize: '16px',
    }).setOrigin(1, 0);

    const text = this.add.text(-30, 10, `${data.username} reconnected`, {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#4CAF50',
    }).setOrigin(1, 0);

    const downtime = Math.ceil(data.disconnectionDuration / 1000);
    const subText = this.add.text(-30, 30, `Welcome back! (${downtime}s offline)`, {
      fontSize: '12px',
      fontFamily: 'Arial, sans-serif',
      color: '#cccccc',
    }).setOrigin(1, 0);

    notification.add([background, icon, text, subText]);
    notification.setDepth(999);

    // Animate in
    notification.setAlpha(0);
    this.tweens.add({
      targets: notification,
      alpha: 1,
      duration: 300,
      ease: 'Power2'
    });

    // Auto-remove after 3 seconds
    this.time.delayedCall(3000, () => {
      this.tweens.add({
        targets: notification,
        alpha: 0,
        duration: 300,
        ease: 'Power2',
        onComplete: () => notification.destroy()
      });
    });
  }

  private setPlayerDisconnectedState(player: Player, disconnected: boolean): void {
    if (disconnected) {
      // Make player semi-transparent and add disconnected indicator
      player.setAlpha(0.5);
      player.setTint(0x666666);
    } else {
      // Restore normal appearance
      player.setAlpha(1);
      player.clearTint();
    }
  }

  private mapCharacterName(oldName: string): string {
    const characterMap: Record<string, string> = {
      FAST_LIGHTWEIGHT: 'DASH',
      BALANCED_ALLROUNDER: 'REX',
      HEAVY_HITTER: 'TITAN',
      // Also support new names directly
      DASH: 'DASH',
      REX: 'REX',
      TITAN: 'TITAN',
    };

    return characterMap[oldName] || 'REX'; // Default to REX if unknown
  }

  // Cleanup method for when scene is destroyed
  public destroy(): void {
    if (this.connectionStatusDisplay) {
      this.connectionStatusDisplay.destroy();
      this.connectionStatusDisplay = null;
    }
    
    if (this.pauseOverlay) {
      this.pauseOverlay.destroy();
      this.pauseOverlay = null;
    }
    
    // Note: Phaser Scene doesn't have a destroy method to call super on
    // The scene will be cleaned up by Phaser automatically
  }
}
