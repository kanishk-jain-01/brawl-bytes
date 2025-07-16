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
import { GAME_CONFIG, CharacterType, StageType } from '../utils/constants';
import { Player } from '../entities/Player';
import { Stage } from '../entities/Stage';
import { getSocketManager } from '../utils/socket';
import {
  createConnectionStatusDisplay,
  ConnectionStatusDisplay,
} from '../utils/ConnectionStatusDisplay';
import { InputManager } from '../managers/InputManager';
import { UIManager } from '../managers/UIManager';
import {
  NetworkManager,
  NetworkEventHandlers,
} from '../managers/NetworkManager';
import { CombatManager } from '../managers/CombatManager';
import { GameStateManager, MatchEndReason } from '../managers/GameStateManager';

export class GameScene extends Phaser.Scene {
  private selectedCharacter: CharacterType | null = null;

  private stage: Stage | null = null;

  private selectedStage: StageType = 'BATTLE_ARENA';

  private player: Player | null = null;

  private players: Player[] = [];

  private connectionStatusDisplay: ConnectionStatusDisplay | null = null;

  private cameraTarget: Phaser.GameObjects.GameObject | null = null;

  // Managers
  private inputManager: InputManager | null = null;

  private uiManager: UIManager | null = null;

  private networkManager: NetworkManager | null = null;

  private combatManager: CombatManager | null = null;

  private gameStateManager: GameStateManager | null = null;

  constructor() {
    super({ key: GAME_CONFIG.SCENE_KEYS.GAME });
  }

  create(): void {
    console.log('GameScene: Starting game');

    // Retrieve selected character from global state, fallback to default
    const rawCharacter = getState().selectedCharacter || 'BALANCED_ALLROUNDER';
    // Map old character names to new ones
    this.selectedCharacter = this.mapCharacterName(rawCharacter);
    console.log(`GameScene: Selected character - ${this.selectedCharacter}`);

    this.setupPhysics();
    this.createStage();
    this.setupCamera();
    this.initializeManagers();
    this.initializeConnectionStatusDisplay();
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
    this.combatManager?.handlePlayerFallOffStage(player);
  }

