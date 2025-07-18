/*
 * Pre-Match Lobby Scene (Zustand Integration)
 * ------------------------------------------
 * Displays the lobby before a match starts, using centralized Zustand store
 * for state management. Shows:
 * - All players in the room with their selected characters
 * - Ready status for each player
 * - Selected stage information
 * - Match countdown when all players are ready
 * - Host controls for starting the match
 *
 * This scene coordinates between character/stage selection and the actual game.
 */

import Phaser from 'phaser';
import { getSocketManager, SocketManager } from '@/managers/SocketManager';
import {
  lobbyStore,
  subscribeToLobby,
  useRoom,
  useLocalPlayer,
  useLobbyUI,
  type LobbyPlayer,
} from '@/state/lobbyStore';
import { getConnectionState } from '@/state/connectionStore';
import { GAME_CONFIG } from '../utils/constants';
import { updateState } from '../state/GameState';
import { MatchPlayer } from '../types/GameState';

export class PreMatchLobbyScene extends Phaser.Scene {
  private playerCards: Phaser.GameObjects.Container[] = [];

  private stageDisplay: Phaser.GameObjects.Container | null = null;

  private readyButton: Phaser.GameObjects.Container | null = null;

  private leaveButton: Phaser.GameObjects.Container | null = null;

  private countdownText: Phaser.GameObjects.Text | null = null;

  private statusText: Phaser.GameObjects.Text | null = null;

  private socketManager = getSocketManager();

  private unsubscribeLobby: (() => void) | null = null;

  constructor() {
    super({ key: GAME_CONFIG.SCENE_KEYS.LOBBY });
  }

  create(): void {
    console.log(
      'PreMatchLobbyScene: Starting pre-match lobby with Zustand store'
    );

    // Reset scene state when entering/re-entering
    this.playerCards = [];
    this.stageDisplay = null;
    this.readyButton = null;
    this.leaveButton = null;
    this.countdownText = null;
    this.statusText = null;
    this.unsubscribeLobby = null;

    // Strict validation - fail if required data not loaded from database
    PreMatchLobbyScene.validateGameData();

    // Subscribe to lobby store changes
    this.setupStoreSubscription();

    // Create UI
    this.createBackground();
    this.createTitle();
    this.createPlayerArea();
    this.createStageDisplay();
    this.createControlButtons();
    this.createStatusArea();
    this.setupInputs();

    // Initialize lobby state or start matchmaking
    this.initializeLobby();
  }

  private static validateGameData(): void {
    if (
      !GAME_CONFIG.CHARACTERS ||
      Object.keys(GAME_CONFIG.CHARACTERS).length === 0
    ) {
      throw new Error(
        'Character data not loaded from database. Cannot display player lobby.'
      );
    }

    if (!GAME_CONFIG.STAGES || Object.keys(GAME_CONFIG.STAGES).length === 0) {
      throw new Error(
        'Stage data not loaded from database. Cannot display stage information.'
      );
    }

    if (!GAME_CONFIG.UI.COLORS || !GAME_CONFIG.UI.FONTS) {
      throw new Error(
        'UI constants not loaded from database. Cannot create lobby interface.'
      );
    }
  }

  private setupStoreSubscription(): void {
    // Subscribe to lobby store changes for reactive UI updates
    this.unsubscribeLobby = subscribeToLobby(() => {
      // Update UI when store state changes
      this.updatePlayerCards();
      this.updateStageDisplay();
      this.updateControlButtons();
      this.updateStatusText();
      this.updateCountdownDisplay();
    });

    // Listen for game started event from socket
    if (this.socketManager) {
      this.socketManager.on('gameStarted', (data: any) => {
        console.log('PreMatchLobbyScene: Received gameStarted event:', data);
        this.transitionToGame(data);
      });

      // Listen for host change events
      this.socketManager.on('hostChanged', (data: any) => {
        console.log('PreMatchLobbyScene: Host changed:', data);
        if (data.newHostId) {
          const connectionState = getConnectionState();
          if (data.newHostId === connectionState.userId) {
            lobbyStore.getState().setStatusMessage('You are now the host!');
          }
        }
      });
    }
  }

