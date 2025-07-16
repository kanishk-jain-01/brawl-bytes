/*
 * Player Entity
 * -------------
 * The main player character class that extends Phaser's Arcade Physics Sprite.
 * Handles character movement, jumping (including double jump), attack system, health management, and stock system.
 * Features physics-based movement with character-specific stats, invulnerability frames, knockback mechanics, and respawn logic.
 * Supports both local and network player types, with input state management and visual feedback for actions.
 * Includes collision detection, damage calculation, and defeat conditions for the fighting game mechanics.
 */

import Phaser from 'phaser';
import type { DamageInfo, PlayerConfig } from '@/types';
import { DamageType } from '@/types';
import {
  GAME_CONFIG,
  CharacterType,
  getCharacterStats,
} from '../utils/constants';
import { getSocketManager } from '../utils/socket';

export class Player extends Phaser.Physics.Arcade.Sprite {
  public characterType: CharacterType;

  public playerId: string;

  public isLocalPlayer: boolean;

  private character: (typeof GAME_CONFIG.CHARACTERS)[CharacterType];

  private currentHealth: number;

  private currentStocks: number;

  private maxHealth: number;

  private isInvulnerable: boolean = false;

  private invulnerabilityTimer: Phaser.Time.TimerEvent | null = null;

  // Damage system
  private damageMultiplier: number = 1.0;

  private lastDamageTime: number = 0;

  private accumulatedDamage: number = 0;

  // Movement state
  private isGrounded: boolean = false;

  private canDoubleJump: boolean = false;

  private hasUsedDoubleJump: boolean = false;

  // Attack state
  private isAttacking: boolean = false;

  private attackCooldown: number = 0;

  private lastAttackTime: number = 0;

  // Animation state
  private animationState:
    | 'idle'
    | 'walking'
    | 'jumping'
    | 'falling'
    | 'attacking' = 'idle';

  private currentTween: Phaser.Tweens.Tween | null = null;

  // Input state (for local player)
  private inputState = {
    left: false,
    right: false,
    up: false,
    down: false,
    attack: false,
    special: false,
  };

  // Network synchronization
  private lastSyncPosition: { x: number; y: number } = { x: 0, y: 0 };

  private lastSyncVelocity: { x: number; y: number } = { x: 0, y: 0 };

  private lastSyncTime: number = 0;

  private positionSyncRate: number = GAME_CONFIG.NETWORK.POSITION_SYNC_RATE; // ms between position updates

  private inputSequence: number = 0;

  // Client-side prediction
  private inputBuffer: Array<{
    sequence: number;
    input: {
      left: boolean;
      right: boolean;
      up: boolean;
      down: boolean;
      attack: boolean;
      special: boolean;
    };
    timestamp: number;
    position: { x: number; y: number };
    velocity: { x: number; y: number };
  }> = [];

  private serverState: {
    position: { x: number; y: number };
    velocity: { x: number; y: number };
    sequence: number;
    timestamp: number;
  } | null = null;

  private maxInputBufferSize: number =
    GAME_CONFIG.NETWORK.MAX_INPUT_BUFFER_SIZE; // Keep ~1 second of inputs at 60fps

  private predictionEnabled: boolean = true;

  private reconciliationThreshold: number = 5; // pixels

  // Remote player interpolation (keeping only used variables)

  private interpolationBuffer: Array<{
    position: { x: number; y: number };
    velocity: { x: number; y: number };
    timestamp: number;
  }> = [];

  private maxBufferSize: number = GAME_CONFIG.NETWORK.MAX_BUFFER_SIZE;

  private interpolationDelay: number = GAME_CONFIG.NETWORK.INTERPOLATION_DELAY; // ms

  constructor(config: PlayerConfig) {
    super(config.scene, config.x, config.y, 'player_placeholder');

    this.characterType = config.characterType;
    this.playerId = config.playerId;
    this.isLocalPlayer = config.isLocalPlayer;

    this.character = getCharacterStats(this.characterType as string);
    console.log('🎮 Character loaded:', this.characterType, this.character);

    // Strict validation - database constants must be loaded
    if (!GAME_CONFIG.GAME.MAX_STOCKS) {
      throw new Error(
        'Game constants not loaded from database. Cannot create player.'
      );
    }

    this.maxHealth = this.character.health;
    this.currentHealth = this.maxHealth;
    this.currentStocks = GAME_CONFIG.GAME.MAX_STOCKS;

    this.setupPhysics();
    this.setupVisuals();
    this.setupEventListeners();

    // Add to scene
    config.scene.add.existing(this);
    config.scene.physics.add.existing(this);
  }

