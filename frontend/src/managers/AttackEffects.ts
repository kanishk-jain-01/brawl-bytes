/*
 * Attack Effects Manager
 * ----------------------
 * Manages dynamic visual effects for attacks, replacing the simple red rectangle
 * with animated slash effects, particles, and impact animations.
 * Provides character-specific attack visuals and customizable effect parameters.
 */

import Phaser from 'phaser';
import { CharacterType } from '@/utils/constants';

export interface AttackEffectConfig {
  scene: Phaser.Scene;
  x: number;
  y: number;
  width: number;
  height: number;
  direction: 'left' | 'right';
  characterType?: CharacterType;
  attackType?: 'light' | 'heavy' | 'special';
  duration?: number;
}

export class AttackEffects {
  private scene: Phaser.Scene;

  private effectContainer: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.effectContainer = this.scene.add.container(0, 0);
    this.effectContainer.setDepth(1000); // Ensure effects are above other game objects
  }

  /**
   * Create an animated slash effect
   */
  public createSlashEffect(
    config: AttackEffectConfig
  ): Phaser.GameObjects.Group {
    const effectGroup = this.scene.add.group();

    // Create multiple slash lines for a more dynamic effect
    const slashCount = 3;
    const baseAngle = config.direction === 'right' ? -30 : 30;

    for (let i = 0; i < slashCount; i += 1) {
      const angle = baseAngle + i * 15;
      const offsetX = i * 10 * (config.direction === 'right' ? 1 : -1);
      const offsetY = i * 5;

      // Create slash line using graphics
      const slash = this.scene.add.graphics();
      slash.lineStyle(4, 0xffffff, 1);
      slash.beginPath();
      slash.moveTo(0, 0);
      slash.lineTo(config.width * 0.8, 0);
      slash.strokePath();

      // Position and rotate
      slash.setPosition(config.x + offsetX, config.y + offsetY);
      slash.setRotation(Phaser.Math.DegToRad(angle));
      slash.setAlpha(0.9 - i * 0.2);

      effectGroup.add(slash);

      // Animate the slash
      this.scene.tweens.add({
        targets: slash,
        scaleX: { from: 0, to: 1.2 },
        scaleY: { from: 0.1, to: 1 },
        alpha: { from: 0.9 - i * 0.2, to: 0 },
        duration: config.duration || 150,
        delay: i * 20,
        ease: 'Power2',
        onComplete: () => {
          slash.destroy();
        },
      });
    }

    return effectGroup;
  }

  /**
   * Create particle burst effect
   */
  public createParticleEffect(
    config: AttackEffectConfig
  ): Phaser.GameObjects.Particles.ParticleEmitter {
    // Create a temporary texture for particles
    const graphics = this.scene.add.graphics();
    graphics.fillStyle(0xffffff);
    graphics.fillCircle(2, 2, 2);
    graphics.generateTexture('attack_particle', 4, 4);
    graphics.destroy();

    // Create particle emitter
    const particles = this.scene.add.particles(
      config.x,
      config.y,
      'attack_particle',
      {
        speed: { min: 50, max: 150 },
        scale: { start: 0.5, end: 0 },
        alpha: { start: 1, end: 0 },
        lifespan: 300,
        quantity: 8,
        emitZone: {
          type: 'edge',
          source: new Phaser.Geom.Rectangle(
            -config.width / 2,
            -config.height / 2,
            config.width,
            config.height
          ),
          quantity: 12,
        },
      }
    );

    // Stop emitting after initial burst
    this.scene.time.delayedCall(50, () => {
      particles.stop();
    });

    // Destroy emitter after particles fade
    this.scene.time.delayedCall(400, () => {
      particles.destroy();
    });

    return particles;
  }

  /**
   * Create energy wave effect
   */
  public createEnergyWaveEffect(
    config: AttackEffectConfig
  ): Phaser.GameObjects.Arc {
    const centerX = config.x;
    const centerY = config.y;

    // Create expanding energy ring
    const energyWave = this.scene.add.arc(
      centerX,
      centerY,
      10,
      0,
      360,
      false,
      0x00ffff,
      0.6
    );
    energyWave.setStrokeStyle(3, 0x00ffff, 1);

    // Animate expansion and fade
    this.scene.tweens.add({
      targets: energyWave,
      radius: Math.max(config.width, config.height) * 1.5,
      alpha: { from: 0.8, to: 0 },
      duration: config.duration || 200,
      ease: 'Power2',
      onComplete: () => {
        energyWave.destroy();
      },
    });

    return energyWave;
  }

  /**
   * Create character-specific attack effect
   */
  public createCharacterAttackEffect(config: AttackEffectConfig): void {
    switch (config.characterType) {
      case 'NINJA':
        this.createNinjaSlashEffect(config);
        break;
      case 'DASH':
        this.createDashSpeedEffect(config);
        break;
      case 'REX':
        this.createRexClawEffect(config);
        break;
      case 'TITAN':
        this.createTitanSmashEffect(config);
        break;
      default:
        this.createSlashEffect(config);
        break;
    }
  }

  private createNinjaSlashEffect(config: AttackEffectConfig): void {
    // Multiple quick slashes
    for (let i = 0; i < 5; i += 1) {
      this.scene.time.delayedCall(i * 30, () => {
        this.createSlashEffect({
          ...config,
          duration: 100,
          width: config.width * 0.8,
          height: config.height * 0.6,
        });
      });
    }
  }

  private createDashSpeedEffect(config: AttackEffectConfig): void {
    // Speed lines effect
    const lines = this.scene.add.group();

    for (let i = 0; i < 8; i += 1) {
      const line = this.scene.add.graphics();
      line.lineStyle(2, 0xffff00, 0.8);
      line.beginPath();
      line.moveTo(0, 0);
      line.lineTo(config.width * 0.6, 0);
      line.strokePath();

      const startX =
        config.direction === 'right'
          ? config.x - config.width
          : config.x + config.width;
      line.setPosition(startX, config.y + (i - 4) * 8);
      lines.add(line);

      this.scene.tweens.add({
        targets: line,
        x:
          config.x +
          (config.direction === 'right' ? config.width : -config.width),
        alpha: { from: 0.8, to: 0 },
        duration: 200,
        delay: i * 20,
        onComplete: () => line.destroy(),
      });
    }
  }

  private createRexClawEffect(config: AttackEffectConfig): void {
    // Claw marks effect
    const clawCount = 4;
    for (let i = 0; i < clawCount; i += 1) {
      const claw = this.scene.add.graphics();
      claw.lineStyle(3, 0xff4444, 0.9);
      claw.beginPath();
      claw.moveTo(0, 0);
      claw.lineTo(config.width * 0.7, config.height * 0.3);
      claw.strokePath();

      claw.setPosition(
        config.x - config.width / 2 + (i * config.width) / clawCount,
        config.y - config.height / 2
      );

      this.scene.tweens.add({
        targets: claw,
        scaleX: { from: 0, to: 1 },
        alpha: { from: 1, to: 0 },
        duration: 250,
        delay: i * 30,
        onComplete: () => claw.destroy(),
      });
    }
  }

  private createTitanSmashEffect(config: AttackEffectConfig): void {
    // Ground shockwave effect
    const shockwave = this.scene.add.arc(
      config.x,
      config.y + config.height / 2,
      5,
      0,
      360,
      false,
      0xff6600,
      0.4
    );
    shockwave.setStrokeStyle(4, 0xff6600, 0.8);

    this.scene.tweens.add({
      targets: shockwave,
      radius: config.width * 2,
      alpha: { from: 0.8, to: 0 },
      duration: 300,
      ease: 'Power2',
      onComplete: () => shockwave.destroy(),
    });

    // Add screen shake for impact
    this.scene.cameras.main.shake(200, 0.03);
  }

  /**
   * Create impact effect at hit location
   */
  public createImpactEffect(
    x: number,
    y: number,
    isCritical: boolean = false
  ): void {
    const impactColor = isCritical ? 0xffffff : 0xff4444;
    const impactSize = isCritical ? 30 : 20;

    // Create impact flash
    const impact = this.scene.add.circle(x, y, impactSize, impactColor, 0.8);

    this.scene.tweens.add({
      targets: impact,
      scale: { from: 0.5, to: 2 },
      alpha: { from: 0.8, to: 0 },
      duration: isCritical ? 300 : 200,
      ease: 'Power2',
      onComplete: () => impact.destroy(),
    });

    // Add particle burst
    this.createParticleEffect({
      scene: this.scene,
      x,
      y,
      width: impactSize,
      height: impactSize,
      direction: 'right',
      duration: 150,
    });
  }
}