  private initializeLobby(): void {
    if (!this.socketManager || !SocketManager.isAuthenticated()) {
      console.error('Cannot start lobby: not authenticated');
      lobbyStore.getState().setError('Not authenticated');
      return;
    }

    // Check if we're already in a room (created by stage selection)
    const connectionState = getConnectionState();
    if (connectionState.currentRoomId) {
      console.log('Already in room, requesting room state...');
      SocketManager.requestRoomState();
    } else {
      // Wait for room creation from stage selection
      // The backend should have created a room when stage was selected
      console.log('Waiting for room state from server...');
      lobbyStore.getState().setStatusMessage('Creating room...');

      // Request room state in case it was created but not communicated
      setTimeout(() => {
        SocketManager.requestRoomState();
      }, 500);
    }
  }

  private createBackground(): void {
    const { width, height } = this.cameras.main;

    // Try to create jungle clearing video background
    try {
      const clearingVideo = this.add.video(
        width / 2,
        height / 2,
        'jungle_clearing'
      );
      if (clearingVideo) {
        // Set depth first
        clearingVideo.setDepth(-1);
        clearingVideo.setOrigin(0.5, 0.5); // Center the video

        // Wait for video metadata to load
        clearingVideo.on('loadeddata', () => {
          // Get video's native dimensions
          const videoElement = clearingVideo.video;
          if (!videoElement) {
            console.warn('Video element is null, cannot get dimensions');
            return;
          }

          const { videoWidth } = videoElement;
          const { videoHeight } = videoElement;

          console.log(
            `Jungle clearing video native size: ${videoWidth}x${videoHeight}, Screen: ${width}x${height}`
          );

          // Calculate aspect ratios
          const videoAspect = videoWidth / videoHeight;
          const screenAspect = width / height;

          let newWidth;
          let newHeight;

          if (videoAspect > screenAspect) {
            // Video is wider - fit to height
            newHeight = height;
            newWidth = height * videoAspect;
          } else {
            // Video is taller - fit to width
            newWidth = width;
            newHeight = width / videoAspect;
          }

          // Apply the calculated size
          clearingVideo.setDisplaySize(newWidth, newHeight);

          console.log(
            `Applied jungle clearing video size: ${newWidth}x${newHeight}`
          );
        });

        // Start playing
        clearingVideo.play(true); // Loop the video

        // Add subtle overlay for better text readability
        this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.3);

        // Add some visual elements for better structure
        this.add
          .rectangle(width / 2, 80, width - 40, 100, 0x000000, 0.4)
          .setStrokeStyle(2, 0xf39c12);
        return;
      }
    } catch (error) {
      console.warn(
        'Failed to load jungle clearing video background, falling back to gradient:',
        error
      );
    }

    // Fallback to original gradient background
    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