  private setupPhysics(): void {
    if (!this.body) return;

    const body = this.body as Phaser.Physics.Arcade.Body;

    // Set physics properties based on character
    body.setCollideWorldBounds(false); // Boundaries handled by Stage entity
    body.setBounce(GAME_CONFIG.PHYSICS.BOUNCE_FACTOR);
    body.setDragX(GAME_CONFIG.PHYSICS.FRICTION * 1000);
    body.setMaxVelocity(
      GAME_CONFIG.PHYSICS.MAX_VELOCITY,
      GAME_CONFIG.PHYSICS.MAX_VELOCITY
    );

    // Set hitbox size
    body.setSize(
      GAME_CONFIG.PLAYER.COLLISION_BOX.WIDTH,
      GAME_CONFIG.PLAYER.COLLISION_BOX.HEIGHT
    );
    body.setOffset(5, 5);
  }

  private setupVisuals(): void {
    // Set display size and color based on character
    this.setDisplaySize(
      GAME_CONFIG.PLAYER.DISPLAY_SIZE.WIDTH,
      GAME_CONFIG.PLAYER.DISPLAY_SIZE.HEIGHT
    );
    this.setTint(this.getCharacterColor());

    // Set origin for proper positioning
    this.setOrigin(0.5, 1);
  }

  private setupEventListeners(): void {
    // Listen for physics events
    this.scene.physics.world.on('worldbounds', this.handleWorldBounds, this);
  }

  private getCharacterColor(): number {
    const colors = {
      FAST_LIGHTWEIGHT: 0x27ae60,
      BALANCED_ALLROUNDER: 0x3498db,
      HEAVY_HITTER: 0xe74c3c,
    } as const;
    return (
      colors[this.characterType as keyof typeof colors] ||
      colors.BALANCED_ALLROUNDER
    );
  }

  private handleWorldBounds(): void {
    // Handle player falling off stage
    if (this.y > this.scene.physics.world.bounds.height) {
      this.takeDamage({
        amount: GAME_CONFIG.DAMAGE.FALL_DAMAGE,
        type: DamageType.FALL,
        source: 'world_bounds',
      });
      this.respawn();
    }
  }

  public updateInputState(inputState: Partial<typeof this.inputState>): void {
    if (!this.isLocalPlayer) return;

    Object.assign(this.inputState, inputState);

    // Store input for prediction if enabled
    if (this.predictionEnabled) {
      this.storeInputForPrediction();
    }
  }

  public update(): void {
    if (this.isLocalPlayer) {
      this.updateMovement();
      this.updateNetworkSync();
      this.performServerReconciliation();
    } else {
      this.updateRemotePlayerInterpolation();
    }

    this.updateAttack();
    this.updateGroundedState();
    this.updateInvulnerability();
    this.updateAnimationState();
  }

  private updateMovement(): void {
    if (!this.body || this.isAttacking) return;

    const body = this.body as Phaser.Physics.Arcade.Body;

    // Horizontal movement
    if (this.inputState.left) {
      body.setVelocityX(-this.character.speed);
      this.setFlipX(true);
    } else if (this.inputState.right) {
      body.setVelocityX(this.character.speed);
      this.setFlipX(false);
    }

    // Jumping
    if (this.inputState.up && this.canJump()) {
      this.jump();
    }
  }

  private updateAttack(): void {
    // Ensure scene time plugin is ready before accessing it
    if (!this.scene || !this.scene.time) return;

    const currentTime = this.scene.time.now;

    // Update attack cooldown
    if (currentTime - this.lastAttackTime > this.attackCooldown) {
      this.isAttacking = false;
    }

    // Handle attack input
    if (this.inputState.attack && !this.isAttacking && this.canAttack()) {
      this.performAttack();
    }
  }

  private updateGroundedState(): void {
    if (!this.body) return;

    const body = this.body as Phaser.Physics.Arcade.Body;
    const wasGrounded = this.isGrounded;
    this.isGrounded = body.touching.down;

    // Reset double jump when landing
    if (!wasGrounded && this.isGrounded) {
      this.hasUsedDoubleJump = false;
      this.canDoubleJump = true;
    }
  }

