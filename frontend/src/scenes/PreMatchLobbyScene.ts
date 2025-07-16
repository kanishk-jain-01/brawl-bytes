/*
 * Pre-Match Lobby Scene
 * ---------------------
 * Displays the lobby before a match starts, showing:
 * - All players in the room with their selected characters
 * - Ready status for each player
 * - Selected stage information
 * - Match countdown when all players are ready
 * - Host controls for starting the match
 *
 * This scene coordinates between character/stage selection and the actual game.
 */

import Phaser from 'phaser';
import { getSocketManager } from '@/managers/SocketManager';
import { RoomStateData } from '@/types/Network';
import { GAME_CONFIG, CharacterType, StageType } from '../utils/constants';
import { updateState, getState } from '../state/GameState';
import { MatchPlayer } from '../types/GameState';

interface LobbyPlayer {
  id: string;
  username: string;
  character?: CharacterType;
  isReady: boolean;
  isHost: boolean;
  connected: boolean;
}

interface LobbyState {
  players: LobbyPlayer[];
  selectedStage?: StageType;
  roomId?: string;
  allPlayersReady: boolean;
  countdownActive: boolean;
  countdown: number;
}

export class PreMatchLobbyScene extends Phaser.Scene {
  private lobbyState: LobbyState = {
    players: [],
    allPlayersReady: false,
    countdownActive: false,
    countdown: 0,
  };

  private playerCards: Phaser.GameObjects.Container[] = [];

  private stageDisplay: Phaser.GameObjects.Container | null = null;

  private readyButton: Phaser.GameObjects.Container | null = null;

  private startButton: Phaser.GameObjects.Container | null = null;

  private countdownText: Phaser.GameObjects.Text | null = null;

  private statusText: Phaser.GameObjects.Text | null = null;

  private socketManager = getSocketManager();

  private isLocalPlayerReady = false;

  private isLocalPlayerHost = false;

  constructor() {
    super({ key: GAME_CONFIG.SCENE_KEYS.LOBBY });
  }

  create(): void {
    console.log('PreMatchLobbyScene: Starting pre-match lobby');

    // Strict validation - fail if character data not loaded from database
    if (
      !GAME_CONFIG.CHARACTERS ||
      Object.keys(GAME_CONFIG.CHARACTERS).length === 0
    ) {
      throw new Error(
        'Character data not loaded from database. Cannot display player lobby.'
      );
    }

    // Strict validation - fail if stage data not loaded from database
    if (!GAME_CONFIG.STAGES || Object.keys(GAME_CONFIG.STAGES).length === 0) {
      throw new Error(
        'Stage data not loaded from database. Cannot display stage information.'
      );
    }

    // Strict validation - fail if UI constants not loaded from database
    if (!GAME_CONFIG.UI.COLORS || !GAME_CONFIG.UI.FONTS) {
      throw new Error(
        'UI constants not loaded from database. Cannot create lobby interface.'
      );
    }

    this.setupSocketListeners();
    this.createBackground();
    this.createTitle();
    this.createPlayerArea();
    this.createStageDisplay();
    this.createControlButtons();
    this.createStatusArea();
    this.setupInputs();

    // Start matchmaking process
    this.startMatchmaking();
  }

