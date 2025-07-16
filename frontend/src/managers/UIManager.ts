import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { GAME_CONFIG } from '../utils/constants';

export class UIManager {
  private scene: Phaser.Scene;

  private uiContainer: Phaser.GameObjects.Container | null = null;

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

  public createPlayerHUD(player: Player): void {
    if (!this.uiContainer) return;

    const character = player.getCharacterData();
    const health = player.getHealth();
    const stocks = player.getStocks();

    // Health bar
    const healthBarBg = this.scene.add.rectangle(
      150,
      100,
      250,
      30,
      0x2c3e50,
      0.8
    );
    healthBarBg.setStrokeStyle(2, 0x3498db);
    this.uiContainer.add(healthBarBg);

    const healthBar = this.scene.add.rectangle(150, 100, 240, 20, 0x27ae60);
    healthBar.setName('healthBar');
    this.uiContainer.add(healthBar);

    const healthText = this.scene.add
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
    const stockText = this.scene.add.text(50, 150, `Lives: ${stocks}`, {
      fontSize: '18px',
      fontFamily: GAME_CONFIG.UI.FONTS.PRIMARY,
      color: GAME_CONFIG.UI.COLORS.TEXT,
      fontStyle: 'bold',
    });
    stockText.setName('stockText');
    this.uiContainer.add(stockText);

    // Character name
    const nameText = this.scene.add.text(50, 50, character.name, {
      fontSize: '20px',
      fontFamily: GAME_CONFIG.UI.FONTS.PRIMARY,
      color: GAME_CONFIG.UI.COLORS.TEXT,
      fontStyle: 'bold',
    });
    this.uiContainer.add(nameText);
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
    if (!this.uiContainer) return;

    const health = player.getHealth();
    const maxHealth = player.getMaxHealth();
    const stocks = player.getStocks();

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
    if (this.uiContainer) {
      this.uiContainer.destroy();
      this.uiContainer = null;
    }
  }
}