  private updateInvulnerability(): void {
    if (this.isInvulnerable) {
      // Flash effect during invulnerability
      this.setAlpha(
        this.scene.time.now % GAME_CONFIG.TIMING.FLASH_INTERVAL <
          GAME_CONFIG.TIMING.FLASH_INTERVAL / 2
          ? 0.5
          : 1
      );
    } else {
      this.setAlpha(1);
    }
  }

  private updateAnimationState(): void {
    if (!this.body) return;

    const body = this.body as Phaser.Physics.Arcade.Body;
    const prevState = this.animationState;

    // Determine new animation state
    if (this.isAttacking) {
      this.animationState = 'attacking';
    } else if (!this.isGrounded && body.velocity.y > 0) {
      this.animationState = 'falling';
    } else if (!this.isGrounded && body.velocity.y < 0) {
      this.animationState = 'jumping';
    } else if (
      Math.abs(body.velocity.x) > GAME_CONFIG.PHYSICS.WALKING_THRESHOLD
    ) {
      this.animationState = 'walking';
    } else {
      this.animationState = 'idle';
    }

    // Apply visual effects if state changed
    if (prevState !== this.animationState) {
      this.playAnimation(this.animationState);
    }
  }

  private playAnimation(newState: string): void {
    // Stop current tween
    if (this.currentTween) {
      this.currentTween.stop();
      this.currentTween = null;
    }

    // Reset transform
    this.setScale(1);
    this.setRotation(0);

    // Apply state-specific animations
    switch (newState) {
      case 'idle':
        this.playIdleAnimation();
        break;
      case 'walking':
        this.playWalkingAnimation();
        break;
      case 'jumping':
        this.playJumpingAnimation();
        break;
      case 'falling':
        this.playFallingAnimation();
        break;
      case 'attacking':
        this.playAttackingAnimation();
        break;
      default:
        this.playIdleAnimation();
        break;
    }
  }

  private playIdleAnimation(): void {
    // Gentle breathing effect
    this.currentTween = this.scene.tweens.add({
      targets: this,
      scaleY: GAME_CONFIG.ANIMATION.BREATHING_SCALE.SCALE_Y,
      duration: GAME_CONFIG.ANIMATION.BREATHING_SCALE.DURATION,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });
  }

  private playWalkingAnimation(): void {
    // Subtle bounce while walking
    this.currentTween = this.scene.tweens.add({
      targets: this,
      scaleY: GAME_CONFIG.ANIMATION.HIT_EFFECT.SCALE_Y,
      duration: GAME_CONFIG.ANIMATION.HIT_EFFECT.DURATION,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });
  }

  private playJumpingAnimation(): void {
    // Stretch effect when jumping
    this.currentTween = this.scene.tweens.add({
      targets: this,
      scaleY: GAME_CONFIG.ANIMATION.DAMAGE_EFFECT.SCALE_Y,
      scaleX: 0.95,
      duration: GAME_CONFIG.ANIMATION.DAMAGE_EFFECT.DURATION,
      ease: 'Back.easeOut',
      yoyo: false,
      onComplete: () => {
        this.setScale(1);
      },
    });
  }

  private playFallingAnimation(): void {
    // Compress effect when falling
    this.currentTween = this.scene.tweens.add({
      targets: this,
      scaleY: 0.9,
      scaleX: 1.1,
      duration: 300,
      ease: 'Sine.easeInOut',
      yoyo: false,
    });
  }

  private playAttackingAnimation(): void {
    // Scale up briefly for attack
    this.currentTween = this.scene.tweens.add({
      targets: this,
      scaleX: 1.2,
      scaleY: 1.1,
      duration: 100,
      ease: 'Back.easeOut',
      yoyo: true,
      onComplete: () => {
        this.setScale(1);
      },
    });
  }

  private canJump(): boolean {
    return this.isGrounded || (this.canDoubleJump && !this.hasUsedDoubleJump);
  }

  private jump(): void {
    if (!this.body) return;

    const body = this.body as Phaser.Physics.Arcade.Body;

    if (this.isGrounded) {
      // Normal jump
      body.setVelocityY(this.character.jumpVelocity);
      this.syncInputAction('jump', { jumpType: 'single' });
    } else if (this.canDoubleJump && !this.hasUsedDoubleJump) {
      // Double jump
      body.setVelocityY(
        this.character.jumpVelocity * GAME_CONFIG.PHYSICS.DOUBLE_JUMP_MULTIPLIER
      );
      this.hasUsedDoubleJump = true;
      this.syncInputAction('jump', { jumpType: 'double' });
    }
  }

