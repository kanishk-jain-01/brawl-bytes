/*
 * Character Select Scene
 * ----------------------
 * Allows players to choose their fighter from available characters.
 * Displays character cards with stats, visual previews, and descriptions.
 * Features animated grid pattern background, character hover effects, and detailed character information.
 * Supports both mouse/touch input and keyboard shortcuts (1,2,3 for quick selection).
 * Saves selected character to global state and transitions to GameScene.
 */

import Phaser from 'phaser';
import { updateState } from '@/state/GameState';
import { getSocketManager, SocketManager } from '@/managers/SocketManager';
import { GAME_CONFIG, CharacterType, UI_COLORS } from '../utils/constants';

export class CharacterSelectScene extends Phaser.Scene {
  private selectedCharacter: CharacterType | null = null;

  private characterCards: Phaser.GameObjects.Container[] = [];

  private confirmButton: Phaser.GameObjects.Container | null = null;

  private backButton: Phaser.GameObjects.Container | null = null;

  constructor() {
    super({ key: GAME_CONFIG.SCENE_KEYS.CHARACTER_SELECT });
  }

  create(): void {
    // eslint-disable-next-line no-console
    console.log('CharacterSelectScene: Starting character selection');

    // Reset scene state when entering/re-entering
    this.selectedCharacter = null;
    this.characterCards = [];
    this.confirmButton = null;
    this.backButton = null;

    this.createBackground();
    this.createTitle();
    this.createCharacterGrid();
    this.createNavigationButtons();
    this.setupInputs();
  }

  private createBackground(): void {
    const { width, height } = this.cameras.main;

    // Try to create ancient colosseum video background
    try {
      const colosseumVideo = this.add.video(
        width / 2,
        height / 2,
        'ancient_colosseum'
      );
      if (colosseumVideo) {
        // Set depth first
        colosseumVideo.setDepth(-1);
        colosseumVideo.setOrigin(0.5, 0.5); // Center the video

        // Wait for video metadata to load
        colosseumVideo.on('loadeddata', () => {
          // Get video's native dimensions
          const videoElement = colosseumVideo.video;
          if (!videoElement) {
            console.warn('Video element is null, cannot get dimensions');
            return;
          }

          const { videoWidth } = videoElement;
          const { videoHeight } = videoElement;

          console.log(
            `Colosseum video native size: ${videoWidth}x${videoHeight}, Screen: ${width}x${height}`
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
          colosseumVideo.setDisplaySize(newWidth, newHeight);

          console.log(`Applied colosseum video size: ${newWidth}x${newHeight}`);
        });

        // Start playing
        colosseumVideo.play(true); // Loop the video

        // Add subtle overlay for better text readability
        this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.3);
        return;
      }
    } catch (error) {
      console.warn(
        'Failed to load colosseum video background, falling back to gradient:',
        error
      );
    }

    // Fallback to dark background with animated pattern
    this.add.rectangle(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      this.cameras.main.width,
      this.cameras.main.height,
      0x1a1a2e
    );

    // Add subtle animated background pattern
    this.createBackgroundPattern();
  }

