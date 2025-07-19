/*
 * Attack Effects Demo
 * -------------------
 * Utility for testing and showcasing the new attack effects system.
 * Can be used to preview all character-specific effects and configurations.
 */

import { CharacterType } from '@/utils/constants';
import { AttackEffects, AttackEffectConfig } from '../managers/AttackEffects';

export class AttackEffectsDemo {
  private scene: Phaser.Scene;

  private attackEffects: AttackEffects;

  private demoContainer: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.attackEffects = new AttackEffects(scene);
    this.demoContainer = scene.add.container(0, 0);
  }

  /**
   * Demo all character-specific attack effects
   */
  public demoAllCharacterEffects(): void {
    const characters: CharacterType[] = ['NINJA', 'DASH', 'REX', 'TITAN'];
    const { width, height } = this.scene.cameras.main;

    characters.forEach((character, index) => {
      const x = (width / 5) * (index + 1);
      const y = height / 2;

      // Add character label
      const label = this.scene.add
        .text(x, y - 100, character, {
          fontSize: '16px',
          color: '#ffffff',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);

      this.demoContainer.add(label);

      // Demo attack effect for this character
      this.scene.time.delayedCall(index * 500, () => {
        this.attackEffects.createCharacterAttackEffect({
          scene: this.scene,
          x,
          y,
          width: 80,
          height: 60,
          direction: 'right',
          characterType: character,
          attackType: 'light',
          duration: 200,
        });

        // Add impact effect
        this.scene.time.delayedCall(100, () => {
          this.attackEffects.createImpactEffect(x + 50, y, false);
        });
      });
    });

    // Add demo title
    const title = this.scene.add
      .text(width / 2, 50, 'Attack Effects Demo', {
        fontSize: '24px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.demoContainer.add(title);

    // Auto cleanup after demo
    this.scene.time.delayedCall(5000, () => {
      this.cleanup();
    });
  }

  /**
   * Demo specific effect types
   */
  public demoEffectTypes(): void {
    const { width, height } = this.scene.cameras.main;
    const centerX = width / 2;
    const centerY = height / 2;

    const effects = [
      { name: 'Slash Effect', method: 'createSlashEffect' },
      { name: 'Particle Effect', method: 'createParticleEffect' },
      { name: 'Energy Wave', method: 'createEnergyWaveEffect' },
    ];

    effects.forEach((effect, index) => {
      const x = centerX + (index - 1) * 200;

      // Add effect label
      const label = this.scene.add
        .text(x, centerY - 80, effect.name, {
          fontSize: '14px',
          color: '#ffffff',
        })
        .setOrigin(0.5);

      this.demoContainer.add(label);

      // Demo the effect
      this.scene.time.delayedCall(index * 300, () => {
        const config: AttackEffectConfig = {
          scene: this.scene,
          x,
          y: centerY,
          width: 80,
          height: 60,
          direction: 'right',
          duration: 250,
        };

        switch (effect.method) {
          case 'createSlashEffect':
            this.attackEffects.createSlashEffect(config);
            break;
          case 'createParticleEffect':
            this.attackEffects.createParticleEffect(config);
            break;
          case 'createEnergyWaveEffect':
            this.attackEffects.createEnergyWaveEffect(config);
            break;
          default:
            // Default to slash effect
            this.attackEffects.createSlashEffect(config);
            break;
        }
      });
    });
  }

  /**
   * Demo critical vs normal hits
   */
  public demoCriticalEffects(): void {
    const { width, height } = this.scene.cameras.main;

    // Normal hit
    const normalX = width * 0.3;
    const criticalX = width * 0.7;
    const y = height / 2;

    // Labels
    this.scene.add
      .text(normalX, y - 60, 'Normal Hit', {
        fontSize: '16px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    this.scene.add
      .text(criticalX, y - 60, 'Critical Hit', {
        fontSize: '16px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    // Demo normal hit
    this.scene.time.delayedCall(500, () => {
      this.attackEffects.createImpactEffect(normalX, y, false);
    });

    // Demo critical hit
    this.scene.time.delayedCall(1000, () => {
      this.attackEffects.createImpactEffect(criticalX, y, true);
    });
  }

  /**
   * Start interactive demo mode
   */
  public startInteractiveDemo(): void {
    const { width, height } = this.scene.cameras.main;

    // Add instructions
    const instructions = this.scene.add
      .text(
        width / 2,
        height - 50,
        'Click anywhere to trigger attack effects!',
        {
          fontSize: '18px',
          color: '#ffffff',
          fontStyle: 'bold',
        }
      )
      .setOrigin(0.5);

    this.demoContainer.add(instructions);

    // Add click handler
    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const randomCharacter: CharacterType = Phaser.Math.RND.pick([
        'NINJA',
        'DASH',
        'REX',
        'TITAN',
      ]);
      const direction = Math.random() > 0.5 ? 'right' : 'left';
      const isCritical = Math.random() > 0.7;

      this.attackEffects.createCharacterAttackEffect({
        scene: this.scene,
        x: pointer.x,
        y: pointer.y,
        width: 80,
        height: 60,
        direction,
        characterType: randomCharacter,
        attackType: 'light',
        duration: 150,
      });

      // Add impact effect
      this.scene.time.delayedCall(100, () => {
        this.attackEffects.createImpactEffect(
          pointer.x + (direction === 'right' ? 50 : -50),
          pointer.y,
          isCritical
        );
      });
    });
  }

  /**
   * Clean up demo
   */
  public cleanup(): void {
    this.demoContainer.destroy();
    this.scene.input.removeAllListeners('pointerdown');
  }
}

// Console helper for quick testing in browser dev tools
declare global {
  interface Window {
    demoAttackEffects: (scene: Phaser.Scene) => void;
  }
}

window.demoAttackEffects = (scene: Phaser.Scene) => {
  const demo = new AttackEffectsDemo(scene);
  demo.demoAllCharacterEffects();
};