  private canAttack(): boolean {
    return (
      !this.isAttacking &&
      this.scene.time.now - this.lastAttackTime > this.attackCooldown
    );
  }

  private performAttack(): void {
    this.isAttacking = true;
    this.lastAttackTime = this.scene.time.now;
    this.attackCooldown = GAME_CONFIG.TIMING.ATTACK_COOLDOWN;

    // Create attack hitbox
    this.createAttackHitbox();

    // Sync attack with other players
    this.syncAttack('basic');

    // Visual feedback
    this.setTint(0xffffff);
    this.scene.time.delayedCall(100, () => {
      this.setTint(this.getCharacterColor());
    });
  }

  private createAttackHitbox(): void {
    if (!this.body) return;

    const hitboxWidth = 80;
    const hitboxHeight = 60;

    // Position hitbox in front of player
    const hitboxX = this.flipX
      ? this.x - hitboxWidth / 2
      : this.x + hitboxWidth / 2;
    const hitboxY = this.y - hitboxHeight / 2;

    // Create temporary hitbox for attack detection
    const attackHitbox = this.scene.add.rectangle(
      hitboxX,
      hitboxY,
      hitboxWidth,
      hitboxHeight,
      0xff0000,
      0.3
    );

    // Enable physics for hitbox
    this.scene.physics.add.existing(attackHitbox);

    // Set hitbox as sensor (doesn't cause physical collision)
    if (attackHitbox.body) {
      (attackHitbox.body as Phaser.Physics.Arcade.Body).setImmovable(true);
    }

    // Store attack data on hitbox
    attackHitbox.setData('attacker', this);
    attackHitbox.setData('damage', this.character.attackDamage);
    attackHitbox.setData('knockback', this.calculateAttackKnockback());

    // Emit event for GameScene to handle collisions
    this.scene.events.emit('attackHitboxCreated', {
      hitbox: attackHitbox,
      attacker: this,
      damage: this.character.attackDamage,
      knockback: this.calculateAttackKnockback(),
    });

    // Remove hitbox after brief duration
    this.scene.time.delayedCall(100, () => {
      if (attackHitbox && attackHitbox.active) {
        this.scene.events.emit('attackHitboxDestroyed', attackHitbox);
        attackHitbox.destroy();
      }
    });

    // Store reference for collision detection
    this.setData('attackHitbox', attackHitbox);
  }

  private calculateAttackKnockback(): { x: number; y: number } {
    const knockbackForce = GAME_CONFIG.COMBAT.MAX_KNOCKBACK_VELOCITY / 4; // Base knockback
    const direction = this.flipX ? -1 : 1;

    return {
      x: direction * knockbackForce,
      y: -150, // Slight upward knockback
    };
  }

  public takeDamage(damageInfo: DamageInfo): void {
    if (this.isInvulnerable || this.currentHealth <= 0) return;

    // Calculate actual damage
    const actualDamage = this.calculateDamage(damageInfo);

    // Apply damage
    this.currentHealth = Math.max(0, this.currentHealth - actualDamage);
    this.accumulatedDamage += actualDamage;
    this.lastDamageTime = this.scene.time.now;

    // Apply knockback
    if (damageInfo.knockback && this.body) {
      const body = this.body as Phaser.Physics.Arcade.Body;
      const scaledKnockback = this.calculateKnockback(damageInfo);
      body.setVelocity(scaledKnockback.x, scaledKnockback.y);
    }

    // Visual feedback
    this.applyDamageVisualFeedback(damageInfo);

    // Grant temporary invulnerability
    const invulnerabilityDuration = damageInfo.isCritical
      ? GAME_CONFIG.TIMING.CRITICAL_INVULNERABILITY_DURATION
      : GAME_CONFIG.TIMING.INVULNERABILITY_DURATION;
    this.makeInvulnerable(invulnerabilityDuration);

    // Check if player is defeated
    if (this.currentHealth <= 0) {
      this.loseStock();
    }

    // Emit damage event for logging/statistics
    this.scene.events.emit('playerDamaged', {
      playerId: this.playerId,
      damage: actualDamage,
      damageType: damageInfo.type,
      isCritical: damageInfo.isCritical,
      source: damageInfo.source,
      remainingHealth: this.currentHealth,
      remainingStocks: this.currentStocks,
    });
  }

