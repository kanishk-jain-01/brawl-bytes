import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { GAME_CONFIG } from '../utils/constants';

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

  private matchTimer: Phaser.Time.TimerEvent | null = null;

  private matchTimeRemaining = 0;

  private callbacks: MatchEndCallbacks;

  constructor(scene: Phaser.Scene, callbacks: MatchEndCallbacks) {
    this.scene = scene;
    this.callbacks = callbacks;
  }

  public startMatch(): void {
    this.gameStarted = true;
    this.matchTimeRemaining = GAME_CONFIG.GAME.MATCH_TIME;

    // Start match timer
    this.matchTimer = this.scene.time.addEvent({
      delay: 1000, // 1 second
      callback: this.updateMatchTimer,
      callbackScope: this,
      loop: true,
    });

    console.log('GameStateManager: Match started');
  }

  private updateMatchTimer(): void {
    if (!this.gameStarted) return;

    this.matchTimeRemaining -= 1000;

    if (this.matchTimeRemaining <= 0) {
      this.endMatch('timer');
      return;
    }

    // Emit event for UI update
    this.scene.events.emit('matchTimerUpdate', this.matchTimeRemaining);
  }

  public endMatch(reason: MatchEndReason, winner?: Player): void {
    this.gameStarted = false;

    if (this.matchTimer) {
      this.matchTimer.remove();
    }

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

    // Pause timers
    if (this.matchTimer) {
      this.matchTimer.paused = true;
    }

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

    // Resume timers
    if (this.matchTimer) {
      this.matchTimer.paused = false;
    }

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
    return this.matchTimeRemaining;
  }

  public destroy(): void {
    if (this.matchTimer) {
      this.matchTimer.remove();
      this.matchTimer = null;
    }

    if (this.pauseOverlay) {
      this.pauseOverlay.destroy();
      this.pauseOverlay = null;
    }
  }
}
