/*
 * Stage Select Scene
 * ------------------
 * Allows the host player to choose the stage for the upcoming match.
 * Displays stage cards with previews, descriptions, and difficulty indicators.
 * Features animated background, stage hover effects, and detailed stage information.
 * Supports both mouse/touch input and keyboard shortcuts (1,2,3 for quick selection).
 * Saves selected stage to lobby state and proceeds to pre-match lobby.
 */

import Phaser from 'phaser';
import { updateState } from '@/state/GameState';
import { getSocketManager, SocketManager } from '@/managers/SocketManager';
import { GAME_CONFIG, StageType } from '../utils/constants';

export class StageSelectScene extends Phaser.Scene {
  private selectedStage: StageType | null = null;

  private stageCards: Phaser.GameObjects.Container[] = [];

  private previewContainer: Phaser.GameObjects.Container | null = null;

  private confirmButton: Phaser.GameObjects.Container | null = null;

  private backButton: Phaser.GameObjects.Container | null = null;

  constructor() {
    super({ key: GAME_CONFIG.SCENE_KEYS.STAGE_SELECT });
  }

  create(): void {
    console.log('StageSelectScene: Starting stage selection');

    // Strict validation - fail if stage data not loaded from database
    if (!GAME_CONFIG.STAGES || Object.keys(GAME_CONFIG.STAGES).length === 0) {
      throw new Error(
        'Stage data not loaded from database. Cannot display stage selection.'
      );
    }

    // Strict validation - fail if UI constants not loaded from database
    if (!GAME_CONFIG.UI.COLORS || !GAME_CONFIG.UI.FONTS) {
      throw new Error(
        'UI constants not loaded from database. Cannot create stage selection interface.'
      );
    }

    this.createBackground();
    this.createTitle();
    this.createStageGrid();
    this.createPreviewArea();
    this.createNavigationButtons();
    this.setupInputs();
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
    this.createBackgroundPattern();
  }

