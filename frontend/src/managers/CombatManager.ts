import Phaser from 'phaser';
import { DamageType } from '@/types';
import type { DamageInfo } from '@/types';
import { Player } from '../entities/Player';
import { GAME_CONFIG } from '../utils/constants';
import { getSocketManager, SocketManager } from './SocketManager';

export class CombatManager {
  private scene: Phaser.Scene;

  private activeHitboxes: Phaser.GameObjects.Rectangle[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.setupAttackSystem();
  }

  private setupAttackSystem(): void {
    // Listen for attack hitbox creation
    this.scene.events.on(
      'attackHitboxCreated',
      (attackData: {
        hitbox: Phaser.GameObjects.Rectangle;
        attacker: Player;
        damage: number;
        knockback: { x: number; y: number };
      }) => {
        this.activeHitboxes.push(attackData.hitbox);
        this.setupHitboxCollision(attackData);
      }
    );

    // Listen for attack hitbox destruction
    this.scene.events.on(
      'attackHitboxDestroyed',
      (hitbox: Phaser.GameObjects.Rectangle) => {
        const index = this.activeHitboxes.indexOf(hitbox);
        if (index > -1) {
          this.activeHitboxes.splice(index, 1);
        }
      }
    );
  }

  private setupHitboxCollision(attackData: {
    hitbox: Phaser.GameObjects.Rectangle;
    attacker: Player;
    damage: number;
    knockback: { x: number; y: number };
  }): void {
    // This method needs access to all players, so we'll emit an event
    // that the GameScene can handle with its player list
    this.scene.events.emit('setupHitboxCollision', attackData);
  }

  public setupPlayerCollisions(
    attackData: {
      hitbox: Phaser.GameObjects.Rectangle;
      attacker: Player;
      damage: number;
      knockback: { x: number; y: number };
    },
    players: Player[]
  ): void {
    // Set up collision detection with all players except the attacker
    players.forEach(player => {
      if (player !== attackData.attacker && !player.isDefeated()) {
        this.scene.physics.add.overlap(
          attackData.hitbox,
          player,
          () => {
            this.handleAttackHit(
              attackData.attacker,
              player,
              attackData.damage,
              attackData.knockback
            );
          },
          undefined,
          this.scene
        );
      }
    });
  }

  private handleAttackHit(
    attacker: Player,
    victim: Player,
    damage: number,
    knockback: { x: number; y: number }
  ): void {
    // Calculate if this is a critical hit
    const isCritical = Math.random() < GAME_CONFIG.DAMAGE.CRITICAL_CHANCE;

    // Create damage info using new system
    const attackDamage: DamageInfo = {
      amount: damage,
      type: DamageType.PHYSICAL,
      knockback,
      isCritical,
      source: `attack_${attacker.playerId}`,
    };

    // Only apply damage if victim is local player (each client handles their own damage)
    if (victim.isLocalPlayer) {
      victim.takeDamage(attackDamage);
    } else if (attacker.isLocalPlayer) {
      // If we're the attacker hitting a remote player, send damage info to backend
      const socketManager = getSocketManager();
      if (socketManager) {
        SocketManager.emit('gameEvent', {
          type: 'player_hit',
          data: {
            attackerId: attacker.playerId,
            targetId: victim.playerId,
            damage: attackDamage.amount,
            damageType: attackDamage.type,
            knockback: attackDamage.knockback,
            isCritical: attackDamage.isCritical,
          },
          timestamp: Date.now(),
        });
      }
    }

    // Visual feedback (enhanced for critical hits)
    const shakeIntensity = isCritical ? 0.04 : 0.02;
    const shakeDuration = isCritical ? 200 : 100;
    this.scene.cameras.main.shake(shakeDuration, shakeIntensity);

    // Audio feedback (placeholder)
    // this.scene.sound.play(isCritical ? 'critical_hit_sound' : 'hit_sound');

    console.log(
      `${attacker.playerId} hit ${victim.playerId} for ${damage} damage${isCritical ? ' (CRITICAL!)' : ''}`
    );
  }

  public handlePlayerFallOffStage(player: Player): void {
    // Apply fall damage using new damage system
    const fallDamage: DamageInfo = {
      amount: GAME_CONFIG.DAMAGE.FALL_DAMAGE,
      type: DamageType.FALL,
      source: 'stage_fall',
    };

    player.takeDamage(fallDamage);

    // Visual feedback
    this.scene.cameras.main.shake(200, 0.03);

    console.log(`${player.playerId} fell off the stage!`);
  }

  public handlePlayerHitHazard(data: {
    player: Player;
    hazardType: string;
    damage: number;
    knockback: { x: number; y: number };
  }): void {
    // Apply hazard damage using new damage system
    const hazardDamage: DamageInfo = {
      amount: data.damage,
      type: DamageType.ENVIRONMENTAL,
      knockback: data.knockback,
      source: `hazard_${data.hazardType}`,
    };

    data.player.takeDamage(hazardDamage);

    // Visual feedback
    this.scene.cameras.main.shake(150, 0.025);

    console.log(
      `${data.player.playerId} hit ${data.hazardType} hazard for ${data.damage} damage`
    );
  }

  public getActiveHitboxes(): Phaser.GameObjects.Rectangle[] {
    return [...this.activeHitboxes];
  }

  public clearActiveHitboxes(): void {
    this.activeHitboxes.forEach(hitbox => {
      if (hitbox && hitbox.active) {
        hitbox.destroy();
      }
    });
    this.activeHitboxes = [];
  }

  public destroy(): void {
    this.clearActiveHitboxes();

    // Remove event listeners
    this.scene.events.off('attackHitboxCreated');
    this.scene.events.off('attackHitboxDestroyed');
  }
}
