/*
 * Stage Entity
 * ------------
 * Manages stage platforms, boundaries, hazards, and background elements for fighting game stages.
 * Handles platform collision setup, death zone detection, and stage-specific visual effects.
 * Supports configurable stage layouts from constants, including platform positions, hazards, and backgrounds.
 * Features boundary detection, respawn zones, and stage-specific environmental effects.
 */

import Phaser from 'phaser';
import type { StageConfig } from '@/types';
import { GAME_CONFIG, StageType } from '../utils/constants';

export class Stage {
  private scene: Phaser.Scene;

  private stageType: StageType;

  private stageData: (typeof GAME_CONFIG.STAGES)[StageType];

  private platforms: Phaser.Physics.Arcade.StaticGroup;

  private boundaries: Phaser.Physics.Arcade.StaticGroup;

  private hazards: Phaser.Physics.Arcade.StaticGroup;

  private backgroundGraphics!: Phaser.GameObjects.Graphics;

  private worldWidth: number;

  private worldHeight: number;

  constructor(config: StageConfig) {
    this.scene = config.scene;
    this.stageType = config.stageType;
    this.worldWidth = config.worldWidth;
    this.worldHeight = config.worldHeight;

    this.stageData = GAME_CONFIG.STAGES[this.stageType];

    // Initialize physics groups
    this.platforms = this.scene.physics.add.staticGroup();
    this.boundaries = this.scene.physics.add.staticGroup();
    this.hazards = this.scene.physics.add.staticGroup();

    // Create stage elements
    this.createBackground();
    this.createPlatforms();
    this.createBoundaries();
    this.createHazards();
  }

  private createBackground(): void {
    this.backgroundGraphics = this.scene.add.graphics();

    // Create gradient background
    const { top, bottom } = this.stageData.backgroundColor;
    this.backgroundGraphics.fillGradientStyle(top, top, bottom, bottom, 1);
    this.backgroundGraphics.fillRect(0, 0, this.worldWidth, this.worldHeight);

    // Add decorative elements based on stage type
    this.addDecorativeElements();
  }

  private addDecorativeElements(): void {
    switch (this.stageType) {
      case 'BATTLE_ARENA':
        this.addArenaDecorations();
        break;
      case 'FLOATING_ISLANDS':
        this.addFloatingIslandDecorations();
        break;
      case 'VOLCANIC_CHAMBER':
        this.addVolcanicDecorations();
        break;
      default:
        this.addArenaDecorations();
        break;
    }
  }

  private addArenaDecorations(): void {
    this.addJungleCanopy();
    this.addTropicalTrees();
    this.addJungleVines();
    this.addFallingLeaves();
    this.addJungleMist();
    this.addBirds();
    this.addFireflies();
  }