  private setupSocketListeners(): void {
    if (!this.socketManager) {
      console.error('PreMatchLobbyScene: Socket manager not available');
      return;
    }

    // Listen for room state updates
    this.socketManager.on('roomStateSync', (data: RoomStateData) => {
      this.updateLobbyState(data);
    });

    // Listen for lobby state updates
    this.socketManager.on('lobbyState', (data: any) => {
      console.log('Received lobby state:', data);
      this.updateLobbyFromBackend(data);
    });

    // Listen for player join/leave events
    this.socketManager.on('playerJoined', data => {
      console.log('Player joined lobby:', data);
      this.requestRoomState();
    });

    this.socketManager.on('playerLeft', data => {
      console.log('Player left lobby:', data);
      this.requestRoomState();
    });

    // Listen for character selection changes
    this.socketManager.on('characterSelected', data => {
      console.log('Character selected:', data);
      this.requestRoomState();
    });

    // Listen for stage selection changes
    this.socketManager.on('stageSelected', data => {
      console.log('Stage selected:', data);
      this.requestRoomState();
    });

    // Listen for ready status changes
    this.socketManager.on('playerReady', data => {
      console.log('Player ready status changed:', data);
      this.requestRoomState();
    });

    // Listen for game starting
    this.socketManager.on('gameStarting', data => {
      console.log('Game starting:', data);
      this.startMatchCountdown(data.countdown || 5);
    });

    // Listen for game started
    this.socketManager.on('gameStarted', data => {
      console.log('Game started:', data);
      this.transitionToGame(data);
    });

    // Listen for matchmaking events
    this.socketManager.on('queueJoined', data => {
      console.log('Joined matchmaking queue:', data);
    });

    this.socketManager.on('matchFound', data => {
      console.log('Match found:', data);

      // Set the room ID in socket manager
      if (data.roomId) {
        this.socketManager?.setCurrentRoomId(data.roomId);
      }

      // Clear matchmaking UI and show lobby
      this.children.removeAll();
      this.setupSocketListeners();
      this.createBackground();
      this.createTitle();
      this.createPlayerArea();
      this.createStageDisplay();
      this.createControlButtons();
      this.createStatusArea();
      this.setupInputs();
      this.requestRoomState(); // Request room state
    });
  }

  private startMatchmaking(): void {
    if (!this.socketManager || !this.socketManager.isAuthenticated()) {
      console.error('Cannot start matchmaking: not authenticated');
      return;
    }

    console.log('Starting matchmaking from lobby...');

    // Join matchmaking queue
    if (this.socketManager.getSocket()) {
      const { selectedStage, selectedCharacter } = getState();

      this.socketManager?.getSocket()?.emit('joinMatchmakingQueue', {
        gameMode: 'versus',
        preferredStage: selectedStage,
        preferredCharacter: selectedCharacter,
      });
    } else {
      console.error('Socket not available for matchmaking');
    }

    // Show matchmaking status
    this.showMatchmakingStatus();
  }

  private showMatchmakingStatus(): void {
    // Add matchmaking status text
    const statusText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      'Searching for opponent...',
      {
        fontSize: '24px',
        color: GAME_CONFIG.UI.COLORS.TEXT,
        fontFamily: GAME_CONFIG.UI.FONTS.PRIMARY,
      }
    );
    statusText.setOrigin(0.5);

