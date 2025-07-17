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
import { updateState, getState } from '../state/GameState';
import { MatchPlayer } from '../types/GameState';

export class PreMatchLobbyScene extends Phaser.Scene {
  private playerCards: Phaser.GameObjects.Container[] = [];

  private stageDisplay: Phaser.GameObjects.Container | null = null;

  private readyButton: Phaser.GameObjects.Container | null = null;

  private startButton: Phaser.GameObjects.Container | null = null;

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
    this.startButton = null;
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
    }
  }

  private initializeLobby(): void {
    if (!this.socketManager || !SocketManager.isAuthenticated()) {
      console.error('Cannot start lobby: not authenticated');
      lobbyStore.getState().setError('Not authenticated');
      return;
    }

    // Check if we're already in a room
    const connectionState = getConnectionState();
    if (connectionState.currentRoomId) {
      console.log('Already in room, requesting room state...');
      SocketManager.requestRoomState();
    } else {
      // Start matchmaking process
      this.startMatchmaking();
    }
  }

  private startMatchmaking(): void {
    console.log('Starting matchmaking from lobby...');

    const { selectedStage, selectedCharacter } = getState();

    // Join matchmaking queue using lobby store
    const preferences = {
      gameMode: 'versus' as const,
      preferredCharacter: selectedCharacter || undefined,
      preferredStage: selectedStage || undefined,
    };

    lobbyStore.getState().joinQueue(preferences);

    // Emit to socket
    if (SocketManager.getSocket()) {
      SocketManager.getSocket()?.emit('joinMatchmakingQueue', {
        gameMode: 'versus',
        preferredStage: selectedStage,
        preferredCharacter: selectedCharacter,
      });
    } else {
      console.error('Socket not available for matchmaking');
      lobbyStore.getState().setError('Socket not available');
    }

    // Show matchmaking status
    this.showMatchmakingStatus();
  }

  private showMatchmakingStatus(): void {
    // The UI will be updated through store subscription
    // Add visual feedback for matchmaking
    if (this.statusText) {
      this.statusText.setText('Searching for opponent...');

      // Add animation
      this.tweens.add({
        targets: this.statusText,
        alpha: 0.5,
        duration: 1000,
        yoyo: true,
        repeat: -1,
      });
    }
  }

  private createBackground(): void {
    const { width, height } = this.cameras.main;

    // Gradient background
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
    this.createStartButton();
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

  private createStartButton(): void {
    this.startButton = this.add.container(
      this.cameras.main.width - 200,
      this.cameras.main.height - 80
    );

    const startBg = this.add.rectangle(0, 0, 140, 50, 0x95a5a6);
    startBg.setStrokeStyle(2, 0xbdc3c7);
    this.startButton.add(startBg);

    const startText = this.add
      .text(0, 0, 'START GAME', {
        fontSize: '18px',
        fontFamily: GAME_CONFIG.UI.FONTS.PRIMARY,
        color: GAME_CONFIG.UI.COLORS.TEXT,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.startButton.add(startText);

    startBg.setInteractive();
    startBg.on('pointerdown', () => this.startGame());
    startBg.on('pointerover', () => {
      const { canStartGame } = useRoom();
      if (canStartGame) {
        startBg.setFillStyle(0x27ae60);
        this.tweens.add({
          targets: this.startButton,
          scaleX: 1.1,
          scaleY: 1.1,
          duration: 100,
        });
      }
    });
    startBg.on('pointerout', () => {
      const { canStartGame } = useRoom();
      const color = canStartGame ? 0x27ae60 : 0x95a5a6;
      startBg.setFillStyle(color);
      this.tweens.add({
        targets: this.startButton,
        scaleX: 1,
        scaleY: 1,
        duration: 100,
      });
    });

    // Initially hidden/disabled
    this.startButton.setAlpha(0.5);
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
    if (!this.readyButton || !this.startButton) return;

    const { currentRoom, canStartGame } = useRoom();
    const { localPlayer } = useLocalPlayer();
    const connectionState = getConnectionState();

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

    // Update start button - with safety checks
    const startBg = this.startButton.list[0] as Phaser.GameObjects.Rectangle;

    if (startBg && typeof startBg.setFillStyle === 'function') {
      if (canStartGame) {
        this.startButton.setAlpha(1);
        startBg.setFillStyle(0x27ae60);
      } else {
        this.startButton.setAlpha(0.5);
        startBg.setFillStyle(0x95a5a6);
      }
    }

    // Show/hide start button based on host status
    const localPlayerId = connectionState.userId;
    const localPlayerInRoom = currentRoom.players.find(
      p => p.id === localPlayerId
    );
    const isHost = localPlayerInRoom?.isHost || false;

    this.startButton.setVisible(isHost);
  }

  private updateStatusText(): void {
    if (!this.statusText) return;

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

  private startGame(): void {
    if (!this.socketManager) return;

    const { canStartGame } = useRoom();
    const connectionState = getConnectionState();
    const { currentRoom } = useRoom();
    const localPlayerId = connectionState.userId;
    const localPlayerInRoom = currentRoom.players.find(
      p => p.id === localPlayerId
    );
    const isHost = localPlayerInRoom?.isHost || false;

    if (!canStartGame || !isHost) {
      return;
    }

    console.log('PreMatchLobbyScene: Starting game');
    SocketManager.startGame();
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

    // Enter key to start game (if host and all ready)
    this.input.keyboard?.addKey('ENTER').on('down', () => {
      const { canStartGame } = useRoom();
      const connectionState = getConnectionState();
      const { currentRoom } = useRoom();
      const localPlayerId = connectionState.userId;
      const localPlayerInRoom = currentRoom.players.find(
        p => p.id === localPlayerId
      );
      const isHost = localPlayerInRoom?.isHost || false;

      if (canStartGame && isHost) {
        this.startGame();
      }
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
    this.startButton = null;
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