  private handlePlayerHitHazard(data: {
    player: Player;
    hazardType: string;
    damage: number;
    knockback: { x: number; y: number };
  }): void {
    this.combatManager?.handlePlayerHitHazard(data);
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

  private initializeManagers(): void {
    // Initialize input manager
    this.inputManager = new InputManager(this);
    this.inputManager.setupEscapeHandler(() => this.returnToCharacterSelect());

    // Initialize UI manager
    this.uiManager = new UIManager(this);
    if (this.player) {
      this.uiManager.createPlayerHUD(this.player);
    }

    // Initialize combat manager
    this.combatManager = new CombatManager(this);

    // Initialize game state manager
    this.gameStateManager = new GameStateManager(this, {
      onMatchEnd: (reason: MatchEndReason, winner?: Player) => {
        this.endMatch(reason, winner);
      },
      onPlayerDefeated: (playerId: string) => {
        this.handlePlayerDefeated(playerId);
      },
    });

    // Initialize network manager
    const networkHandlers: NetworkEventHandlers = {
      onPlayerJoined: data => this.handlePlayerJoined(data),
      onPlayerLeft: data => this.handlePlayerLeft(data),
      onGameEvent: data => this.handleGameEvent(data),
      onGamePaused: data => this.gameStateManager?.pauseGame(data),
      onGameResumed: data => this.gameStateManager?.resumeGame(data),
      onPlayerDisconnected: data => this.handlePlayerDisconnected(data),
      onPlayerReconnected: data => this.handlePlayerReconnected(data),
    };
    this.networkManager = new NetworkManager(this, networkHandlers);

    // Set up event listeners for manager coordination
    this.setupManagerEvents();
  }

  private setupManagerEvents(): void {
    // Listen for match timer updates
    this.events.on('matchTimerUpdate', (timeRemaining: number) => {
      this.uiManager?.updateMatchTimer(timeRemaining);
    });

    // Listen for hitbox collision setup requests
    this.events.on('setupHitboxCollision', (attackData: any) => {
      this.combatManager?.setupPlayerCollisions(attackData, this.players);
    });

    // Listen for server state updates from network manager
    this.events.on('serverState', (data: any) => {
      if (this.player) {
        this.player.applyServerState(
          data.position,
          data.velocity,
          data.sequence,
          data.timestamp
        );
      }
    });

    // Listen for position corrections from network manager
    this.events.on('positionCorrection', (data: any) => {
      if (this.player) {
        this.player.applyServerState(
          data.position,
          data.velocity,
          data.sequence,
          data.timestamp
        );
      }
    });
  }

  private initializeConnectionStatusDisplay(): void {
    const socketManager = getSocketManager();
    if (socketManager) {
      this.connectionStatusDisplay = createConnectionStatusDisplay(
        socketManager,
        {
          position: 'top-left',
          showOnlyOnProblems: true,
          autoHide: true,
          autoHideDelay: 3000,
        }
      );

      // Configure reconnection settings for game context
      socketManager.setReconnectionConfig({
        maxAttempts: 8, // More attempts during gameplay
        baseDelay: 1000, // 1 second base delay
        maxDelay: 15000, // Max 15 seconds between attempts
        backoffFactor: 1.4, // Moderate exponential backoff
      });

      console.log('Connection status display initialized for GameScene');
    }
  }

  private startMatch(): void {
    this.gameStateManager?.startMatch();
    console.log('GameScene: Match started');
  }

  private handlePlayerDefeated(playerId: string): void {
    console.log(`Player ${playerId} was defeated!`);

    // Check if match should end due to player elimination
    this.gameStateManager?.checkMatchEndConditions(this.players);
  }

  private endMatch(reason: MatchEndReason, winner?: Player): void {
    console.log(`GameScene: Match ended due to ${reason}`);

    // Show match results
    this.uiManager?.showMatchResults(reason, winner, this.players);

    // Return to character select after showing results
    this.time.delayedCall(3000, () => {
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
    if (!this.gameStateManager?.isGameStarted() || !this.player) return;

    // Skip input handling and player updates if game is paused
    if (!this.gameStateManager.isGamePaused()) {
      this.inputManager?.handlePlayerInput(this.player);

      // Update all players
      this.players.forEach(player => {
        player.update();
      });
    }

    // Always update UI and debug info (even when paused)
    this.updateUI();
  }

  private updateUI(): void {
    if (!this.player) return;

    this.uiManager?.updatePlayerHUD(this.player);

    if (this.selectedCharacter && this.gameStateManager) {
      this.uiManager?.updateDebugInfo(
        this.player,
        this.selectedCharacter,
        this.gameStateManager.isGamePaused(),
        this.gameStateManager.getPauseReason()
      );
    }
  }

  private handlePlayerJoined(data: {
    playerId: string;
    username: string;
  }): void {
    // Create a remote player if they don't exist
    if (!this.networkManager?.hasRemotePlayer(data.playerId)) {
      if (this.stage) {
        const spawnPoints = this.stage.getSpawnPoints();
        const spawnPoint =
          spawnPoints[Math.floor(Math.random() * spawnPoints.length)];
        const remotePlayer = this.networkManager?.createRemotePlayer(
          data.playerId,
          data.username,
          spawnPoint
        );
        if (remotePlayer) {
          this.players.push(remotePlayer);
          this.stage.setupPlayerCollisions(remotePlayer);
        }
      }
    }
  }

  private handlePlayerLeft(data: { playerId: string }): void {
    const remotePlayer = this.networkManager?.removeRemotePlayer(data.playerId);
    if (remotePlayer) {
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
        this.networkManager?.handleRemotePlayerHit(data.data);
        break;
      case 'player_ko':
        this.networkManager?.handleRemotePlayerKO(data.data);
        break;
      default:
        console.log('Unknown game event:', data);
    }
  }

  // Public getters for game state
  public isGamePaused(): boolean {
    return this.gameStateManager?.isGamePaused() || false;
  }

  public getPauseReason(): string | null {
    return this.gameStateManager?.getPauseReason() || null;
  }

  private handlePlayerDisconnected(data: {
    playerId: string;
    username: string;
    gracePeriod: number;
    gameState: string;
  }): void {
    console.log('Player disconnected:', data);

    // Show notification about disconnected player
    this.gameStateManager?.showPlayerDisconnectedNotification(data);

    // Mark remote player as disconnected if they exist
    this.networkManager?.setPlayerDisconnectedState(data.playerId, true);
  }

  private handlePlayerReconnected(data: {
    playerId: string;
    username: string;
    disconnectionDuration: number;
    gameState: string;
  }): void {
    console.log('Player reconnected:', data);

    // Show welcome back notification
    this.gameStateManager?.showPlayerReconnectedNotification(data);

    // Mark remote player as connected if they exist
    this.networkManager?.setPlayerDisconnectedState(data.playerId, false);
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

    // Cleanup managers
    this.inputManager?.destroy();
    this.uiManager?.destroy();
    this.networkManager?.destroy();
    this.combatManager?.destroy();
    this.gameStateManager?.destroy();

    // Reset manager references
    this.inputManager = null;
    this.uiManager = null;
    this.networkManager = null;
    this.combatManager = null;
    this.gameStateManager = null;

    // Note: Phaser Scene doesn't have a destroy method to call super on
    // The scene will be cleaned up by Phaser automatically
  }
}