    // Add animation
    this.tweens.add({
      targets: statusText,
      alpha: 0.5,
      duration: 1000,
      yoyo: true,
      repeat: -1,
    });
  }

  private requestRoomState(): void {
    if (this.socketManager && this.socketManager.isInRoom()) {
      console.log(
        'Requesting room state for room:',
        this.socketManager.getCurrentRoomId()
      );
      this.socketManager.requestRoomState();
    } else {
      console.log(
        'Cannot request room state - not in room or socket manager not available'
      );
    }
  }

  private updateLobbyState(roomData: RoomStateData): void {
    console.log('Updating lobby state:', roomData);

    // Update lobby state from room data
    this.lobbyState = {
      ...this.lobbyState,
      roomId: roomData.roomId,
      selectedStage: roomData.config.stage as StageType,
      players: roomData.players.map(player => ({
        id: player.userId,
        username: player.username,
        character: player.character as CharacterType,
        isReady: player.state === 'ready',
        isHost: player.isHost,
        connected: true, // Assume connected if in room data
      })),
    };

    // Check if all players are ready
    this.lobbyState.allPlayersReady =
      this.lobbyState.players.length >= 2 &&
      this.lobbyState.players.every(player => player.isReady);

    // Update local player status
    const localPlayerId = this.socketManager?.getAuthToken();
    const localPlayer = this.lobbyState.players.find(
      p => p.id === localPlayerId
    );
    if (localPlayer) {
      this.isLocalPlayerReady = localPlayer.isReady;
      this.isLocalPlayerHost = localPlayer.isHost;
    }

    // Update UI
    this.updatePlayerCards();
    this.updateStageDisplay();
    this.updateControlButtons();
    this.updateStatusText();
  }

  private updateLobbyFromBackend(lobbyData: any): void {
    console.log('Updating lobby from backend:', lobbyData);

    // Update lobby state from backend lobby data
    this.lobbyState = {
      ...this.lobbyState,
      roomId: lobbyData.roomId,
      players: lobbyData.players.map((player: any) => ({
        id: player.userId,
        username: player.username,
        character: player.character as CharacterType,
        isReady: player.ready,
        isHost: player.isHost,
        connected: player.connected,
      })),
      selectedStage: lobbyData.selectedStage as StageType,
      allPlayersReady: lobbyData.allPlayersReady,
    };

    // Update local player status
    const localPlayerId = this.socketManager?.getAuthToken();
    const localPlayer = this.lobbyState.players.find(
      p => p.id === localPlayerId
    );
    if (localPlayer) {
      this.isLocalPlayerReady = localPlayer.isReady;
      this.isLocalPlayerHost = localPlayer.isHost;
    }

    // Update UI
    this.updatePlayerCards();
    this.updateStageDisplay();
    this.updateControlButtons();
    this.updateStatusText();
  }

  private createBackground(): void {
    // Create dark background
    this.add.rectangle(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      this.cameras.main.width,
      this.cameras.main.height,
      0x1a1a2e
    );

    // Add animated background pattern
    const graphics = this.add.graphics();
    graphics.lineStyle(1, 0x27ae60, 0.1);

    for (let x = 0; x < this.cameras.main.width; x += 50) {
      graphics.moveTo(x, 0);
      graphics.lineTo(x, this.cameras.main.height);
    }

    for (let y = 0; y < this.cameras.main.height; y += 50) {
      graphics.moveTo(0, y);
      graphics.lineTo(this.cameras.main.width, y);
    }

    graphics.strokePath();

    // Animate the pattern
    this.tweens.add({
      targets: graphics,
      alpha: { from: 0.1, to: 0.3 },
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private createTitle(): void {
    const title = this.add
      .text(this.cameras.main.centerX, 80, 'PRE-MATCH LOBBY', {
        fontSize: '42px',
        fontFamily: GAME_CONFIG.UI.FONTS.PRIMARY,
        color: GAME_CONFIG.UI.COLORS.TEXT,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    // Add glow effect
    title.setStroke('#27ae60', 4);
    title.setShadow(2, 2, '#000000', 2, true, true);

    // Animate title
    this.tweens.add({
      targets: title,
      scaleX: { from: 1, to: 1.02 },
      scaleY: { from: 1, to: 1.02 },
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private createPlayerArea(): void {
    // Create container for player cards
    const playerAreaY = 180;

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

    // Placeholder text
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
      const color = this.isLocalPlayerReady ? 0x27ae60 : 0x7f8c8d;
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
      if (this.canStartGame()) {
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
      const color = this.canStartGame() ? 0x27ae60 : 0x95a5a6;
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

    const cardWidth = 250;
    const cardHeight = 180;
    const spacing = 30;
    const startX =
      this.cameras.main.centerX -
      ((this.lobbyState.players.length - 1) * (cardWidth + spacing)) / 2;
    const cardY = 280;

    this.lobbyState.players.forEach((player, index) => {
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
      borderColor = 0x3498db;
    }

    const background = this.add.rectangle(0, 0, width, height, bgColor);
    background.setStrokeStyle(player.isHost ? 3 : 2, borderColor);
    container.add(background);

    // Host crown indicator
    if (player.isHost) {
      const crown = this.add.text(-width / 2 + 15, -height / 2 + 15, '👑', {
        fontSize: '20px',
      });
      container.add(crown);
    }

    // Player username
    const username = this.add
      .text(0, -height / 2 + 40, player.username, {
        fontSize: '20px',
        fontFamily: GAME_CONFIG.UI.FONTS.PRIMARY,
        color: GAME_CONFIG.UI.COLORS.TEXT,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    container.add(username);

    // Character display
    if (player.character && GAME_CONFIG.CHARACTERS[player.character]) {
      const character = GAME_CONFIG.CHARACTERS[player.character];

      // Character name
      const charName = this.add
        .text(0, -10, character.name, {
          fontSize: '16px',
          fontFamily: GAME_CONFIG.UI.FONTS.SECONDARY,
          color: GAME_CONFIG.UI.COLORS.TEXT,
        })
        .setOrigin(0.5);
      container.add(charName);

      // Character placeholder (colored rectangle) - use database-driven colors
      let charColor: number;
      if (player.character === 'DASH') {
        charColor = parseInt(
          GAME_CONFIG.UI.COLORS.SUCCESS.replace('#', '0x'),
          16
        );
      } else if (player.character === 'REX') {
        charColor = parseInt(
          GAME_CONFIG.UI.COLORS.PRIMARY.replace('#', '0x'),
          16
        );
      } else if (player.character === 'TITAN') {
        charColor = parseInt(
          GAME_CONFIG.UI.COLORS.DANGER.replace('#', '0x'),
          16
        );
      } else {
        // Strict validation - fail if unknown character type
        throw new Error(
          `Unknown character type: ${player.character}. Character data not loaded from database.`
        );
      }

      // Strict validation - fail if UI colors not loaded from database
      if (
        !GAME_CONFIG.UI.COLORS.SUCCESS ||
        !GAME_CONFIG.UI.COLORS.PRIMARY ||
        !GAME_CONFIG.UI.COLORS.DANGER
      ) {
        throw new Error(
          'UI colors not loaded from database constants. Cannot display character colors.'
        );
      }
      const charRect = this.add.rectangle(0, 20, 60, 60, charColor);
      charRect.setStrokeStyle(1, 0xffffff);
      container.add(charRect);
    } else {
      const noCharText = this.add
        .text(0, 10, 'No character\nselected', {
          fontSize: '14px',
          fontFamily: GAME_CONFIG.UI.FONTS.SECONDARY,
          color: GAME_CONFIG.UI.COLORS.TEXT_SECONDARY,
          align: 'center',
        })
        .setOrigin(0.5);
      container.add(noCharText);
    }

    // Ready status
    const statusText = player.isReady ? 'READY' : 'NOT READY';
    const statusColor = player.isReady
      ? GAME_CONFIG.UI.COLORS.SUCCESS
      : GAME_CONFIG.UI.COLORS.WARNING;

    const status = this.add
      .text(0, height / 2 - 20, statusText, {
        fontSize: '14px',
        fontFamily: GAME_CONFIG.UI.FONTS.PRIMARY,
        color: statusColor,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    container.add(status);

    return container;
  }

  private updateStageDisplay(): void {
    if (!this.stageDisplay) return;

    // Clear existing stage content (except background and title)
    while (this.stageDisplay.list.length > 2) {
      this.stageDisplay.list.pop()?.destroy();
    }

    if (
      this.lobbyState.selectedStage &&
      GAME_CONFIG.STAGES[this.lobbyState.selectedStage]
    ) {
      const stage = GAME_CONFIG.STAGES[this.lobbyState.selectedStage];

      const stageText = this.add
        .text(0, 0, stage.name, {
          fontSize: '18px',
          fontFamily: GAME_CONFIG.UI.FONTS.PRIMARY,
          color: GAME_CONFIG.UI.COLORS.TEXT,
          fontStyle: 'bold',
        })
        .setOrigin(0.5);
      this.stageDisplay.add(stageText);

      const descText = this.add
        .text(0, 25, stage.description, {
          fontSize: '12px',
          fontFamily: GAME_CONFIG.UI.FONTS.SECONDARY,
          color: GAME_CONFIG.UI.COLORS.TEXT_SECONDARY,
          align: 'center',
          wordWrap: { width: 350 },
        })
        .setOrigin(0.5);
      this.stageDisplay.add(descText);
    } else {
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
    this.updateReadyButton();
    this.updateStartButton();
  }

  private updateReadyButton(): void {
    if (!this.readyButton) return;

    const background = this.readyButton.list[0] as Phaser.GameObjects.Rectangle;
    const text = this.readyButton.list[1] as Phaser.GameObjects.Text;

    if (this.isLocalPlayerReady) {
      text.setText('NOT READY');
      background.setFillStyle(0x27ae60);
      background.setStrokeStyle(2, 0x2ecc71);
    } else {
      text.setText('READY');
      background.setFillStyle(0x7f8c8d);
      background.setStrokeStyle(2, 0x95a5a6);
    }
  }

  private updateStartButton(): void {
    if (!this.startButton) return;

    const background = this.startButton.list[0] as Phaser.GameObjects.Rectangle;
    const canStart = this.canStartGame();

    if (canStart && this.isLocalPlayerHost) {
      this.startButton.setAlpha(1);
      background.setFillStyle(0x27ae60);
      background.setStrokeStyle(2, 0x2ecc71);
    } else {
      this.startButton.setAlpha(this.isLocalPlayerHost ? 0.5 : 0);
      background.setFillStyle(0x95a5a6);
      background.setStrokeStyle(2, 0xbdc3c7);
    }
  }

  private updateStatusText(): void {
    if (!this.statusText) return;

    let message = '';

    if (this.lobbyState.players.length < 2) {
      message = 'Waiting for more players...';
    } else if (!this.lobbyState.allPlayersReady) {
      const readyCount = this.lobbyState.players.filter(p => p.isReady).length;
      message = `${readyCount}/${this.lobbyState.players.length} players ready`;
    } else if (this.isLocalPlayerHost) {
      message = 'All players ready! You can start the game.';
    } else {
      message = 'All players ready! Waiting for host to start...';
    }

    this.statusText.setText(message);
  }

  private canStartGame(): boolean {
    return (
      this.lobbyState.players.length >= 2 &&
      this.lobbyState.allPlayersReady &&
      this.lobbyState.selectedStage !== undefined
    );
  }

  private toggleReady(): void {
    if (!this.socketManager) return;

    console.log(
      `Toggling ready state from ${this.isLocalPlayerReady} to ${!this.isLocalPlayerReady}`
    );
    this.socketManager.setPlayerReady(!this.isLocalPlayerReady);
  }

  private startGame(): void {
    if (
      !this.socketManager ||
      !this.canStartGame() ||
      !this.isLocalPlayerHost
    ) {
      return;
    }

    console.log('PreMatchLobbyScene: Starting game');
    this.socketManager.startGame();
  }

  private startMatchCountdown(seconds: number): void {
    this.lobbyState.countdownActive = true;
    this.lobbyState.countdown = seconds;

    if (this.countdownText) {
      this.countdownText.setText(`Game starting in ${seconds}...`);
    }

    const countdownTimer = setInterval(() => {
      this.lobbyState.countdown -= 1;

      if (this.countdownText) {
        if (this.lobbyState.countdown > 0) {
          this.countdownText.setText(
            `Game starting in ${this.lobbyState.countdown}...`
          );
        } else {
          this.countdownText.setText('Starting now!');
          clearInterval(countdownTimer);
        }
      }
    }, 1000);
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
      if (this.canStartGame() && this.isLocalPlayerHost) {
        this.startGame();
      }
    });
  }

  private leaveLobby(): void {
    console.log('PreMatchLobbyScene: Leaving lobby');

    if (this.socketManager) {
      this.socketManager.leaveRoom();
    }

    // Return to menu
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start(GAME_CONFIG.SCENE_KEYS.MENU);
    });
  }

  shutdown(): void {
    // Clean up socket listeners
    if (this.socketManager) {
      this.socketManager.off('roomStateSync');
      this.socketManager.off('playerJoined');
      this.socketManager.off('playerLeft');
      this.socketManager.off('characterSelected');
      this.socketManager.off('stageSelected');
      this.socketManager.off('playerReady');
      this.socketManager.off('gameStarting');
      this.socketManager.off('gameStarted');
    }
  }
}
