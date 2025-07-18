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
import { getSocketManager, SocketManager } from '@/managers/SocketManager';
import { getConnectionState } from '@/state/connectionStore';
import type { DamageInfo } from '@/types';
import { DamageType } from '@/types';
import { GAME_CONFIG, CharacterType, StageType } from '../utils/constants';
import { Player } from '../entities/Player';
import { Stage } from '../entities/Stage';
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
import { QuitConfirmationModal } from '../components/QuitConfirmationModal';

export class GameScene extends Phaser.Scene {
  private selectedCharacter: CharacterType | null = null;

  private stage: Stage | null = null;

  private selectedStage: StageType = 'BATTLE_ARENA';

  private player: Player | null = null;

  private players: Player[] = [];

  private connectionStatusDisplay: ConnectionStatusDisplay | null = null;

  private cameraTarget: Phaser.GameObjects.GameObject | null = null;

  // Game initialization data from server
  private gameData: {
    serverData: any;
    localPlayerId: string | undefined;
    remotePlayers: any[];
  } | null = null;

  // Managers
  private inputManager: InputManager | null = null;

  private uiManager: UIManager | null = null;

  private networkManager: NetworkManager | null = null;

  private combatManager: CombatManager | null = null;

  private gameStateManager: GameStateManager | null = null;

  // Quit confirmation modal
  private quitModal: QuitConfirmationModal | null = null;

  constructor() {
    super({ key: GAME_CONFIG.SCENE_KEYS.GAME });
  }

  create(): void {
    console.log('GameScene: Starting game');

    // Initialize from server's authoritative game start data
    this.initializeFromServerData();

    this.setupPhysics();
    this.createStage();
    this.setupCamera();
    this.initializeManagers();
    this.initializeConnectionStatusDisplay();
    this.startMatch();
  }

  private initializeFromServerData(): void {
    const gameState = getState();
    const serverData = gameState.gameStartData;

    // Fail fast: Multiplayer game requires server data
    if (!serverData) {
      throw new Error(
        'GameScene: Cannot initialize game without server data. This is a multiplayer game that requires active server connection.'
      );
    }

    console.log('GameScene: Initializing from server data:', serverData);

    // Strict validation of server data
    if (!serverData.stage) {
      throw new Error('GameScene: Server data missing stage selection.');
    }

    if (!serverData.players || !Array.isArray(serverData.players)) {
      throw new Error('GameScene: Server data missing players array.');
    }

    // Get local player ID from connectionStore
    const connectionState = getConnectionState();
    const localPlayerId = connectionState.userId;

    if (!localPlayerId) {
      throw new Error(
        'GameScene: Local player ID not found. Authentication required.'
      );
    }

    // Use server's authoritative stage selection
    this.selectedStage = serverData.stage;

    // Find local player from server data
    const localPlayerData = serverData.players.find(
      (p: any) => p.userId === localPlayerId
    );

    if (!localPlayerData) {
      throw new Error(
        `GameScene: Local player (${localPlayerId}) not found in server player data. Server/client desync detected.`
      );
    }

    if (!localPlayerData.character) {
      throw new Error(
        'GameScene: Local player missing character assignment from server.'
      );
    }

    this.selectedCharacter = this.mapCharacterName(localPlayerData.character);
    console.log(
      `GameScene: Local player character from server - ${this.selectedCharacter}`
    );

    // Store remote players data for NetworkManager
    this.gameData = {
      serverData,
      localPlayerId,
      remotePlayers: serverData.players.filter(
        (p: any) => p.userId !== localPlayerId
      ),
    };

    console.log(
      `GameScene: Initialized from server - Character: ${this.selectedCharacter}, Stage: ${this.selectedStage}, Remote Players: ${this.gameData.remotePlayers.length}`
    );
  }

  private initializeRemotePlayers(): void {
    // Fail fast: All required components must be available
    if (!this.gameData) {
      throw new Error(
        'GameScene: Cannot initialize remote players without game data.'
      );
    }

    if (!this.stage) {
      throw new Error(
        'GameScene: Cannot initialize remote players without stage.'
      );
    }

    if (!this.networkManager) {
      throw new Error(
        'GameScene: Cannot initialize remote players without network manager.'
      );
    }

    const spawnPoints = this.stage.getSpawnPoints();
    let spawnIndex = 1; // Start from index 1, assuming local player uses index 0

    this.gameData.remotePlayers.forEach((playerData: any) => {
      // Strict validation of remote player data
      if (!playerData.userId) {
        throw new Error('GameScene: Remote player missing userId.');
      }

      if (!playerData.username) {
        throw new Error('GameScene: Remote player missing username.');
      }

      if (!playerData.character) {
        throw new Error(
          `GameScene: Remote player ${playerData.username} missing character assignment from server.`
        );
      }

      const spawnPoint = spawnPoints[spawnIndex % spawnPoints.length];
      const characterType = this.mapCharacterName(playerData.character);

      // Create remote player with server-provided character type
      const remotePlayer = this.networkManager!.createRemotePlayerWithCharacter(
        playerData.userId,
        playerData.username,
        spawnPoint,
        characterType
      );

      if (!remotePlayer) {
        throw new Error(
          `GameScene: Failed to create remote player ${playerData.username}.`
        );
      }

      this.players.push(remotePlayer);
      this.stage!.setupPlayerCollisions(remotePlayer);

      console.log(
        `GameScene: Created remote player ${playerData.username} with character ${characterType}`
      );
      spawnIndex += 1;
    });

    console.log(
      `GameScene: Initialized ${this.gameData.remotePlayers.length} remote players from server data`
    );
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

    // Set up stage collisions for player
    this.stage.setupPlayerCollisions(this.player);

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
    this.inputManager.setupEscapeHandler(() => this.handleEscapePressed());

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
      onPlayerQuit: data => this.handlePlayerQuit(data),
      onMatchEnd: data => this.handleMatchEnd(data),
      onGameEvent: data => this.handleGameEvent(data),
      onGamePaused: data => this.gameStateManager?.pauseGame(data),
      onGameResumed: data => this.gameStateManager?.resumeGame(data),
      onPlayerDisconnected: data => this.handlePlayerDisconnected(data),
      onPlayerReconnected: data => this.handlePlayerReconnected(data),
    };
    this.networkManager = new NetworkManager(this, networkHandlers);

