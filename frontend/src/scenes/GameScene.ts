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
import type { DamageInfo, MatchTimerUpdate } from '@/types';
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

    // Force cleanup if there are leftover players from previous sessions
    if (this.players.length > 0 || this.uiManager || this.networkManager) {
      this.cleanup();
    }

    // Initialize from server's authoritative game start data
    this.initializeFromServerData();

    this.setupPhysics();
    this.createStage();
    this.setupCamera();
    this.initializeManagers();
    this.initializeConnectionStatusDisplay();
    this.startMatch();

    // Set up tab visibility handling for proper timer synchronization
    this.setupVisibilityHandling();

    console.log('GameScene: Scene initialized');
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
    const connectionState = getConnectionState();
    const localPlayerId = connectionState.userId;

    // Process all players from server data to maintain consistent spawn assignment
    if (this.gameData.serverData?.players) {
      this.gameData.serverData.players.forEach(
        (playerData: any, index: number) => {
          // Skip the local player
          if (playerData.userId === localPlayerId) {
            return;
          }

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

          // Use the same index from server data to ensure consistent spawn assignment
          const safeSpawnIndex = Math.min(index, spawnPoints.length - 1);
          const spawnPoint = spawnPoints[safeSpawnIndex];
          const characterType = this.mapCharacterName(playerData.character);

          console.log(
            `GameScene: Creating remote player ${playerData.username} at spawn point ${safeSpawnIndex}: (${spawnPoint.x}, ${spawnPoint.y})`
          );

          // Create remote player with server-provided character type
          const remotePlayer =
            this.networkManager!.createRemotePlayerWithCharacter(
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
            `GameScene: Created remote player ${playerData.username} with character ${characterType} at spawn ${safeSpawnIndex}`
          );
        }
      );
    }

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

    // Physics debugging disabled for production-ready visuals
    // if (process.env.NODE_ENV === 'development') {
    //   this.physics.world.createDebugGraphic();
    // }
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

    // Find the local player's assigned spawn index from server data
    const connectionState = getConnectionState();
    const localPlayerId = connectionState.userId;
    let spawnIndex = 0; // Default to first spawn point

    // Find local player data to get username
    let localPlayerUsername = 'Local Player'; // Default fallback
    if (this.gameData?.serverData?.players) {
      const playerIndex = this.gameData.serverData.players.findIndex(
        (p: any) => p.userId === localPlayerId
      );
      if (playerIndex !== -1) {
        spawnIndex = playerIndex;
        const localPlayerData = this.gameData.serverData.players[playerIndex];
        if (localPlayerData.username) {
          localPlayerUsername = localPlayerData.username;
        }
      }
    }

    // Ensure spawn index is within bounds
    const safeSpawnIndex = Math.min(spawnIndex, spawnPoints.length - 1);
    const spawnPoint = spawnPoints[safeSpawnIndex];

    console.log(
      `GameScene: Creating local player ${localPlayerUsername} at spawn point ${safeSpawnIndex}: (${spawnPoint.x}, ${spawnPoint.y})`
    );

    // Create main player
    this.player = new Player({
      scene: this,
      x: spawnPoint.x,
      y: spawnPoint.y,
      characterType: this.selectedCharacter,
      playerId: localPlayerId || 'local_player',
      isLocalPlayer: true,
      username: localPlayerUsername,
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
      onMatchTimerUpdate: data => this.handleMatchTimerUpdate(data),
      onGamePaused: data => this.gameStateManager?.pauseGame(data),
      onGameResumed: data => this.gameStateManager?.resumeGame(data),
      onPlayerDisconnected: data => this.handlePlayerDisconnected(data),
      onPlayerReconnected: data => this.handlePlayerReconnected(data),
    };
    this.networkManager = new NetworkManager(this, networkHandlers);

    // Initialize remote players from server data if available
    this.initializeRemotePlayers();

    // Create HUDs for all players (local + remote)
    if (this.uiManager && this.players.length > 0) {
      this.uiManager.createAllPlayerHUDs(this.players);
    }

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

    // Leave the current room to ensure fresh state for next match
    SocketManager.emit('leaveRoom');

    // Clean up modal if it exists
    if (this.quitModal) {
      this.quitModal.hide();
      this.quitModal = null;
    }

    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      // Ensure current scene is fully stopped before starting new one
      this.scene.stop();
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

    // Update all player HUDs
    if (this.players.length > 0) {
      this.uiManager?.updateAllPlayerHUDs(this.players);
    }

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

          // Refresh HUDs to include new player
          if (this.uiManager) {
            this.uiManager.createAllPlayerHUDs(this.players);
          }
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

    // Show notification about reconnected player
    this.gameStateManager?.showPlayerReconnectedNotification(data);

    // Mark remote player as reconnected if they exist
    this.networkManager?.setPlayerDisconnectedState(data.playerId, false);
  }

  private handleMatchTimerUpdate(data: MatchTimerUpdate): void {
    // Forward server timer updates to the game state manager
    this.gameStateManager?.handleServerTimerUpdate(data);
  }

  /**
   * Set up handling for page visibility changes to prevent timer desync
   * when players switch tabs
   */
  private setupVisibilityHandling(): void {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log(
          'GameScene: Tab became hidden - server maintains authoritative time'
        );
      } else {
        console.log(
          'GameScene: Tab became visible - syncing with server state'
        );
        this.handleTabBecameVisible();
      }
    };

    // Listen for visibility change events
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Clean up listener when scene is destroyed
    this.events.once('shutdown', () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    });
  }

  /**
   * Handle when tab becomes visible after being hidden
   */
  private handleTabBecameVisible(): void {
    // With server-authoritative timing, we don't need to pause/resume anything
    // The server continues running and will send us the latest state

    // Request a fresh game state sync from server to ensure we're up to date
    const socketManager = getSocketManager();
    if (socketManager && SocketManager.isConnected()) {
      SocketManager.emit('requestGameStateSync', {
        reason: 'tab_visibility_change',
        timestamp: Date.now(),
      });
    }

    // Update UI elements that might have stale state
    this.updateUI();
  }

  // eslint-disable-next-line class-methods-use-this
  private mapCharacterName(characterName: string): string {
    // Validate character name and return as-is (no legacy mapping needed)
    const validCharacters = ['DASH', 'REX', 'TITAN', 'NINJA'];

    if (validCharacters.includes(characterName)) {
      return characterName;
    }

    throw new Error(`Invalid character name: ${characterName}`);
  }

  // Cleanup method for when scene is shutdown (scene transitions)
  public shutdown(): void {
    console.log('GameScene: Shutting down');
    this.cleanup();
  }

  // Cleanup method for when scene is destroyed
  public destroy(): void {
    console.log('GameScene: Destroying');
    this.cleanup();
  }

  private cleanup(): void {
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

    // Clear players array and properly destroy player objects
    this.players.forEach(player => {
      player.destroy();
    });
    this.players = [];
    this.player = null;
    this.stage = null;
    this.gameData = null;
  }
}