  private calculateDamage(damageInfo: DamageInfo): number {
    let damage = damageInfo.amount;

    // Apply damage type modifiers
    switch (damageInfo.type) {
      case DamageType.PHYSICAL:
        // Physical damage is affected by character weight (heavier = more resistant)
        damage *= this.getPhysicalDamageMultiplier();
        break;
      case DamageType.ELEMENTAL:
        // Elemental damage bypasses some physical defenses
        damage *= 1.1;
        break;
      case DamageType.ENVIRONMENTAL:
        // Environmental damage is consistent
        damage *= 1.0;
        break;
      case DamageType.FALL:
        // Fall damage scales with accumulated damage
        damage *= this.getFallDamageMultiplier();
        break;
      default:
        damage *= 1.0;
        break;
    }

    // Apply critical hit multiplier
    if (damageInfo.isCritical) {
      damage *= GAME_CONFIG.DAMAGE.CRITICAL_MULTIPLIER;
    }

    // Apply character-specific damage multiplier
    damage *= this.damageMultiplier;

    return Math.ceil(damage);
  }

  private getPhysicalDamageMultiplier(): number {
    // Heavier characters take less physical damage
    const weightResistance = 1.0 - (this.character.weight - 1.0) * 0.1;
    return Math.max(0.7, weightResistance);
  }

  private getFallDamageMultiplier(): number {
    // Fall damage increases with accumulated damage (like in Smash Bros)
    const damagePercent = (this.accumulatedDamage / this.maxHealth) * 100;
    return 1.0 + damagePercent * 0.01;
  }

  private calculateKnockback(damageInfo: DamageInfo): { x: number; y: number } {
    if (!damageInfo.knockback) return { x: 0, y: 0 };

    const { x, y } = damageInfo.knockback;

    // Knockback scales with accumulated damage and character weight
    const damagePercent = (this.accumulatedDamage / this.maxHealth) * 100;
    const knockbackMultiplier = 1.0 + damagePercent * 0.015;
    const weightMultiplier = 1.0 / this.character.weight;

    return {
      x: x * knockbackMultiplier * weightMultiplier,
      y: y * knockbackMultiplier * weightMultiplier,
    };
  }

  private applyDamageVisualFeedback(damageInfo: DamageInfo): void {
    // Different visual effects based on damage type
    let tintColor = 0xff0000; // Default red
    let shakeDuration = 200;

    switch (damageInfo.type) {
      case DamageType.PHYSICAL:
        tintColor = 0xff0000; // Red
        break;
      case DamageType.ELEMENTAL:
        tintColor = 0x00ffff; // Cyan
        break;
      case DamageType.ENVIRONMENTAL:
        tintColor = 0xffff00; // Yellow
        break;
      case DamageType.FALL:
        tintColor = 0xff8800; // Orange
        break;
      default:
        tintColor = 0xff0000; // Default to red
        break;
    }

    // Critical hits have more intense visual feedback
    if (damageInfo.isCritical) {
      tintColor = 0xffffff; // White flash for critical
      shakeDuration = GAME_CONFIG.ANIMATION.HIT_EFFECT.DURATION;
    }

    this.setTint(tintColor);
    this.scene.time.delayedCall(shakeDuration, () => {
      this.setTint(this.getCharacterColor());
    });
  }

  private makeInvulnerable(duration: number): void {
    this.isInvulnerable = true;

    if (this.invulnerabilityTimer) {
      this.invulnerabilityTimer.remove();
    }

    this.invulnerabilityTimer = this.scene.time.delayedCall(duration, () => {
      this.isInvulnerable = false;
      this.setAlpha(1);
    });
  }

  private loseStock(): void {
    this.currentStocks -= 1;

    if (this.currentStocks <= 0) {
      this.defeat();
    } else {
      this.respawn();
    }
  }