    // Initialize remote players from server data if available
    this.initializeRemotePlayers();

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

      // Reconnection is now handled by connectionStore with built-in configuration

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

  private handleEscapePressed(): void {
    // Don't show modal if one is already visible
    if (this.quitModal?.isVisible()) {
      return;
    }

    const isInMatch = this.gameStateManager?.isGameStarted() || false;

    this.quitModal = new QuitConfirmationModal({
      isInMatch,
      onConfirm: () => this.confirmQuit(isInMatch),
      onCancel: () => {
        // Modal automatically hides itself
        this.quitModal = null;
      },
    });

    this.quitModal.show();
  }

  private confirmQuit(isInMatch: boolean): void {
    console.log('GameScene: Player confirmed quit, isInMatch:', isInMatch);

    if (isInMatch) {
      // Send quit signal to server for match forfeit
      SocketManager.emit('playerQuit');
    }

    // Return to appropriate scene
    this.returnToCharacterSelect();
  }

  private returnToCharacterSelect(): void {
    // eslint-disable-next-line no-console
    console.log('GameScene: Returning to character select');

    // Clean up modal if it exists
    if (this.quitModal) {
      this.quitModal.hide();
      this.quitModal = null;
    }

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

  private handlePlayerQuit(data: {
    playerId: string;
    username: string;
    remainingPlayers: number;
  }): void {
    console.log(
      `Player quit: ${data.username} (${data.playerId}), remaining: ${data.remainingPlayers}`
    );

    // Show notification that player quit (fallback to console if no notification system)
    console.log(`Player quit: ${data.username} quit the match`);

    // Remove the player from the local players list if they exist
    const playerIndex = this.players.findIndex(
      p => p.playerId === data.playerId
    );
    if (playerIndex !== -1) {
      const player = this.players[playerIndex];
      player.destroy();
      this.players.splice(playerIndex, 1);
    }

    // Also remove via network manager
    const remotePlayer = this.networkManager?.removeRemotePlayer(data.playerId);
    if (remotePlayer) {
      const index = this.players.indexOf(remotePlayer);
      if (index > -1) {
        this.players.splice(index, 1);
      }
    }
  }

  private handleMatchEnd(data: {
    winnerId?: string;
    winnerUsername?: string;
    endReason: string;
    matchDuration: number;
  }): void {
    console.log('Match ended:', data);

    // Determine match end reason
    let reason: MatchEndReason;
    switch (data.endReason) {
      case 'knockout':
        reason = 'elimination';
        break;
      case 'timeout':
        reason = 'timer';
        break;
      case 'forfeit':
      case 'disconnect':
        reason = 'elimination'; // Treat forfeit/disconnect as elimination
        break;
      default:
        reason = 'elimination';
    }

    // Find winner player object
    let winner: Player | undefined;
    if (data.winnerId) {
      winner = this.players.find(p => p.playerId === data.winnerId);

      // If winner not found in current players (e.g., they quit),
      // create a temporary winner object to identify local vs remote winner
      if (!winner) {
        const connectionState = getConnectionState();
        const isLocalWinner = data.winnerId === connectionState.userId;

        // Create a minimal winner object to indicate if local player won
        winner = {
          isLocalPlayer: isLocalWinner,
          playerId: data.winnerId,
          getCharacterData: () => ({ name: data.winnerUsername || 'Unknown' }),
        } as Player;
      }
    }

    // End the match
    this.endMatch(reason, winner);
  }

  private handleGameEvent(data: any): void {
    switch (data.type) {
      case 'player_hit':
        this.networkManager?.handleRemotePlayerHit(data.data);
        break;
      case 'player_hit_receive':
        // This player should take damage from remote attacker
        this.handleReceiveDamage(data.data);
        break;
      case 'player_ko':
        this.networkManager?.handleRemotePlayerKO(data.data);
        break;
      default:
        console.log('Unknown game event:', data);
    }
  }

  private handleReceiveDamage(data: {
    attackerId: string;
    damage: number;
    damageType: string;
    knockback: { x: number; y: number };
    isCritical: boolean;
  }): void {
    if (this.player) {
      const damageInfo: DamageInfo = {
        amount: data.damage,
        type: data.damageType as DamageType,
        knockback: data.knockback,
        isCritical: data.isCritical,
        source: `remote_attack_${data.attackerId}`,
      };

      this.player.takeDamage(damageInfo);
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

  // eslint-disable-next-line class-methods-use-this
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

    // Clean up quit modal if it exists
    if (this.quitModal) {
      this.quitModal.hide();
      this.quitModal = null;
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