  private createBackgroundPattern(): void {
    const graphics = this.add.graphics();
    graphics.lineStyle(1, 0xe74c3c, 0.1);

    // Create grid pattern with different color for stage selection
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
      .text(this.cameras.main.centerX, 80, 'SELECT BATTLE STAGE', {
        fontSize: '42px',
        fontFamily: GAME_CONFIG.UI.FONTS.PRIMARY,
        color: GAME_CONFIG.UI.COLORS.TEXT,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    // Add glow effect with stage theme color
    title.setStroke('#e74c3c', 4);
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

  private createStageGrid(): void {
    const stages = Object.entries(GAME_CONFIG.STAGES);
    const cardWidth = 240;
    const cardHeight = 320;
    const spacing = 40;
    const startX =
      this.cameras.main.centerX -
      ((stages.length - 1) * (cardWidth + spacing)) / 2;
    const startY = 250;

    stages.forEach(([key, stage], index) => {
      const x = startX + index * (cardWidth + spacing);
      const card = this.createStageCard(
        key as StageType,
        stage,
        x,
        startY,
        cardWidth,
        cardHeight
      );
      this.stageCards.push(card);
    });
  }

  private createStageCard(
    stageKey: StageType,
    stage: (typeof GAME_CONFIG.STAGES)[StageType],
    x: number,
    y: number,
    width: number,
    height: number
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    // Card background
    const background = this.add.rectangle(0, 0, width, height, 0x2c3e50);
    background.setStrokeStyle(2, 0xe74c3c);
    container.add(background);

    // Stage preview area (using colored rectangle and basic platform preview)
    const previewBg = this.add.rectangle(0, -80, width - 20, 120, 0x34495e);
    previewBg.setStrokeStyle(1, 0xbdc3c7);
    container.add(previewBg);

    // Draw basic platform preview
    this.drawPlatformPreview(container, stage, width - 20, 120);

    // Difficulty indicator - use database-driven UI colors based on difficulty
    let difficultyColor: number;
    if (stage.difficulty === 'Easy') {
      difficultyColor = parseInt(
        GAME_CONFIG.UI.COLORS.SUCCESS.replace('#', '0x'),
        16
      );
    } else if (stage.difficulty === 'Hard') {
      difficultyColor = parseInt(
        GAME_CONFIG.UI.COLORS.DANGER.replace('#', '0x'),
        16
      );
    } else {
      difficultyColor = parseInt(
        GAME_CONFIG.UI.COLORS.WARNING.replace('#', '0x'),
        16
      );
    }

    // Strict validation - fail if UI colors not loaded from database
    if (
      !GAME_CONFIG.UI.COLORS.SUCCESS ||
      !GAME_CONFIG.UI.COLORS.DANGER ||
      !GAME_CONFIG.UI.COLORS.WARNING
    ) {
      throw new Error(
        'UI colors not loaded from database constants. Cannot display stage difficulty.'
      );
    }
    const difficultyBadge = this.add.rectangle(
      width / 2 - 30,
      -height / 2 + 20,
      60,
      20,
      difficultyColor
    );
    difficultyBadge.setStrokeStyle(1, 0xffffff);
    container.add(difficultyBadge);

    const difficultyText = this.add
      .text(width / 2 - 30, -height / 2 + 20, stage.difficulty, {
        fontSize: '12px',
        fontFamily: GAME_CONFIG.UI.FONTS.SECONDARY,
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    container.add(difficultyText);

    // Stage name
    const nameText = this.add
      .text(0, 10, stage.name, {
        fontSize: '24px',
        fontFamily: GAME_CONFIG.UI.FONTS.PRIMARY,
        color: GAME_CONFIG.UI.COLORS.TEXT,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    container.add(nameText);

    // Stage description (truncated)
    const truncatedDesc =
      stage.description.length > 60
        ? `${stage.description.substring(0, 60)}...`
        : stage.description;

    const descText = this.add
      .text(0, 50, truncatedDesc, {
        fontSize: '14px',
        fontFamily: GAME_CONFIG.UI.FONTS.SECONDARY,
        color: GAME_CONFIG.UI.COLORS.TEXT_SECONDARY,
        align: 'center',
        wordWrap: { width: width - 20 },
      })
      .setOrigin(0.5);
    container.add(descText);

    // Stage stats
    const platformCount = stage.platforms ? stage.platforms.length : 0;
    const hazardCount = stage.hazards ? stage.hazards.length : 0;
    const statsText = this.add
      .text(0, 90, `Platforms: ${platformCount}\nHazards: ${hazardCount}`, {
        fontSize: '12px',
        fontFamily: GAME_CONFIG.UI.FONTS.SECONDARY,
        color: GAME_CONFIG.UI.COLORS.TEXT_SECONDARY,
        align: 'center',
      })
      .setOrigin(0.5);
    container.add(statsText);

    // Make card interactive
    background.setInteractive();
    background.on('pointerdown', () => this.selectStage(stageKey));
    background.on('pointerover', () => this.onCardHover(container, background));
    background.on('pointerout', () =>
      this.onCardHoverOut(container, background)
    );

    return container;
  }

  private drawPlatformPreview(
    container: Phaser.GameObjects.Container,
    stage: (typeof GAME_CONFIG.STAGES)[StageType],
    previewWidth: number,
    previewHeight: number
  ): void {
    if (!stage.platforms || stage.platforms.length === 0) return;

    // Scale platforms to fit preview area
    const scaleX = previewWidth / 800; // Assuming 800px stage width
    const scaleY = previewHeight / 600; // Assuming 600px stage height

    stage.platforms.forEach(platform => {
      const scaledX = platform.x * scaleX - previewWidth / 2;
      const scaledY = platform.y * scaleY - previewHeight / 2;
      const scaledWidth = platform.width * scaleX;
      const scaledHeight = platform.height * scaleY;

      const platformRect = this.add.rectangle(
        scaledX,
        scaledY - 80, // Offset for preview position
        scaledWidth,
        scaledHeight,
        0x95a5a6
      );
      platformRect.setStrokeStyle(1, 0xffffff);
      container.add(platformRect);
    });
  }

  private onCardHover(
    container: Phaser.GameObjects.Container,
    background: Phaser.GameObjects.Rectangle
  ): void {
    background.setFillStyle(0x34495e);
    background.setStrokeStyle(2, 0xf39c12);

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
    if (this.getStageFromContainer(container) !== this.selectedStage) {
      background.setFillStyle(0x2c3e50);
      background.setStrokeStyle(2, 0xe74c3c);
    }

    this.tweens.add({
      targets: container,
      scaleX: 1,
      scaleY: 1,
      duration: 150,
      ease: 'Power2',
    });
  }

  private selectStage(stageKey: StageType): void {
    console.log(`StageSelectScene: Stage selected - ${stageKey}`);

    // Update visual selection
    this.updateCardSelection(stageKey);
    this.selectedStage = stageKey;
    this.updatePreview();
    this.updateConfirmButton();
  }

  private updateCardSelection(selectedKey: StageType): void {
    const stages = Object.keys(GAME_CONFIG.STAGES);

    this.stageCards.forEach((card, index) => {
      const background = card.list[0] as Phaser.GameObjects.Rectangle;
      const stageKey = stages[index] as StageType;

      if (stageKey === selectedKey) {
        background.setFillStyle(0x27ae60);
        background.setStrokeStyle(3, 0x2ecc71);
      } else {
        background.setFillStyle(0x2c3e50);
        background.setStrokeStyle(2, 0xe74c3c);
      }
    });
  }

  private getStageFromContainer(
    container: Phaser.GameObjects.Container
  ): StageType | null {
    const index = this.stageCards.indexOf(container);
    if (index === -1) return null;
    return Object.keys(GAME_CONFIG.STAGES)[index] as StageType;
  }

  private createPreviewArea(): void {
    this.previewContainer = this.add.container(this.cameras.main.centerX, 450);

    const previewBg = this.add.rectangle(0, 0, 500, 180, 0x34495e);
    previewBg.setStrokeStyle(2, 0xe74c3c);
    this.previewContainer.add(previewBg);

    const previewTitle = this.add
      .text(0, -70, 'Stage Preview', {
        fontSize: '20px',
        fontFamily: GAME_CONFIG.UI.FONTS.PRIMARY,
        color: GAME_CONFIG.UI.COLORS.TEXT,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.previewContainer.add(previewTitle);

    const instructionText = this.add
      .text(0, 0, 'Select a stage to view details', {
        fontSize: '16px',
        fontFamily: GAME_CONFIG.UI.FONTS.PRIMARY,
        color: GAME_CONFIG.UI.COLORS.TEXT_SECONDARY,
        align: 'center',
      })
      .setOrigin(0.5);
    this.previewContainer.add(instructionText);

    this.previewContainer.setVisible(true);
  }

  private updatePreview(): void {
    if (!this.previewContainer || !this.selectedStage) return;

    // Clear existing preview content (except background and title)
    while (this.previewContainer.list.length > 2) {
      this.previewContainer.list.pop()?.destroy();
    }

    const stage = GAME_CONFIG.STAGES[this.selectedStage];

    // Stage details display
    const detailsText = this.add
      .text(
        0,
        -20,
        `${stage.name}\n\n` +
          `Difficulty: ${stage.difficulty}\n` +
          `Platforms: ${stage.platforms ? stage.platforms.length : 0}\n` +
          `Hazards: ${stage.hazards ? stage.hazards.length : 0}`,
        {
          fontSize: '14px',
          fontFamily: GAME_CONFIG.UI.FONTS.SECONDARY,
          color: GAME_CONFIG.UI.COLORS.TEXT,
          align: 'center',
        }
      )
      .setOrigin(0.5);
    this.previewContainer.add(detailsText);

    // Stage description
    const descText = this.add
      .text(0, 50, stage.description, {
        fontSize: '12px',
        fontFamily: GAME_CONFIG.UI.FONTS.PRIMARY,
        color: GAME_CONFIG.UI.COLORS.TEXT_SECONDARY,
        align: 'center',
        wordWrap: { width: 450 },
      })
      .setOrigin(0.5);
    this.previewContainer.add(descText);
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
    backBg.on('pointerdown', () => this.goBackToCharacterSelect());
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
      if (this.selectedStage) {
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
      const color = this.selectedStage ? 0x27ae60 : 0x95a5a6;
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

    if (this.selectedStage) {
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
      this.goBackToCharacterSelect();
    });

    // Enter key to confirm
    this.input.keyboard?.addKey('ENTER').on('down', () => {
      if (this.selectedStage) {
        this.confirmSelection();
      }
    });

    // Number keys for quick selection
    [1, 2, 3].forEach((num, index) => {
      this.input.keyboard?.addKey(`DIGIT${num}`).on('down', () => {
        const stages = Object.keys(GAME_CONFIG.STAGES);
        if (index < stages.length) {
          this.selectStage(stages[index] as StageType);
        }
      });
    });
  }

  private goBackToCharacterSelect(): void {
    console.log('StageSelectScene: Returning to character selection');

    // Transition animation
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start(GAME_CONFIG.SCENE_KEYS.CHARACTER_SELECT);
    });
  }

  private confirmSelection(): void {
    if (!this.selectedStage) return;

    console.log(
      `StageSelectScene: Confirming stage selection - ${this.selectedStage}`
    );

    // Persist selected stage to global state
    updateState({ selectedStage: this.selectedStage });

    // Emit stage selection to server for multiplayer synchronization
    const socketManager = getSocketManager();
    if (socketManager && SocketManager.isAuthenticated()) {
      SocketManager.selectStage(this.selectedStage);
      console.log(`Emitted stage selection to server: ${this.selectedStage}`);
    }

    // Transition to PreMatchLobby
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start(GAME_CONFIG.SCENE_KEYS.LOBBY);
    });
  }
}