  public respawn(): void {
    // Get spawn point from scene event (if available)
    const spawnEvent = { x: 0, y: 0 };
    this.scene.events.emit('getSpawnPoint', spawnEvent);

    // Use spawn point if provided, otherwise use default
    const spawnX = spawnEvent.x || this.scene.physics.world.bounds.width / 2;
    const spawnY = spawnEvent.y || this.scene.physics.world.bounds.height - 200;

    this.setPosition(spawnX, spawnY);
    this.setVelocity(0, 0);

    // Reset health and accumulated damage
    this.currentHealth = this.maxHealth;
    this.accumulatedDamage = 0;

    // Reset visual state
    this.setVisible(true);
    this.setTint(this.getCharacterColor());
    this.setAlpha(1);

    // Re-enable physics
    if (this.body) {
      (this.body as Phaser.Physics.Arcade.Body).enable = true;
    }

    // Grant respawn invulnerability
    this.makeInvulnerable(GAME_CONFIG.TIMING.RESPAWN_INVULNERABILITY);

    // Emit respawn event
    this.scene.events.emit('playerRespawned', {
      playerId: this.playerId,
      spawnX,
      spawnY,
      remainingStocks: this.currentStocks,
    });
  }

  private defeat(): void {
    // Handle player defeat
    this.setVisible(false);
    if (this.body) {
      (this.body as Phaser.Physics.Arcade.Body).enable = false;
    }

    // Emit defeat event
    this.scene.events.emit('playerDefeated', this.playerId);
  }

  // Healing and recovery methods
  public heal(amount: number): void {
    if (this.currentHealth <= 0) return;

    const healAmount = Math.min(amount, this.maxHealth - this.currentHealth);
    this.currentHealth += healAmount;

    // Visual feedback for healing
    this.setTint(0x00ff00); // Green tint
    this.scene.time.delayedCall(
      GAME_CONFIG.ANIMATION.HIT_EFFECT.DURATION,
      () => {
        this.setTint(this.getCharacterColor());
      }
    );

    // Emit healing event
    this.scene.events.emit('playerHealed', {
      playerId: this.playerId,
      healAmount,
      currentHealth: this.currentHealth,
    });
  }

  public resetDamageMultiplier(): void {
    this.damageMultiplier = 1.0;
  }

  public applyDamageBoost(multiplier: number, duration: number): void {
    this.damageMultiplier = multiplier;
    this.scene.time.delayedCall(duration, () => {
      this.damageMultiplier = 1.0;
    });
  }

  public getDamagePercent(): number {
    return (this.accumulatedDamage / this.maxHealth) * 100;
  }

  // Getters for UI and game state
  public getHealth(): number {
    return this.currentHealth;
  }

  public getMaxHealth(): number {
    return this.maxHealth;
  }

  public getStocks(): number {
    return this.currentStocks;
  }

  public getCharacterData(): (typeof GAME_CONFIG.CHARACTERS)[CharacterType] {
    return this.character;
  }

  public isDefeated(): boolean {
    return this.currentStocks <= 0;
  }

  public getAttackHitbox(): Phaser.GameObjects.Rectangle | null {
    return this.getData('attackHitbox') || null;
  }

  public getAccumulatedDamage(): number {
    return this.accumulatedDamage;
  }

  public getTimeSinceLastDamage(): number {
    return this.scene.time.now - this.lastDamageTime;
  }

  // Network synchronization methods
  private updateNetworkSync(): void {
    if (!this.isLocalPlayer) return;

    // Defensive: ensure scene and its time plugin are available
    if (!this.scene || !this.scene.time) {
      // Scene not fully initialised yet; skip this frame
      return;
    }

    const currentTime = this.scene.time.now;
    if (currentTime - this.lastSyncTime < this.positionSyncRate) return;

    const socketManager = getSocketManager();
    if (!socketManager || !socketManager.isInRoom()) return;

    // Only sync if position or velocity has changed significantly
    const body = this.body as Phaser.Physics.Arcade.Body;
    const positionChanged =
      Math.abs(this.x - this.lastSyncPosition.x) > 1 ||
      Math.abs(this.y - this.lastSyncPosition.y) > 1;

    const velocityChanged =
      Math.abs(body.velocity.x - this.lastSyncVelocity.x) > 5 ||
      Math.abs(body.velocity.y - this.lastSyncVelocity.y) > 5;

    if (positionChanged || velocityChanged) {
      this.syncPosition();
      this.lastSyncTime = currentTime;
    }
  }

  private syncPosition(): void {
    const socketManager = getSocketManager();
    if (!socketManager || !this.body) return;

    const body = this.body as Phaser.Physics.Arcade.Body;
    const position = { x: this.x, y: this.y };
    const velocity = { x: body.velocity.x, y: body.velocity.y };

    this.inputSequence += 1;

    // Send position with sequence number for server reconciliation
    socketManager.sendPlayerInput(
      'move',
      { position, velocity },
      this.inputSequence
    );

    // Update last sync values
    this.lastSyncPosition = { ...position };
    this.lastSyncVelocity = { ...velocity };
  }

