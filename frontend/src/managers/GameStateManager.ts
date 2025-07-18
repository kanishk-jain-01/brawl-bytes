import Phaser from 'phaser';
import { Player } from '../entities/Player';
import type { MatchTimerUpdate } from '../types/Network';

export type MatchEndReason = 'timer' | 'elimination' | 'defeat';

export interface MatchEndCallbacks {
  onMatchEnd: (reason: MatchEndReason, winner?: Player) => void;
  onPlayerDefeated: (playerId: string) => void;
}

export class GameStateManager {
  private scene: Phaser.Scene;

  private gameStarted = false;

  private gamePaused = false;

  private pauseReason: string | null = null;

  private pauseOverlay: Phaser.GameObjects.Container | null = null;

  // Server-side timer state (no longer using client timer)
  private serverTimeRemaining = 0;

  private serverTimestamp = 0;

  private timerPaused = false;

  private callbacks: MatchEndCallbacks;

  constructor(scene: Phaser.Scene, callbacks: MatchEndCallbacks) {
    this.scene = scene;
    this.callbacks = callbacks;
  }

  public startMatch(): void {
    this.gameStarted = true;
    // Don't initialize with any time - wait for server to provide authoritative time
    this.serverTimeRemaining = 0;

    console.log(
      'GameStateManager: Match started - waiting for server timer updates'
    );
  }

  /**
   * Handle server timer updates - replaces the old client-side timer
   */
  public handleServerTimerUpdate(timerData: MatchTimerUpdate): void {
    if (!this.gameStarted) return;

    this.serverTimeRemaining = timerData.timeRemaining;
    this.serverTimestamp = timerData.serverTimestamp;
    this.timerPaused = timerData.isPaused;

    // Check if match time has expired
    if (this.serverTimeRemaining <= 0) {
      this.endMatch('timer');
      return;
    }

    // Emit event for UI update - convert to milliseconds for consistency
    this.scene.events.emit('matchTimerUpdate', this.serverTimeRemaining);
  }

  /**
   * Get current time remaining based on server state with client interpolation
   */
  public getTimeRemaining(): number {
    if (this.timerPaused || !this.gameStarted) {
      return this.serverTimeRemaining;
    }

    // Calculate interpolated time based on server timestamp
    const clientTime = Date.now();
    const timeSinceUpdate = clientTime - this.serverTimestamp;
    const interpolatedTime = Math.max(
      0,
      this.serverTimeRemaining - timeSinceUpdate
    );

    return interpolatedTime;
  }

  public endMatch(reason: MatchEndReason, winner?: Player): void {
    this.gameStarted = false;
    this.serverTimeRemaining = 0;

    console.log(`GameStateManager: Match ended due to ${reason}`);
    this.callbacks.onMatchEnd(reason, winner);
  }

  public handlePlayerDefeated(playerId: string): void {
    console.log(`Player ${playerId} was defeated!`);
    this.callbacks.onPlayerDefeated(playerId);
  }

