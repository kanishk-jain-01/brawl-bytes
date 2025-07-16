/*
 * Menu Scene
 * ----------
 * The main menu scene that serves as the game's home screen.
 * Features an animated background with twinkling stars, the game logo, and interactive buttons.
 * Includes play button (leads to character select), options button (future feature), and credits button.
 * All buttons have hover effects and smooth animations to enhance user experience.
 */

import Phaser from 'phaser';
import { GAME_CONFIG, ASSET_KEYS, UI_COLORS } from '@/utils/constants';
import { clearToken } from '@/api/auth';
import { getSocketManager } from '@/managers/SocketManager';

export class MenuScene extends Phaser.Scene {
  private playButton!: Phaser.GameObjects.Image;

  private playButtonText!: Phaser.GameObjects.Text;

  private logo!: Phaser.GameObjects.Image;

  private title!: Phaser.GameObjects.Text;

  private subtitle!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: GAME_CONFIG.SCENE_KEYS.MENU });
  }

  create(): void {
    const { width, height } = this.cameras.main;

    this.createBackground();
    this.createLogo(width, height);
    this.createTitle(width, height);
    this.createButtons(width, height);
    this.setupAnimations();
  }

  private createBackground(): void {
    const { width, height } = this.cameras.main;

    // Create gradient background
    const graphics = this.add.graphics();
    graphics.fillGradientStyle(0x2c3e50, 0x2c3e50, 0x34495e, 0x34495e, 1);
    graphics.fillRect(0, 0, width, height);

    // Add some decorative elements
    for (let i = 0; i < 20; i += 1) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(0, height);
      const size = Phaser.Math.Between(2, 8);
      const alpha = Phaser.Math.FloatBetween(0.1, 0.3);

      const star = this.add.circle(x, y, size, 0xffffff, alpha);

      // Add twinkling animation
      this.tweens.add({
        targets: star,
        alpha: alpha + 0.2,
        duration: Phaser.Math.Between(1000, 3000),
        yoyo: true,
        repeat: -1,
        delay: Phaser.Math.Between(0, 2000),
      });
    }
  }

  private createLogo(width: number, height: number): void {
    this.logo = this.add.image(
      width / 2,
      height / 2 - 200,
      ASSET_KEYS.IMAGES.LOGO
    );
    this.logo.setScale(3);
    this.logo.setTint(0x3498db);
  }

  private createTitle(width: number, height: number): void {
    this.title = this.add.text(width / 2, height / 2 - 100, 'BRAWL BYTES', {
      fontSize: '64px',
      color: GAME_CONFIG.UI.COLORS.TEXT,
      fontFamily: GAME_CONFIG.UI.FONTS.PRIMARY,
      fontStyle: 'bold',
      stroke: UI_COLORS.SECONDARY_HEX(),
      strokeThickness: 4,
    });
    this.title.setOrigin(0.5);

    this.subtitle = this.add.text(
      width / 2,
      height / 2 - 50,
      'Real-time Multiplayer Brawler',
      {
        fontSize: '24px',
        color: GAME_CONFIG.UI.COLORS.TEXT_SECONDARY,
        fontFamily: GAME_CONFIG.UI.FONTS.PRIMARY,
        fontStyle: 'italic',
      }
    );
    this.subtitle.setOrigin(0.5);
  }

  private createButtons(width: number, height: number): void {
    // Play Button
    this.playButton = this.add.image(
      width / 2,
      height / 2 + 50,
      ASSET_KEYS.IMAGES.UI_BUTTON
    );
    this.playButton.setInteractive({ useHandCursor: true });
    this.playButton.setScale(1.2);

    this.playButtonText = this.add.text(width / 2, height / 2 + 50, 'PLAY', {
      fontSize: '32px',
      color: GAME_CONFIG.UI.COLORS.TEXT,
      fontFamily: GAME_CONFIG.UI.FONTS.PRIMARY,
      fontStyle: 'bold',
    });
    this.playButtonText.setOrigin(0.5);

    // Button interactions
    this.setupButtonInteractions(this.playButton, this.playButtonText, () => {
      this.startCharacterSelect();
    });

    // Additional menu buttons (for future features)
    const optionsButton = this.add.image(
      width / 2,
      height / 2 + 130,
      ASSET_KEYS.IMAGES.UI_BUTTON
    );
    optionsButton.setInteractive({ useHandCursor: true });
    optionsButton.setScale(1.0);
    optionsButton.setTint(0x95a5a6);

    const optionsText = this.add.text(width / 2, height / 2 + 130, 'OPTIONS', {
      fontSize: '24px',
      color: GAME_CONFIG.UI.COLORS.TEXT_SECONDARY,
      fontFamily: GAME_CONFIG.UI.FONTS.PRIMARY,
    });
    optionsText.setOrigin(0.5);

    this.setupButtonInteractions(optionsButton, optionsText, () => {
      // eslint-disable-next-line no-console
      console.log('Options menu - Coming soon!');
    });

    // Credits button
    const creditsButton = this.add.image(
      width / 2,
      height / 2 + 210,
      ASSET_KEYS.IMAGES.UI_BUTTON
    );
    creditsButton.setInteractive({ useHandCursor: true });
    creditsButton.setScale(1.0);
    creditsButton.setTint(0x95a5a6);

    const creditsText = this.add.text(width / 2, height / 2 + 210, 'CREDITS', {
      fontSize: '24px',
      color: GAME_CONFIG.UI.COLORS.TEXT_SECONDARY,
      fontFamily: GAME_CONFIG.UI.FONTS.PRIMARY,
    });
    creditsText.setOrigin(0.5);

    this.setupButtonInteractions(creditsButton, creditsText, () => {
      // eslint-disable-next-line no-console
      console.log('Credits - MVP by Brawl Bytes Team');
    });

    // Logout button
    const logoutButton = this.add.image(
      width / 2,
      height / 2 + 290,
      ASSET_KEYS.IMAGES.UI_BUTTON
    );
    logoutButton.setInteractive({ useHandCursor: true });
    logoutButton.setScale(1.0);
    logoutButton.setTint(0xe74c3c);

    const logoutText = this.add.text(width / 2, height / 2 + 290, 'LOGOUT', {
      fontSize: '24px',
      color: GAME_CONFIG.UI.COLORS.TEXT,
      fontFamily: GAME_CONFIG.UI.FONTS.PRIMARY,
    });
    logoutText.setOrigin(0.5);

    this.setupButtonInteractions(logoutButton, logoutText, () => {
      clearToken();
      const socketManager = getSocketManager();
      socketManager?.disconnect();
      this.scene.start('LOGIN_SCENE');
    });
  }

  private setupButtonInteractions(
    button: Phaser.GameObjects.Image,
    text: Phaser.GameObjects.Text,
    callback: () => void
  ): void {
    button.on('pointerover', () => {
      button.setTint(UI_COLORS.PRIMARY());
      text.setColor(UI_COLORS.PRIMARY_HEX());
      this.tweens.add({
        targets: [button, text],
        scaleX: button.scaleX * 1.05,
        scaleY: button.scaleY * 1.05,
        duration: 100,
      });
    });

    button.on('pointerout', () => {
      button.clearTint();
      text.setColor(
        button.tintTopLeft === 0x95a5a6
          ? GAME_CONFIG.UI.COLORS.TEXT_SECONDARY
          : GAME_CONFIG.UI.COLORS.TEXT
      );
      this.tweens.add({
        targets: [button, text],
        scaleX: button.scaleX / 1.05,
        scaleY: button.scaleY / 1.05,
        duration: 100,
      });
    });

    button.on('pointerdown', () => {
      this.tweens.add({
        targets: [button, text],
        scaleX: button.scaleX * 0.95,
        scaleY: button.scaleY * 0.95,
        duration: 50,
        yoyo: true,
        onComplete: callback,
      });
    });
  }

  private setupAnimations(): void {
    // Logo pulse animation
    this.tweens.add({
      targets: this.logo,
      scaleX: 3.1,
      scaleY: 3.1,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Title glow animation
    this.tweens.add({
      targets: this.title,
      alpha: 0.8,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Play button emphasis animation
    this.time.delayedCall(1000, () => {
      this.tweens.add({
        targets: [this.playButton, this.playButtonText],
        scaleX: 1.3,
        scaleY: 1.3,
        duration: 300,
        yoyo: true,
        repeat: 2,
        ease: 'Back.easeOut',
      });
    });
  }

  private startCharacterSelect(): void {
    this.cameras.main.fadeOut(500, 0, 0, 0);

    this.cameras.main.once('camerafadeoutcomplete', () => {
      // eslint-disable-next-line no-console
      console.log('Transitioning to Character Select...');
      this.scene.start(GAME_CONFIG.SCENE_KEYS.CHARACTER_SELECT);
    });
  }
}