  public syncAttack(attackType: string): void {
    if (!this.isLocalPlayer) return;

    const socketManager = getSocketManager();
    if (!socketManager) return;

    const direction = this.flipX ? -1 : 1;
    socketManager.sendPlayerAttack(attackType, direction);
  }

  public syncInputAction(inputType: 'jump' | 'special', data?: any): void {
    if (!this.isLocalPlayer) return;

    const socketManager = getSocketManager();
    if (!socketManager) return;

    this.inputSequence += 1;

    if (inputType === 'jump') {
      socketManager.sendPlayerJump(data?.jumpType || 'single');
    } else if (inputType === 'special') {
      socketManager.sendPlayerSpecial(data?.specialType || 'default', data);
    }
  }

  // Methods to handle remote player updates
  public applyRemotePosition(
    position: { x: number; y: number },
    velocity: { x: number; y: number }
  ): void {
    if (this.isLocalPlayer) return;

    const currentTime = this.scene.time.now;

    // Add to interpolation buffer
    this.interpolationBuffer.push({
      position: { ...position },
      velocity: { ...velocity },
      timestamp: currentTime,
    });

    // Keep buffer size manageable
    if (this.interpolationBuffer.length > this.maxBufferSize) {
      this.interpolationBuffer.shift();
    }
  }

  public applyRemoteAttack(_attackType: string, direction: number): void {
    if (this.isLocalPlayer) return;

    // Apply remote player attack animation and effects
    this.setFlipX(direction < 0);
    this.performAttack(); // Use existing attack method
  }

  public applyRemoteAction(inputType: 'jump' | 'special'): void {
    if (this.isLocalPlayer) return;

    switch (inputType) {
      case 'jump':
        if (this.canJump()) {
          this.jump();
        }
        break;
      case 'special':
        // Handle special move based on data.specialType
        break;
      default:
        // No action needed for unknown input types
        break;
    }
  }

  private updateRemotePlayerInterpolation(): void {
    if (this.isLocalPlayer || this.interpolationBuffer.length === 0) return;

    const currentTime = this.scene.time.now;
    const renderTime = currentTime - this.interpolationDelay;

    // Find the two states to interpolate between
    let fromState = null;
    let toState = null;

    for (let i = 0; i < this.interpolationBuffer.length - 1; i += 1) {
      const current = this.interpolationBuffer[i];
      const next = this.interpolationBuffer[i + 1];

      if (current.timestamp <= renderTime && next.timestamp >= renderTime) {
        fromState = current;
        toState = next;
        break;
      }
    }

    // If no valid interpolation states, use the most recent
    if (!fromState || !toState) {
      const latest =
        this.interpolationBuffer[this.interpolationBuffer.length - 1];
      if (latest) {
        this.setPosition(latest.position.x, latest.position.y);
        if (this.body) {
          const body = this.body as Phaser.Physics.Arcade.Body;
          body.setVelocity(latest.velocity.x, latest.velocity.y);
        }
      }
      return;
    }

    // Calculate interpolation factor
    const timeDiff = toState.timestamp - fromState.timestamp;
    const elapsed = renderTime - fromState.timestamp;
    const t = timeDiff > 0 ? Math.min(1, elapsed / timeDiff) : 1;

    // Interpolate position
    const interpolatedX = Player.lerp(
      fromState.position.x,
      toState.position.x,
      t
    );
    const interpolatedY = Player.lerp(
      fromState.position.y,
      toState.position.y,
      t
    );

    // Interpolate velocity
    const interpolatedVelX = Player.lerp(
      fromState.velocity.x,
      toState.velocity.x,
      t
    );
    const interpolatedVelY = Player.lerp(
      fromState.velocity.y,
      toState.velocity.y,
      t
    );

    // Apply interpolated values
    this.setPosition(interpolatedX, interpolatedY);

    if (this.body) {
      const body = this.body as Phaser.Physics.Arcade.Body;
      body.setVelocity(interpolatedVelX, interpolatedVelY);
    }

    // Clean up old states
    this.cleanupInterpolationBuffer(renderTime);
  }