    // Add some visual elements
    this.add
      .rectangle(width / 2, 80, width - 40, 100, 0x16213e)
      .setStrokeStyle(2, 0x0f3460);
  }

  private createTitle(): void {
    this.add
      .text(this.cameras.main.centerX, 80, 'PRE-MATCH LOBBY', {
        fontSize: '32px',
        fontFamily: GAME_CONFIG.UI.FONTS.PRIMARY,
        color: GAME_CONFIG.UI.COLORS.TEXT,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
  }

  private createPlayerArea(): void {
    const playerAreaY = 180;

    // Player area background
    this.add
      .rectangle(
        this.cameras.main.centerX,
        playerAreaY + 90,
        this.cameras.main.width - 40,
        200,
        0x2c3e50
      )
      .setStrokeStyle(2, 0x34495e);

    // Title for player area
    this.add
      .text(this.cameras.main.centerX, playerAreaY - 20, 'PLAYERS', {
        fontSize: '24px',
        fontFamily: GAME_CONFIG.UI.FONTS.PRIMARY,
        color: GAME_CONFIG.UI.COLORS.TEXT,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
  }

  private createStageDisplay(): void {
    const stageY = 420;

    this.stageDisplay = this.add.container(this.cameras.main.centerX, stageY);

    // Stage display background
    const stageBg = this.add.rectangle(0, 0, 400, 120, 0x34495e);
    stageBg.setStrokeStyle(2, 0x27ae60);
    this.stageDisplay.add(stageBg);

    // Stage title
    const stageTitle = this.add
      .text(0, -40, 'SELECTED STAGE', {
        fontSize: '18px',
        fontFamily: GAME_CONFIG.UI.FONTS.PRIMARY,
        color: GAME_CONFIG.UI.COLORS.TEXT,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.stageDisplay.add(stageTitle);

    // Placeholder text (will be updated by subscription)
    const placeholderText = this.add
      .text(0, 0, 'No stage selected', {
        fontSize: '16px',
        fontFamily: GAME_CONFIG.UI.FONTS.SECONDARY,
        color: GAME_CONFIG.UI.COLORS.TEXT_SECONDARY,
        align: 'center',
      })
      .setOrigin(0.5);
    this.stageDisplay.add(placeholderText);
  }

  private createControlButtons(): void {
    this.createReadyButton();
    this.createLeaveButton();
  }

  private createReadyButton(): void {
    this.readyButton = this.add.container(200, this.cameras.main.height - 80);

    const readyBg = this.add.rectangle(0, 0, 140, 50, 0x7f8c8d);
    readyBg.setStrokeStyle(2, 0x95a5a6);
    this.readyButton.add(readyBg);

    const readyText = this.add
      .text(0, 0, 'READY', {
        fontSize: '18px',
        fontFamily: GAME_CONFIG.UI.FONTS.PRIMARY,
        color: GAME_CONFIG.UI.COLORS.TEXT,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.readyButton.add(readyText);

    readyBg.setInteractive();
    readyBg.on('pointerdown', () => this.toggleReady());
    readyBg.on('pointerover', () => {
      readyBg.setFillStyle(0x95a5a6);
      this.tweens.add({
        targets: this.readyButton,
        scaleX: 1.1,
        scaleY: 1.1,
        duration: 100,
      });
    });
    readyBg.on('pointerout', () => {
      const { localPlayer } = useLocalPlayer();
      const color = localPlayer.isReady ? 0x27ae60 : 0x7f8c8d;
      readyBg.setFillStyle(color);
      this.tweens.add({
        targets: this.readyButton,
        scaleX: 1,
        scaleY: 1,
        duration: 100,
      });
    });
  }

  private createLeaveButton(): void {
    this.leaveButton = this.add.container(
      this.cameras.main.width - 300,
      this.cameras.main.height - 80
    );

    const leaveBg = this.add.rectangle(0, 0, 140, 50, 0xe74c3c);
    leaveBg.setStrokeStyle(2, 0xc0392b);
    this.leaveButton.add(leaveBg);

    const leaveText = this.add
      .text(0, 0, 'LEAVE LOBBY', {
        fontSize: '16px',
        fontFamily: GAME_CONFIG.UI.FONTS.PRIMARY,
        color: GAME_CONFIG.UI.COLORS.TEXT,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.leaveButton.add(leaveText);

    leaveBg.setInteractive();
    leaveBg.on('pointerdown', () => this.leaveLobby());
    leaveBg.on('pointerover', () => {
      leaveBg.setFillStyle(0xc0392b);
      this.tweens.add({
        targets: this.leaveButton,
        scaleX: 1.1,
        scaleY: 1.1,
        duration: 100,
      });
    });
    leaveBg.on('pointerout', () => {
      leaveBg.setFillStyle(0xe74c3c);
      this.tweens.add({
        targets: this.leaveButton,
        scaleX: 1,
        scaleY: 1,
        duration: 100,
      });
    });
  }

  private createStatusArea(): void {
    this.statusText = this.add
      .text(this.cameras.main.centerX, 570, 'Waiting for players...', {
        fontSize: '18px',
        fontFamily: GAME_CONFIG.UI.FONTS.PRIMARY,
        color: GAME_CONFIG.UI.COLORS.TEXT_SECONDARY,
        align: 'center',
      })
      .setOrigin(0.5);

    this.countdownText = this.add
      .text(this.cameras.main.centerX, 600, '', {
        fontSize: '32px',
        fontFamily: GAME_CONFIG.UI.FONTS.PRIMARY,
        color: GAME_CONFIG.UI.COLORS.SUCCESS,
        fontStyle: 'bold',
        align: 'center',
      })
      .setOrigin(0.5);
  }

  private updatePlayerCards(): void {
    // Guard: Don't update if scene isn't properly initialized
    if (!this.cameras?.main?.centerX) {
      return;
    }

    // Clear existing cards
    this.playerCards.forEach(card => card.destroy());
    this.playerCards = [];

    const { currentRoom } = useRoom();
    const { players } = currentRoom;

    if (players.length === 0) return;

    const cardWidth = 250;
    const cardHeight = 180;
    const spacing = 30;
    const startX =
      this.cameras.main.centerX -
      ((players.length - 1) * (cardWidth + spacing)) / 2;
    const cardY = 280;

    players.forEach((player, index) => {
      const x = startX + index * (cardWidth + spacing);
      const card = this.createPlayerCard(
        player,
        x,
        cardY,
        cardWidth,
        cardHeight
      );
      this.playerCards.push(card);
    });
  }

  private createPlayerCard(
    player: LobbyPlayer,
    x: number,
    y: number,
    width: number,
    height: number
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    // Card background - different colors for ready/not ready
    const bgColor = player.isReady ? 0x27ae60 : 0x2c3e50;
    let borderColor: number;
    if (player.isHost) {
      borderColor = 0xf39c12;
    } else if (player.isReady) {
      borderColor = 0x2ecc71;
    } else {
      borderColor = 0x7f8c8d;
    }

    const cardBg = this.add.rectangle(0, 0, width, height, bgColor);
    cardBg.setStrokeStyle(3, borderColor);
    container.add(cardBg);

    // Player name
    const nameText = this.add
      .text(0, -60, player.username, {
        fontSize: '18px',
        fontFamily: GAME_CONFIG.UI.FONTS.PRIMARY,
        color: GAME_CONFIG.UI.COLORS.TEXT,
        fontStyle: 'bold',
        align: 'center',
      })
      .setOrigin(0.5);
    container.add(nameText);

    // Host indicator
    if (player.isHost) {
      const hostIndicator = this.add
        .text(0, -35, '👑 HOST', {
          fontSize: '14px',
          fontFamily: GAME_CONFIG.UI.FONTS.SECONDARY,
          color: '#f39c12',
          align: 'center',
        })
        .setOrigin(0.5);
      container.add(hostIndicator);
    }

    // Character display
    if (player.character && GAME_CONFIG.CHARACTERS[player.character]) {
      const characterData = GAME_CONFIG.CHARACTERS[player.character];

      const characterName = this.add
        .text(0, 0, characterData.name, {
          fontSize: '16px',
          fontFamily: GAME_CONFIG.UI.FONTS.SECONDARY,
          color: GAME_CONFIG.UI.COLORS.TEXT,
          align: 'center',
        })
        .setOrigin(0.5);
      container.add(characterName);

      // Character stats preview
      const statsText = `ATK: ${characterData.attackDamage} | HP: ${characterData.health}`;
      const statsDisplay = this.add
        .text(0, 20, statsText, {
          fontSize: '12px',
          fontFamily: GAME_CONFIG.UI.FONTS.SECONDARY,
          color: GAME_CONFIG.UI.COLORS.TEXT_SECONDARY,
          align: 'center',
        })
        .setOrigin(0.5);
      container.add(statsDisplay);
    } else {
      const noCharText = this.add
        .text(0, 0, 'No character selected', {
          fontSize: '14px',
          fontFamily: GAME_CONFIG.UI.FONTS.SECONDARY,
          color: GAME_CONFIG.UI.COLORS.TEXT_SECONDARY,
          align: 'center',
        })
        .setOrigin(0.5);
      container.add(noCharText);
    }

    // Ready status
    const readyStatus = this.add
      .text(0, 50, player.isReady ? '✓ READY' : '○ NOT READY', {
        fontSize: '14px',
        fontFamily: GAME_CONFIG.UI.FONTS.SECONDARY,
        color: player.isReady ? '#2ecc71' : '#e74c3c',
        fontStyle: 'bold',
        align: 'center',
      })
      .setOrigin(0.5);
    container.add(readyStatus);

    // Connection indicator
    const connectionColor = player.connected ? '#2ecc71' : '#e74c3c';
    const connectionText = player.connected ? '● Online' : '● Offline';
    const connectionStatus = this.add
      .text(0, 70, connectionText, {
        fontSize: '12px',
        fontFamily: GAME_CONFIG.UI.FONTS.SECONDARY,
        color: connectionColor,
        align: 'center',
      })
      .setOrigin(0.5);
    container.add(connectionStatus);

    return container;
  }

  private updateStageDisplay(): void {
    if (!this.stageDisplay) return;

    const { currentRoom } = useRoom();
    const { selectedStage } = currentRoom;

    // Clear existing content (except background and title)
    const children = this.stageDisplay.list.slice(2); // Keep first 2 elements
    children.forEach(child => child.destroy());

    if (selectedStage && GAME_CONFIG.STAGES[selectedStage]) {
      const stageData = GAME_CONFIG.STAGES[selectedStage];

      // Stage name
      const stageName = this.add
        .text(0, 0, stageData.name, {
          fontSize: '20px',
          fontFamily: GAME_CONFIG.UI.FONTS.PRIMARY,
          color: GAME_CONFIG.UI.COLORS.TEXT,
          fontStyle: 'bold',
          align: 'center',
        })
        .setOrigin(0.5);
      this.stageDisplay.add(stageName);

      // Stage description
      const stageDesc = this.add
        .text(0, 25, stageData.description, {
          fontSize: '14px',
          fontFamily: GAME_CONFIG.UI.FONTS.SECONDARY,
          color: GAME_CONFIG.UI.COLORS.TEXT_SECONDARY,
          align: 'center',
          wordWrap: { width: 350 },
        })
        .setOrigin(0.5);
      this.stageDisplay.add(stageDesc);
    } else {
      // No stage selected
      const placeholderText = this.add
        .text(0, 0, 'No stage selected', {
          fontSize: '16px',
          fontFamily: GAME_CONFIG.UI.FONTS.SECONDARY,
          color: GAME_CONFIG.UI.COLORS.TEXT_SECONDARY,
          align: 'center',
        })
        .setOrigin(0.5);
      this.stageDisplay.add(placeholderText);
    }
  }

  private updateControlButtons(): void {
    if (!this.readyButton) return;

    const { localPlayer } = useLocalPlayer();

    // Update ready button - with safety checks
    const readyBg = this.readyButton.list[0] as Phaser.GameObjects.Rectangle;
    const readyText = this.readyButton.list[1] as Phaser.GameObjects.Text;

    if (
      readyBg &&
      typeof readyBg.setFillStyle === 'function' &&
      readyText &&
      typeof readyText.setText === 'function'
    ) {
      if (localPlayer.isReady) {
        readyBg.setFillStyle(0x27ae60);
        readyText.setText('NOT READY');
      } else {
        readyBg.setFillStyle(0x7f8c8d);
        readyText.setText('READY');
      }
    }
  }

  private updateStatusText(): void {
    // Guard: Don't update if statusText isn't properly initialized
    if (!this.statusText || !this.scene.isActive()) {
      return;
    }

    const { statusMessage } = useLobbyUI();
    const { getRoomStatus } = useRoom();
    const roomStatus = getRoomStatus;

    // Use lobby store status message or generate one
    let message = statusMessage;

    if (message === 'Waiting for players...' && roomStatus.playerCount > 0) {
      if (roomStatus.playerCount < 2) {
        message = 'Waiting for more players...';
      } else if (roomStatus.readyCount < roomStatus.playerCount) {
        message = `${roomStatus.readyCount}/${roomStatus.playerCount} players ready`;
      } else {
        const connectionState = getConnectionState();
        const localPlayerId = connectionState.userId;
        const { currentRoom } = useRoom();
        const localPlayerInRoom = currentRoom.players.find(
          p => p.id === localPlayerId
        );
        const isHost = localPlayerInRoom?.isHost || false;

        if (isHost) {
          message = 'All players ready! You can start the game.';
        } else {
          message = 'All players ready! Waiting for host to start...';
        }
      }
    }

    this.statusText.setText(message);
  }

  private updateCountdownDisplay(): void {
    if (!this.countdownText) return;

    const { countdown } = useLobbyUI();

    if (countdown.active) {
      this.countdownText.setText(countdown.message);
      this.countdownText.setVisible(true);
    } else {
      this.countdownText.setText('');
      this.countdownText.setVisible(false);
    }
  }

  private toggleReady(): void {
    if (!this.socketManager) return;

    const { localPlayer, setPlayerReady } = useLocalPlayer();
    const newReadyState = !localPlayer.isReady;

    console.log(
      `Toggling ready state from ${localPlayer.isReady} to ${newReadyState}`
    );

    // Update local state immediately for responsive UI
    setPlayerReady(newReadyState);

    // Send to server
    SocketManager.setPlayerReady(newReadyState);
  }

  private setupInputs(): void {
    // ESC key to leave lobby
    this.input.keyboard?.addKey('ESC').on('down', () => {
      this.leaveLobby();
    });

    // Space key to toggle ready
    this.input.keyboard?.addKey('SPACE').on('down', () => {
      this.toggleReady();
    });
  }

  private transitionToGame(gameStartData?: any): void {
    console.log('PreMatchLobbyScene: Transitioning to game');

    // Fail fast: Require server's authoritative game start data
    if (!gameStartData) {
      throw new Error(
        'Cannot start game: No server data received. Game requires active server connection.'
      );
    }

    const serverData = gameStartData;

    // Strict validation - all required fields must be present
    if (!serverData.stage) {
      throw new Error(
        'Cannot start game: Server did not provide stage selection.'
      );
    }

    if (
      !serverData.players ||
      !Array.isArray(serverData.players) ||
      serverData.players.length === 0
    ) {
      throw new Error('Cannot start game: Server did not provide player data.');
    }

    if (!serverData.roomId) {
      throw new Error('Cannot start game: Server did not provide room ID.');
    }

    if (!serverData.gameConfig) {
      throw new Error(
        'Cannot start game: Server did not provide game configuration.'
      );
    }

    // Store authoritative game data in global state
    updateState({
      selectedStage: serverData.stage,
      roomId: serverData.roomId,
      gameStartData: serverData, // Store the complete server data for GameScene
      matchState: {
        phase: 'loading',
        timeRemaining: serverData.gameConfig.timeLimit,
        maxDuration: serverData.gameConfig.timeLimit,
        players: serverData.players.map((p: any) => ({
          id: p.userId,
          name: p.username,
          character: p.character,
          stats: {
            health: 100,
            stocks: serverData.gameConfig.stockCount,
            damage: 0,
          } as MatchPlayer['stats'],
          connected: true, // Server only sends connected players
          ready: true, // Server only starts when all ready
          isHost: p.isHost,
        })),
      },
    });

    console.log('Transitioning with validated server data:', {
      stage: serverData.stage,
      players: serverData.players.length,
      gameConfig: serverData.gameConfig,
    });

    // Transition to game scene
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start(GAME_CONFIG.SCENE_KEYS.GAME);
    });
  }

  private leaveLobby(): void {
    console.log('PreMatchLobbyScene: Leaving lobby');

    // Clean up subscriptions first
    if (this.unsubscribeLobby) {
      this.unsubscribeLobby();
      this.unsubscribeLobby = null;
    }

    // Clean up socket event listeners
    if (this.socketManager) {
      this.socketManager.off('gameStarted');
      SocketManager.leaveRoom();
    }

    // Clear lobby state completely
    lobbyStore.getState().clearRoom();

    // Clear any game state that might be lingering
    updateState({
      selectedCharacter: null,
      selectedStage: null,
      roomId: undefined,
      gameStartData: null,
      matchState: undefined,
    });

    // Reset UI elements
    this.playerCards = [];
    this.stageDisplay = null;
    this.readyButton = null;
    this.leaveButton = null;
    this.countdownText = null;
    this.statusText = null;

    // Return to menu
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start(GAME_CONFIG.SCENE_KEYS.MENU);
    });
  }

  shutdown(): void {
    // Unsubscribe from store changes
    if (this.unsubscribeLobby) {
      this.unsubscribeLobby();
    }

    // Clean up the gameStarted event listener
    if (this.socketManager) {
      this.socketManager.off('gameStarted');
    }

    // The other socket event listeners are now managed by SocketManager
    // so we don't need to manually remove them here
  }
}