  public checkMatchEndConditions(players: Player[]): void {
    if (!this.gameStarted) return;

    const activePlayers = players.filter(player => !player.isDefeated());
    const localPlayer = players.find(player => player.isLocalPlayer);

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

  public pauseGame(data: {
    reason: string;
    disconnectedPlayer?: { userId: string; username: string };
    pausedAt: string;
  }): void {
    console.log('Game paused:', data);

    this.gamePaused = true;
    this.pauseReason = data.reason;

    // Pause physics
    this.scene.physics.pause();

    // Note: Server handles timer pausing - no client timer to pause

    // Show pause overlay
    this.showPauseOverlay(data);

    console.log(`Game paused due to: ${data.reason}`);
  }

  public resumeGame(data: { reason: string; resumedAt: string }): void {
    console.log('Game resumed:', data);

    this.gamePaused = false;
    this.pauseReason = null;

    // Resume physics
    this.scene.physics.resume();

    // Note: Server handles timer resuming - no client timer to resume

    // Hide pause overlay
    this.hidePauseOverlay();

    console.log(`Game resumed: ${data.reason}`);
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
    this.pauseOverlay = this.scene.add.container(
      this.scene.cameras.main.centerX,
      this.scene.cameras.main.centerY
    );

    // Semi-transparent background
    const background = this.scene.add.rectangle(
      0,
      0,
      this.scene.cameras.main.width,
      this.scene.cameras.main.height,
      0x000000,
      0.7
    );
    this.pauseOverlay.add(background);

    // Pause icon
    const pauseIcon = this.scene.add
      .text(0, -80, '⏸️', {
        fontSize: '64px',
      })
      .setOrigin(0.5);
    this.pauseOverlay.add(pauseIcon);

    // Main title
    const title = this.scene.add
      .text(0, -20, 'GAME PAUSED', {
        fontSize: '32px',
        fontFamily: 'Arial, sans-serif',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
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

    const reason = this.scene.add
      .text(0, 20, reasonText, {
        fontSize: '18px',
        fontFamily: 'Arial, sans-serif',
        color: '#cccccc',
      })
      .setOrigin(0.5);
    this.pauseOverlay.add(reason);

    // Waiting message
    const waitingText = this.scene.add
      .text(0, 50, 'Waiting for all players to reconnect...', {
        fontSize: '16px',
        fontFamily: 'Arial, sans-serif',
        color: '#999999',
      })
      .setOrigin(0.5);
    this.pauseOverlay.add(waitingText);

    // Set high depth to ensure it's on top
    this.pauseOverlay.setDepth(1000);

    // Add subtle animation
    this.scene.tweens.add({
      targets: this.pauseOverlay,
      alpha: { from: 0, to: 1 },
      duration: 300,
      ease: 'Power2',
    });
  }

  private hidePauseOverlay(): void {
    if (!this.pauseOverlay) {
      return;
    }

    // Animate out and destroy
    this.scene.tweens.add({
      targets: this.pauseOverlay,
      alpha: 0,
      duration: 300,
      ease: 'Power2',
      onComplete: () => {
        if (this.pauseOverlay) {
          this.pauseOverlay.destroy();
          this.pauseOverlay = null;
        }
      },
    });
  }

  public showPlayerDisconnectedNotification(data: {
    playerId: string;
    username: string;
    gracePeriod: number;
  }): void {
    // Create temporary notification
    const notification = this.scene.add.container(
      this.scene.cameras.main.width - 20,
      100
    );

    const background = this.scene.add
      .rectangle(0, 0, 300, 60, 0x333333, 0.9)
      .setOrigin(1, 0);

    const icon = this.scene.add
      .text(-10, 10, '⚠️', {
        fontSize: '16px',
      })
      .setOrigin(1, 0);

    const text = this.scene.add
      .text(-30, 10, `${data.username} disconnected`, {
        fontSize: '14px',
        fontFamily: 'Arial, sans-serif',
        color: '#ffaa00',
      })
      .setOrigin(1, 0);

    const subText = this.scene.add
      .text(
        -30,
        30,
        `Reconnecting... (${Math.ceil(data.gracePeriod / 1000)}s)`,
        {
          fontSize: '12px',
          fontFamily: 'Arial, sans-serif',
          color: '#cccccc',
        }
      )
      .setOrigin(1, 0);

    notification.add([background, icon, text, subText]);
    notification.setDepth(999);

    // Animate in
    notification.setAlpha(0);
    this.scene.tweens.add({
      targets: notification,
      alpha: 1,
      duration: 300,
      ease: 'Power2',
    });

    // Auto-remove after grace period
    this.scene.time.delayedCall(data.gracePeriod + 1000, () => {
      this.scene.tweens.add({
        targets: notification,
        alpha: 0,
        duration: 300,
        ease: 'Power2',
        onComplete: () => notification.destroy(),
      });
    });
  }

  public showPlayerReconnectedNotification(data: {
    playerId: string;
    username: string;
    disconnectionDuration: number;
  }): void {
    // Create temporary notification
    const notification = this.scene.add.container(
      this.scene.cameras.main.width - 20,
      100
    );

    const background = this.scene.add
      .rectangle(0, 0, 300, 60, 0x2d5016, 0.9)
      .setOrigin(1, 0);

    const icon = this.scene.add
      .text(-10, 10, '✅', {
        fontSize: '16px',
      })
      .setOrigin(1, 0);

    const text = this.scene.add
      .text(-30, 10, `${data.username} reconnected`, {
        fontSize: '14px',
        fontFamily: 'Arial, sans-serif',
        color: '#4CAF50',
      })
      .setOrigin(1, 0);

    const downtime = Math.ceil(data.disconnectionDuration / 1000);
    const subText = this.scene.add
      .text(-30, 30, `Welcome back! (${downtime}s offline)`, {
        fontSize: '12px',
        fontFamily: 'Arial, sans-serif',
        color: '#cccccc',
      })
      .setOrigin(1, 0);

    notification.add([background, icon, text, subText]);
    notification.setDepth(999);

    // Animate in
    notification.setAlpha(0);
    this.scene.tweens.add({
      targets: notification,
      alpha: 1,
      duration: 300,
      ease: 'Power2',
    });

    // Auto-remove after 3 seconds
    this.scene.time.delayedCall(3000, () => {
      this.scene.tweens.add({
        targets: notification,
        alpha: 0,
        duration: 300,
        ease: 'Power2',
        onComplete: () => notification.destroy(),
      });
    });
  }

  // Getters
  public isGameStarted(): boolean {
    return this.gameStarted;
  }

  public isGamePaused(): boolean {
    return this.gamePaused;
  }

  public getPauseReason(): string | null {
    return this.pauseReason;
  }

  public getMatchTimeRemaining(): number {
    return this.serverTimeRemaining;
  }

  public destroy(): void {
    this.gameStarted = false;

    // No client timer to clean up - server manages timing

    if (this.pauseOverlay) {
      this.pauseOverlay.destroy();
      this.pauseOverlay = null;
    }

    console.log('GameStateManager: Destroyed');
  }
}