  private static lerp(start: number, end: number, t: number): number {
    return start + (end - start) * t;
  }

  private cleanupInterpolationBuffer(renderTime: number): void {
    // Remove states older than render time to keep buffer clean
    while (
      this.interpolationBuffer.length > 2 &&
      this.interpolationBuffer[1].timestamp <
        renderTime - this.interpolationDelay
    ) {
      this.interpolationBuffer.shift();
    }
  }

  // Client-side prediction methods
  private storeInputForPrediction(): void {
    if (!this.body) return;

    const body = this.body as Phaser.Physics.Arcade.Body;
    this.inputSequence += 1;

    const inputSnapshot = {
      sequence: this.inputSequence,
      input: { ...this.inputState },
      timestamp: this.scene.time.now,
      position: { x: this.x, y: this.y },
      velocity: { x: body.velocity.x, y: body.velocity.y },
    };

    this.inputBuffer.push(inputSnapshot);

    // Keep buffer size manageable
    if (this.inputBuffer.length > this.maxInputBufferSize) {
      this.inputBuffer.shift();
    }
  }

  private performServerReconciliation(): void {
    if (!this.serverState || !this.predictionEnabled) return;

    // Find the input that corresponds to the server state
    const serverSequence = this.serverState.sequence;
    const inputIndex = this.inputBuffer.findIndex(
      input => input.sequence === serverSequence
    );

    if (inputIndex === -1) {
      // Server state is too old, ignore it
      return;
    }

    const serverPosition = this.serverState.position;
    const predictedInput = this.inputBuffer[inputIndex];

    // Check if prediction differs significantly from server state
    const positionError = Math.sqrt(
      (predictedInput.position.x - serverPosition.x) ** 2 +
        (predictedInput.position.y - serverPosition.y) ** 2
    );

    if (positionError > this.reconciliationThreshold) {
      // Server correction needed - rollback and replay
      this.rollbackAndReplay(
        inputIndex,
        serverPosition,
        this.serverState.velocity
      );
    }

    // Clean up acknowledged inputs
    this.inputBuffer.splice(0, inputIndex + 1);
  }

  private rollbackAndReplay(
    correctionIndex: number,
    serverPosition: { x: number; y: number },
    serverVelocity: { x: number; y: number }
  ): void {
    if (!this.body) return;

    // Rollback to server state
    this.setPosition(serverPosition.x, serverPosition.y);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(serverVelocity.x, serverVelocity.y);

    // Replay inputs from the correction point
    for (let i = correctionIndex + 1; i < this.inputBuffer.length; i += 1) {
      const input = this.inputBuffer[i];
      this.simulateInput(input.input);
    }
  }

  private simulateInput(input: {
    left: boolean;
    right: boolean;
    up: boolean;
    down: boolean;
    attack: boolean;
    special: boolean;
  }): void {
    if (!this.body) return;

    const originalInput = { ...this.inputState };

    // Temporarily apply the input
    this.inputState = { ...input };

    // Simulate one frame of movement
    this.updateMovement();

    // Restore current input
    this.inputState = originalInput;
  }

  public applyServerState(
    position: { x: number; y: number },
    velocity: { x: number; y: number },
    sequence: number,
    timestamp: number
  ): void {
    if (!this.isLocalPlayer) return;

    this.serverState = {
      position: { ...position },
      velocity: { ...velocity },
      sequence,
      timestamp,
    };
  }

  // Utility methods for prediction
  public setPredictionEnabled(enabled: boolean): void {
    this.predictionEnabled = enabled;
    if (!enabled) {
      this.inputBuffer = [];
      this.serverState = null;
    }
  }

  public getInputSequence(): number {
    return this.inputSequence;
  }

  public getPredictionStats(): {
    bufferSize: number;
    lastServerSequence: number | null;
    predictionEnabled: boolean;
  } {
    return {
      bufferSize: this.inputBuffer.length,
      lastServerSequence: this.serverState?.sequence || null,
      predictionEnabled: this.predictionEnabled,
    };
  }

  destroy(): void {
    if (this.invulnerabilityTimer) {
      this.invulnerabilityTimer.remove();
    }

    if (this.currentTween) {
      this.currentTween.stop();
      this.currentTween = null;
    }

    if (this.scene && this.scene.physics) {
      this.scene.physics.world.off('worldbounds', this.handleWorldBounds, this);
    }

    super.destroy();
  }
}