  private createBackgroundPattern(): void {
    const graphics = this.add.graphics();
    graphics.lineStyle(1, 0x3498db, 0.1);

    // Create grid pattern
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
      .text(this.cameras.main.centerX, 80, 'SELECT YOUR FIGHTER', {
        fontSize: '42px',
        fontFamily: GAME_CONFIG.UI.FONTS.PRIMARY,
        color: GAME_CONFIG.UI.COLORS.TEXT,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    // Add glow effect
    title.setStroke(UI_COLORS.PRIMARY_HEX(), 4);
    title.setShadow(2, 2, '#000000', 2, true, true);

    // Animate title
    this.tweens.add({
      targets: title,
      scaleX: { from: 1, to: 1.05 },
      scaleY: { from: 1, to: 1.05 },
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private createCharacterGrid(): void {
    const characters = Object.entries(GAME_CONFIG.CHARACTERS);
    const cardWidth = 200;
    const cardHeight = 280;
    const spacing = 50;
    const startX =
      this.cameras.main.centerX -
      ((characters.length - 1) * (cardWidth + spacing)) / 2;
    const startY = 250;

    characters.forEach(([key, character], index) => {
      const x = startX + index * (cardWidth + spacing);
      const card = this.createCharacterCard(
        key as CharacterType,
        character,
        x,
        startY,
        cardWidth,
        cardHeight
      );
      this.characterCards.push(card);
    });
  }

  private createCharacterCard(
    characterKey: CharacterType,
    character: (typeof GAME_CONFIG.CHARACTERS)[CharacterType],
    x: number,
    y: number,
    width: number,
    height: number
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    // Card background
    const background = this.add.rectangle(
      0,
      0,
      width,
      height,
      UI_COLORS.SECONDARY()
    );
    background.setStrokeStyle(2, UI_COLORS.PRIMARY());
    container.add(background);

    // Character placeholder image (using colored rectangle for now)
    const characterColors: Record<CharacterType, number> = {
      FAST_LIGHTWEIGHT: UI_COLORS.SUCCESS(),
      BALANCED_ALLROUNDER: UI_COLORS.PRIMARY(),
      HEAVY_HITTER: UI_COLORS.DANGER(),
    };

    const characterImage = this.add.rectangle(
      0,
      -50,
      120,
      120,
      characterColors[characterKey]
    );
    characterImage.setStrokeStyle(2, UI_COLORS.PRIMARY());
    container.add(characterImage);

    // Character name
    const nameText = this.add
      .text(0, 20, character.name, {
        fontSize: '24px',
        fontFamily: GAME_CONFIG.UI.FONTS.PRIMARY,
        color: GAME_CONFIG.UI.COLORS.TEXT,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    container.add(nameText);

    // Character stats preview
    const statsText = this.add
      .text(
        0,
        60,
        `Speed: ${character.speed}\nHealth: ${character.health}\nAttack: ${character.attackDamage}`,
        {
          fontSize: '14px',
          fontFamily: GAME_CONFIG.UI.FONTS.SECONDARY,
          color: GAME_CONFIG.UI.COLORS.TEXT_SECONDARY,
          align: 'center',
        }
      )
      .setOrigin(0.5);
    container.add(statsText);

    // Make card interactive
    background.setInteractive();
    background.on('pointerdown', () => this.selectCharacter(characterKey));
    background.on('pointerover', () => this.onCardHover(container, background));
    background.on('pointerout', () =>
      this.onCardHoverOut(container, background)
    );

    return container;
  }

  private onCardHover(
    container: Phaser.GameObjects.Container,
    background: Phaser.GameObjects.Rectangle
  ): void {
    background.setFillStyle(0x34495e);
    background.setStrokeStyle(2, 0x5dade2);

    this.tweens.add({
      targets: container,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 150,
      ease: 'Power2',
    });
  }

  private onCardHoverOut(
    container: Phaser.GameObjects.Container,
    background: Phaser.GameObjects.Rectangle
  ): void {
    if (this.getCharacterFromContainer(container) !== this.selectedCharacter) {
      background.setFillStyle(0x2c3e50);
      background.setStrokeStyle(2, 0x3498db);
    }

    this.tweens.add({
      targets: container,
      scaleX: 1,
      scaleY: 1,
      duration: 150,
      ease: 'Power2',
    });
  }

  private selectCharacter(characterKey: CharacterType): void {
    // eslint-disable-next-line no-console
    console.log(`CharacterSelectScene: Character selected - ${characterKey}`);

    // Update visual selection
    this.updateCardSelection(characterKey);
    this.selectedCharacter = characterKey;
    this.updateConfirmButton();
  }

  private updateCardSelection(selectedKey: CharacterType): void {
    const characters = Object.keys(GAME_CONFIG.CHARACTERS);

    this.characterCards.forEach((card, index) => {
      // Safely get the background element (first child should be the background rectangle)
      const background = card.list[0] as Phaser.GameObjects.Rectangle;

      // Validate that we have a proper background element
      if (!background || typeof background.setFillStyle !== 'function') {
        console.warn(
          `CharacterSelectScene: Invalid background element at card index ${index}`
        );
        return;
      }

      const characterKey = characters[index] as CharacterType;

      if (characterKey === selectedKey) {
        background.setFillStyle(UI_COLORS.SUCCESS());
        background.setStrokeStyle(3, UI_COLORS.SUCCESS());
      } else {
        background.setFillStyle(UI_COLORS.SECONDARY());
        background.setStrokeStyle(2, UI_COLORS.PRIMARY());
      }
    });
  }

  private getCharacterFromContainer(
    container: Phaser.GameObjects.Container
  ): CharacterType | null {
    const index = this.characterCards.indexOf(container);
    if (index === -1) return null;
    return Object.keys(GAME_CONFIG.CHARACTERS)[index] as CharacterType;
  }

  private createNavigationButtons(): void {
    this.createBackButton();
    this.createConfirmButton();
  }

  private createBackButton(): void {
    this.backButton = this.add.container(100, this.cameras.main.height - 80);

    const backBg = this.add.rectangle(0, 0, 120, 50, 0x7f8c8d);
    backBg.setStrokeStyle(2, 0x95a5a6);
    this.backButton.add(backBg);

    const backText = this.add
      .text(0, 0, 'BACK', {
        fontSize: '18px',
        fontFamily: GAME_CONFIG.UI.FONTS.PRIMARY,
        color: GAME_CONFIG.UI.COLORS.TEXT,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.backButton.add(backText);

    backBg.setInteractive();
    backBg.on('pointerdown', () => this.goBackToMenu());
    backBg.on('pointerover', () => {
      backBg.setFillStyle(0x95a5a6);
      this.tweens.add({
        targets: this.backButton,
        scaleX: 1.1,
        scaleY: 1.1,
        duration: 100,
      });
    });
    backBg.on('pointerout', () => {
      backBg.setFillStyle(0x7f8c8d);
      this.tweens.add({
        targets: this.backButton,
        scaleX: 1,
        scaleY: 1,
        duration: 100,
      });
    });
  }

  private createConfirmButton(): void {
    this.confirmButton = this.add.container(
      this.cameras.main.width - 100,
      this.cameras.main.height - 80
    );

    const confirmBg = this.add.rectangle(0, 0, 140, 50, 0x95a5a6);
    confirmBg.setStrokeStyle(2, 0xbdc3c7);
    this.confirmButton.add(confirmBg);

    const confirmText = this.add
      .text(0, 0, 'CONFIRM', {
        fontSize: '18px',
        fontFamily: GAME_CONFIG.UI.FONTS.PRIMARY,
        color: GAME_CONFIG.UI.COLORS.TEXT,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.confirmButton.add(confirmText);

    confirmBg.setInteractive();
    confirmBg.on('pointerdown', () => this.confirmSelection());
    confirmBg.on('pointerover', () => {
      if (this.selectedCharacter) {
        confirmBg.setFillStyle(0x27ae60);
        this.tweens.add({
          targets: this.confirmButton,
          scaleX: 1.1,
          scaleY: 1.1,
          duration: 100,
        });
      }
    });
    confirmBg.on('pointerout', () => {
      const color = this.selectedCharacter ? 0x27ae60 : 0x95a5a6;
      confirmBg.setFillStyle(color);
      this.tweens.add({
        targets: this.confirmButton,
        scaleX: 1,
        scaleY: 1,
        duration: 100,
      });
    });

    // Initially disabled
    this.confirmButton.setAlpha(0.5);
  }

  private updateConfirmButton(): void {
    if (!this.confirmButton) return;

    const background = this.confirmButton
      .list[0] as Phaser.GameObjects.Rectangle;

    // Validate that we have a proper background element
    if (!background || typeof background.setFillStyle !== 'function') {
      console.warn(
        'CharacterSelectScene: Invalid confirm button background element'
      );
      return;
    }

    if (this.selectedCharacter) {
      this.confirmButton.setAlpha(1);
      background.setFillStyle(0x27ae60);
      background.setStrokeStyle(2, 0x2ecc71);
    } else {
      this.confirmButton.setAlpha(0.5);
      background.setFillStyle(0x95a5a6);
      background.setStrokeStyle(2, 0xbdc3c7);
    }
  }

  private setupInputs(): void {
    // ESC key to go back
    this.input.keyboard?.addKey('ESC').on('down', () => {
      this.goBackToMenu();
    });

    // Enter key to confirm
    this.input.keyboard?.addKey('ENTER').on('down', () => {
      if (this.selectedCharacter) {
        this.confirmSelection();
      }
    });

    // Number keys for quick selection
    [1, 2, 3].forEach((num, index) => {
      this.input.keyboard?.addKey(`DIGIT${num}`).on('down', () => {
        const characters = Object.keys(GAME_CONFIG.CHARACTERS);
        if (index < characters.length) {
          this.selectCharacter(characters[index] as CharacterType);
        }
      });
    });
  }

  private goBackToMenu(): void {
    // eslint-disable-next-line no-console
    console.log('CharacterSelectScene: Returning to menu');

    // Transition animation
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start(GAME_CONFIG.SCENE_KEYS.MENU);
    });
  }

  private confirmSelection(): void {
    if (!this.selectedCharacter) return;

    // eslint-disable-next-line no-console
    console.log(
      `CharacterSelectScene: Confirming selection - ${this.selectedCharacter}`
    );

    // Persist selected character to global state for the GameScene
    updateState({ selectedCharacter: this.selectedCharacter });

    // Emit character selection to server for multiplayer synchronization
    const socketManager = getSocketManager();
    if (socketManager && SocketManager.isAuthenticated()) {
      SocketManager.selectCharacter(this.selectedCharacter);
      console.log(
        `Emitted character selection to server: ${this.selectedCharacter}`
      );
    }

    // Transition to StageSelectScene
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start(GAME_CONFIG.SCENE_KEYS.STAGE_SELECT);
    });
  }
}