  private addJungleCanopy(): void {
    // Dense jungle canopy at the top
    for (let i = 0; i < 15; i += 1) {
      const x = Phaser.Math.Between(0, this.worldWidth);
      const y = Phaser.Math.Between(0, 150);
      const size = Phaser.Math.Between(60, 120);
      
      // Layered canopy leaves
      const leaf = this.scene.add.circle(x, y, size, 0x228b22, 0.7);
      leaf.setScrollFactor(0.2); // Far background parallax
      
      // Add subtle animation
      this.scene.tweens.add({
        targets: leaf,
        scaleX: { from: 1, to: 1.1 },
        scaleY: { from: 1, to: 0.95 },
        duration: Phaser.Math.Between(3000, 5000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: Phaser.Math.Between(0, 2000)
      });
    }
  }

  private addTropicalTrees(): void {
    // Background tropical trees
    for (let i = 0; i < 8; i += 1) {
      const x = Phaser.Math.Between(100, this.worldWidth - 100);
      const y = this.worldHeight - Phaser.Math.Between(200, 400);
      
      // Tree trunk
      const trunk = this.scene.add.rectangle(x, y, 20, 150, 0x8b4513, 0.8);
      trunk.setScrollFactor(0.4);
      
      // Tree crown (multiple overlapping circles for fullness)
      for (let j = 0; j < 3; j += 1) {
        const crownX = x + Phaser.Math.Between(-30, 30);
        const crownY = y - 100 + Phaser.Math.Between(-20, 20);
        const crown = this.scene.add.circle(crownX, crownY, Phaser.Math.Between(40, 70), 0x2e7d32, 0.8);
        crown.setScrollFactor(0.4);
        
        // Gentle swaying animation
        this.scene.tweens.add({
          targets: crown,
          x: { from: crownX, to: crownX + Phaser.Math.Between(-10, 10) },
          duration: Phaser.Math.Between(4000, 6000),
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
          delay: Phaser.Math.Between(0, 3000)
        });
      }
    }
  }

  private addJungleVines(): void {
    // Hanging animated vines
    for (let i = 0; i < 12; i += 1) {
      const x = Phaser.Math.Between(100, this.worldWidth - 100);
      const startY = Phaser.Math.Between(50, 200);
      const length = Phaser.Math.Between(200, 400);
      
      // Create vine segments
      const vineSegments: Phaser.GameObjects.Rectangle[] = [];
      const segmentCount = Math.floor(length / 20);
      
      for (let j = 0; j < segmentCount; j += 1) {
        const segmentY = startY + (j * 20);
        const segment = this.scene.add.rectangle(x, segmentY, 6, 18, 0x2d5016, 0.9);
        segment.setScrollFactor(0.6);
        vineSegments.push(segment);
      }
      
      // Vine swaying animation
      this.scene.tweens.add({
        targets: vineSegments,
        x: { from: x, to: x + Phaser.Math.Between(-15, 15) },
        rotation: { from: 0, to: Phaser.Math.Between(-0.1, 0.1) },
        duration: Phaser.Math.Between(3000, 5000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: Phaser.Math.Between(0, 2000)
      });
    }
  }

  private addFallingLeaves(): void {
    // Animated falling leaves
    const createLeaf = () => {
      const x = Phaser.Math.Between(0, this.worldWidth);
      const y = -50;
      const leaf = this.scene.add.ellipse(x, y, 8, 12, 0x32cd32, 0.8);
      leaf.setScrollFactor(0.8);
      
      // Falling animation with gentle swaying
      this.scene.tweens.add({
        targets: leaf,
        y: this.worldHeight + 50,
        x: x + Phaser.Math.Between(-100, 100),
        rotation: Phaser.Math.Between(-2, 2),
        duration: Phaser.Math.Between(8000, 12000),
        ease: 'Sine.easeInOut',
        onComplete: () => {
          leaf.destroy();
        }
      });
    };
    
    // Initial leaves
    for (let i = 0; i < 6; i += 1) {
      this.scene.time.delayedCall(Phaser.Math.Between(0, 5000), createLeaf);
    }
    
    // Continuous leaf generation
    this.scene.time.addEvent({
      delay: Phaser.Math.Between(2000, 4000),
      callback: createLeaf,
      loop: true
    });
  }

  private addJungleMist(): void {
    // Atmospheric mist/fog
    for (let i = 0; i < 5; i += 1) {
      const x = Phaser.Math.Between(0, this.worldWidth);
      const y = this.worldHeight - Phaser.Math.Between(100, 300);
      const mist = this.scene.add.ellipse(x, y, 200, 60, 0xffffff, 0.1);
      mist.setScrollFactor(0.3);
      
      // Slow drifting animation
      this.scene.tweens.add({
        targets: mist,
        x: x + Phaser.Math.Between(-50, 50),
        alpha: { from: 0.1, to: 0.05 },
        scaleX: { from: 1, to: 1.2 },
        duration: Phaser.Math.Between(8000, 12000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: Phaser.Math.Between(0, 4000)
      });
    }
  }

  private addBirds(): void {
    // Occasional flying birds in the distance
    const createBird = () => {
      const startX = -50;
      const y = Phaser.Math.Between(100, 300);
      const bird = this.scene.add.ellipse(startX, y, 4, 2, 0x000000, 0.6);
      bird.setScrollFactor(0.2);
      
      // Flying animation across screen
      this.scene.tweens.add({
        targets: bird,
        x: this.worldWidth + 50,
        y: y + Phaser.Math.Between(-50, 50),
        duration: Phaser.Math.Between(15000, 25000),
        ease: 'Linear',
        onComplete: () => {
          bird.destroy();
        }
      });
    };
    
    // Random bird generation
    this.scene.time.addEvent({
      delay: Phaser.Math.Between(10000, 20000),
      callback: createBird,
      loop: true
    });
  }

  private addFireflies(): void {
    // Magical fireflies for evening ambiance
    for (let i = 0; i < 8; i += 1) {
      const x = Phaser.Math.Between(100, this.worldWidth - 100);
      const y = Phaser.Math.Between(300, this.worldHeight - 200);
      const firefly = this.scene.add.circle(x, y, 2, 0xffff00, 0.8);
      firefly.setScrollFactor(0.9);
      
      // Floating glow animation
      this.scene.tweens.add({
        targets: firefly,
        x: x + Phaser.Math.Between(-100, 100),
        y: y + Phaser.Math.Between(-50, 50),
        alpha: { from: 0.8, to: 0.3 },
        scale: { from: 1, to: 1.5 },
        duration: Phaser.Math.Between(3000, 6000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: Phaser.Math.Between(0, 3000)
      });
    }
  }

  private addFloatingIslandDecorations(): void {
    // Add floating debris
    for (let i = 0; i < 8; i += 1) {
      const x = Phaser.Math.Between(100, this.worldWidth - 100);
      const y = Phaser.Math.Between(100, this.worldHeight - 300);
      const debris = this.scene.add.rectangle(x, y, 20, 20, 0x87ceeb, 0.6);
      debris.setScrollFactor(0.3);
    }
  }

  private addVolcanicDecorations(): void {
    // Add volcanic smoke/particles
    for (let i = 0; i < 3; i += 1) {
      const x = Phaser.Math.Between(200, this.worldWidth - 200);
      const y = this.worldHeight - 100;
      const smoke = this.scene.add.circle(x, y, 30, 0x696969, 0.7);
      smoke.setScrollFactor(0.8);
    }
  }

  private createPlatforms(): void {
    this.stageData.platforms.forEach(platformData => {
      const platform = this.platforms.create(
        platformData.x,
        platformData.y,
        'platform'
      );

      // Scale platform based on configuration
      platform.setScale(platformData.width, platformData.height);
      platform.refreshBody();

      // Set platform color based on stage type
      platform.setTint(this.getPlatformColor());

      // Add platform-specific properties
      platform.setData(
        'isMainPlatform',
        platformData.y > this.worldHeight - 200
      );
    });
  }

  private getPlatformColor(): number {
    const colors = {
      BATTLE_ARENA: 0x8b4513, // Rich jungle wood brown
      FLOATING_ISLANDS: 0x708090, // Slate gray
      VOLCANIC_CHAMBER: 0x2f4f4f, // Dark slate gray
    } as const;
    return colors[this.stageType as keyof typeof colors] || colors.BATTLE_ARENA;
  }

  private createBoundaries(): void {
    // Bottom boundary (death zone)
    const bottomBoundary = this.boundaries.create(
      this.worldWidth / 2,
      this.worldHeight + 50,
      ''
    );
    bottomBoundary.setSize(this.worldWidth, 100);
    bottomBoundary.setVisible(false);
    bottomBoundary.setData('boundaryType', 'death');

    // Side boundaries
    const leftBoundary = this.boundaries.create(-50, this.worldHeight / 2, '');
    leftBoundary.setSize(100, this.worldHeight);
    leftBoundary.setVisible(false);
    leftBoundary.setData('boundaryType', 'side');

    const rightBoundary = this.boundaries.create(
      this.worldWidth + 50,
      this.worldHeight / 2,
      ''
    );
    rightBoundary.setSize(100, this.worldHeight);
    rightBoundary.setVisible(false);
    rightBoundary.setData('boundaryType', 'side');

    // Top boundary (prevent players from going too high)
    const topBoundary = this.boundaries.create(this.worldWidth / 2, -50, '');
    topBoundary.setSize(this.worldWidth, 100);
    topBoundary.setVisible(false);
    topBoundary.setData('boundaryType', 'ceiling');
  }

  private createHazards(): void {
    this.stageData.hazards.forEach(hazardData => {
      const hazard = this.hazards.create(hazardData.x, hazardData.y, '');

      hazard.setSize(hazardData.width, hazardData.height);
      hazard.setData('hazardType', hazardData.type);
      hazard.setData('damage', Stage.getHazardDamage(hazardData.type));

      // Visual representation of hazard
      if (hazardData.type === 'lava') {
        hazard.setTint(0xff4500);
        hazard.setAlpha(0.8);
      }
    });
  }

  private static getHazardDamage(hazardType: string): number {
    const damages = {
      lava: 15,
      spikes: 20,
      electricity: 10,
    };
    return damages[hazardType as keyof typeof damages] || 10;
  }

  // Public methods for collision setup
  public setupPlayerCollisions(player: Phaser.Physics.Arcade.Sprite): void {
    // Platform collisions
    this.scene.physics.add.collider(player, this.platforms);

    // Set up different collision types for different boundary types
    this.boundaries.children.entries.forEach(boundary => {
      const boundarySprite = boundary as Phaser.Physics.Arcade.Sprite;
      const boundaryType = boundarySprite.getData('boundaryType');

      if (boundaryType === 'side' || boundaryType === 'ceiling') {
        // Side and ceiling boundaries should be solid colliders
        this.scene.physics.add.collider(player, boundarySprite);
      } else if (boundaryType === 'death') {
        // Death boundaries should be overlap triggers
        this.scene.physics.add.overlap(
          player,
          boundarySprite,
          (playerObj, boundaryObj) => {
            this.handleBoundaryCollision(
              playerObj as Phaser.Physics.Arcade.Sprite,
              boundaryObj as Phaser.Physics.Arcade.Sprite
            );
          },
          undefined,
          this.scene
        );
      }
    });

    // Hazard collisions
    this.scene.physics.add.overlap(
      player,
      this.hazards,
      (playerObj, hazardObj) => {
        this.handleHazardCollision(
          playerObj as Phaser.Physics.Arcade.Sprite,
          hazardObj as Phaser.Physics.Arcade.Sprite
        );
      },
      undefined,
      this.scene
    );
  }

  private handleBoundaryCollision(
    player: Phaser.Physics.Arcade.Sprite,
    boundary: Phaser.Physics.Arcade.Sprite
  ): void {
    const boundaryType = boundary.getData('boundaryType');

    if (boundaryType === 'death') {
      // Player fell off stage
      this.scene.events.emit('playerFellOffStage', player);
    }
    // Side and ceiling boundaries are now handled by proper colliders
    // so no manual handling needed
  }

  private handleHazardCollision(
    player: Phaser.Physics.Arcade.Sprite,
    hazard: Phaser.Physics.Arcade.Sprite
  ): void {
    const hazardType = hazard.getData('hazardType');
    const damage = hazard.getData('damage');

    // Emit hazard hit event
    this.scene.events.emit('playerHitHazard', {
      player,
      hazardType,
      damage,
      knockback: Stage.getHazardKnockback(hazardType),
    });
  }

  private static getHazardKnockback(hazardType: string): {
    x: number;
    y: number;
  } {
    const knockbacks = {
      lava: { x: 0, y: -200 },
      spikes: { x: 0, y: -150 },
      electricity: { x: 0, y: -100 },
    };
    return (
      knockbacks[hazardType as keyof typeof knockbacks] || { x: 0, y: -100 }
    );
  }

  // Getters
  public getPlatforms(): Phaser.Physics.Arcade.StaticGroup {
    return this.platforms;
  }

  public getBoundaries(): Phaser.Physics.Arcade.StaticGroup {
    return this.boundaries;
  }

  public getHazards(): Phaser.Physics.Arcade.StaticGroup {
    return this.hazards;
  }

  public getStageData(): (typeof GAME_CONFIG.STAGES)[StageType] {
    return this.stageData;
  }

  public getSpawnPoints(): Array<{ x: number; y: number }> {
    // Return spawn points based on main platform
    const mainPlatform = this.stageData.platforms.find(
      p => p.y > this.worldHeight - 200
    );

    if (mainPlatform) {
      return [
        { x: mainPlatform.x - 100, y: mainPlatform.y - 100 },
        { x: mainPlatform.x + 100, y: mainPlatform.y - 100 },
      ];
    }

    // Fallback spawn points
    return [
      { x: this.worldWidth / 2 - 100, y: this.worldHeight - 200 },
      { x: this.worldWidth / 2 + 100, y: this.worldHeight - 200 },
    ];
  }

  public destroy(): void {
    this.platforms.clear(true, true);
    this.boundaries.clear(true, true);
    this.hazards.clear(true, true);
    this.backgroundGraphics.destroy();
  }
}
