import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { GAME_CONFIG } from '../utils/constants';

export class UIManager {
  private scene: Phaser.Scene;

  private uiContainer: Phaser.GameObjects.Container | null = null;

  // Store player HUD data for updates
  private playerHUDs: Map<
    string,
    {
      container: Phaser.GameObjects.Container;
      healthBar: Phaser.GameObjects.Rectangle;
      healthText: Phaser.GameObjects.Text;
      stockText: Phaser.GameObjects.Text;
    }
  > = new Map();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.createUI();
  }

  private createUI(): void {
    this.uiContainer = this.scene.add.container(0, 0);
    this.uiContainer.setScrollFactor(0); // UI doesn't scroll with camera

    // Create match timer
    this.createMatchTimer();

    // Create debug info (development only)
    if (process.env.NODE_ENV === 'development') {
      this.createDebugInfo();
    }
  }

  private createMatchTimer(): void {
    if (!this.uiContainer) return;

    const timerBg = this.scene.add.rectangle(
      this.scene.cameras.main.centerX,
      50,
      200,
      60,
      0x2c3e50,
      0.8
    );
    timerBg.setStrokeStyle(2, 0x3498db);
    this.uiContainer.add(timerBg);

    const timerText = this.scene.add
      .text(
        this.scene.cameras.main.centerX,
        50,
        UIManager.formatTime(GAME_CONFIG.GAME.MATCH_TIME),
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

  public createAllPlayerHUDs(players: Player[]): void {
    if (!this.uiContainer) return;

    // Clear existing HUDs
    this.clearPlayerHUDs();

    // Create HUD for each player
    players.forEach((player, index) => {
      this.createSinglePlayerHUD(player, index);
    });
  }

  private createSinglePlayerHUD(player: Player, playerIndex: number): void {
    if (!this.uiContainer) return;

    const character = player.getCharacterData();
    const health = player.getHealth();
    const stocks = player.getStocks();
    const username = player.getUsername();

    // Position calculations for top-left stacking
    const hudHeight = 80;
    const startY = 20;
    const yPosition = startY + playerIndex * hudHeight;
    const xPosition = 20;

    // Create container for this player's HUD
    const hudContainer = this.scene.add.container(xPosition, yPosition);
    this.uiContainer.add(hudContainer);

    // Username text
    const usernameText = this.scene.add
      .text(0, 0, username, {
        fontSize: '16px',
        fontFamily: GAME_CONFIG.UI.FONTS.PRIMARY,
        color: GAME_CONFIG.UI.COLORS.TEXT,
        fontStyle: 'bold',
      })
      .setOrigin(0, 0);
    hudContainer.add(usernameText);

    // Character name (smaller, below username)
    const characterText = this.scene.add
      .text(0, 20, character.name, {
        fontSize: '12px',
        fontFamily: GAME_CONFIG.UI.FONTS.SECONDARY,
        color: GAME_CONFIG.UI.COLORS.TEXT_SECONDARY,
        fontStyle: 'normal',
      })
      .setOrigin(0, 0);
    hudContainer.add(characterText);

    // Health bar background
    const healthBarBg = this.scene.add
      .rectangle(0, 40, 200, 20, 0x2c3e50, 0.8)
      .setOrigin(0, 0);
    healthBarBg.setStrokeStyle(2, 0x3498db);
    hudContainer.add(healthBarBg);

    // Health bar (foreground)
    const healthBar = this.scene.add
      .rectangle(2, 42, 196, 16, 0x27ae60)
      .setOrigin(0, 0);
    hudContainer.add(healthBar);

    // Health text
    const healthText = this.scene.add
      .text(100, 50, `${health}/${character.health}`, {
        fontSize: '12px',
        fontFamily: GAME_CONFIG.UI.FONTS.PRIMARY,
        color: GAME_CONFIG.UI.COLORS.TEXT,
        fontStyle: 'bold',
      })
      .setOrigin(0.5, 0.5);
    hudContainer.add(healthText);

    // Stock counter
    const stockText = this.scene.add
      .text(210, 45, `Lives: ${stocks}`, {
        fontSize: '14px',
        fontFamily: GAME_CONFIG.UI.FONTS.PRIMARY,
        color: GAME_CONFIG.UI.COLORS.TEXT,
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5);
    hudContainer.add(stockText);

    // Store HUD elements for updates
    this.playerHUDs.set(player.playerId, {
      container: hudContainer,
      healthBar,
      healthText,
      stockText,
    });
  }

  private clearPlayerHUDs(): void {
    // Destroy all existing player HUDs
    this.playerHUDs.forEach(hud => {
      hud.container.destroy();
    });
    this.playerHUDs.clear();
  }

  // Legacy method - now redirects to new system
  public createPlayerHUD(player: Player): void {
    // For backwards compatibility, just create HUD for this single player
    this.createAllPlayerHUDs([player]);
  }

  private createDebugInfo(): void {
    if (!this.uiContainer) return;

    const debugText = this.scene.add
      .text(this.scene.cameras.main.width - 20, 20, 'Debug Info', {
        fontSize: '14px',
        fontFamily: GAME_CONFIG.UI.FONTS.SECONDARY,
        color: GAME_CONFIG.UI.COLORS.TEXT_SECONDARY,
      })
      .setOrigin(1, 0);
    debugText.setName('debugText');
    this.uiContainer.add(debugText);
  }

  public updateMatchTimer(timeRemaining: number): void {
    const timerText = this.uiContainer?.getByName(
      'matchTimer'
    ) as Phaser.GameObjects.Text;
    if (timerText) {
      timerText.setText(UIManager.formatTime(timeRemaining));
    }
  }

  public updatePlayerHUD(player: Player): void {
    const hud = this.playerHUDs.get(player.playerId);
    if (!hud) return;

    const health = player.getHealth();
    const maxHealth = player.getMaxHealth();
    const stocks = player.getStocks();

    // Update health bar
    const healthPercent = health / maxHealth;
    hud.healthBar.setScale(healthPercent, 1);
    hud.healthText.setText(`${health}/${maxHealth}`);

    // Color based on health
    if (healthPercent > 0.6) {
      hud.healthBar.setFillStyle(0x27ae60);
    } else if (healthPercent > 0.3) {
      hud.healthBar.setFillStyle(0xf39c12);
    } else {
      hud.healthBar.setFillStyle(0xe74c3c);
    }

    // Update stock counter
    hud.stockText.setText(`Lives: ${stocks}`);
  }

  public updateAllPlayerHUDs(players: Player[]): void {
    players.forEach(player => {
      this.updatePlayerHUD(player);
    });
  }

  public updateDebugInfo(
    player: Player,
    selectedCharacter: string,
    gamePaused: boolean,
    pauseReason: string | null
  ): void {
    if (process.env.NODE_ENV !== 'development' || !this.uiContainer) return;

    const debugText = this.uiContainer.getByName(
      'debugText'
    ) as Phaser.GameObjects.Text;
    if (debugText) {
      const velocity = player.body?.velocity;
      const position = player;

      debugText.setText(
        [
          'Debug Info:',
          `Position: ${Math.round(position.x)}, ${Math.round(position.y)}`,
          `Velocity: ${Math.round(velocity?.x || 0)}, ${Math.round(velocity?.y || 0)}`,
          `On Ground: ${player.body?.touching.down || false}`,
          `Character: ${selectedCharacter}`,
          `Health: ${player.getHealth()}/${player.getMaxHealth()}`,
          `Stocks: ${player.getStocks()}`,
          `Game Paused: ${gamePaused ? `Yes (${pauseReason})` : 'No'}`,
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

  public showMatchResults(
    reason: 'timer' | 'elimination' | 'defeat',
    winner: Player | undefined,
    players: Player[]
  ): void {
    // Create results overlay
    const overlay = this.scene.add.rectangle(
      this.scene.cameras.main.centerX,
      this.scene.cameras.main.centerY,
      this.scene.cameras.main.width,
      this.scene.cameras.main.height,
      0x000000,
      0.8
    );
    overlay.setScrollFactor(0);

    let resultText = '';
    let resultColor: string = GAME_CONFIG.UI.COLORS.TEXT;

    switch (reason) {
      case 'timer': {
        // Time ran out - determine winner by remaining stocks and health
        const activePlayers = players.filter(player => !player.isDefeated());
        const localPlayer = players.find(player => player.isLocalPlayer);

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
    this.scene.add
      .text(
        this.scene.cameras.main.centerX,
        this.scene.cameras.main.centerY - 50,
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

    this.scene.add
      .text(
        this.scene.cameras.main.centerX,
        this.scene.cameras.main.centerY + 20,
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
    const localPlayer = players.find(player => player.isLocalPlayer);
    if (localPlayer) {
      this.scene.add
        .text(
          this.scene.cameras.main.centerX,
          this.scene.cameras.main.centerY + 80,
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
      this.scene.add
        .text(
          this.scene.cameras.main.centerX,
          this.scene.cameras.main.centerY + 120,
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
    this.scene.cameras.main.flash(500, 255, 255, 255, false);

    // Play different screen shake based on result
    if (resultText === 'VICTORY!') {
      this.scene.cameras.main.shake(1000, 0.02);
    } else if (resultText === 'DEFEAT!') {
      this.scene.cameras.main.shake(500, 0.01);
    }
  }

  private static formatTime(milliseconds: number): string {
    const totalSeconds = Math.ceil(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  public getContainer(): Phaser.GameObjects.Container | null {
    return this.uiContainer;
  }

  public destroy(): void {
    // Clear player HUDs first
    this.clearPlayerHUDs();

    if (this.uiContainer) {
      this.uiContainer.destroy();
      this.uiContainer = null;
    }
  }
}
