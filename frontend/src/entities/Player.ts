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
import { SOCKET_EVENTS } from '@/types/Network';
import { getSocketManager, SocketManager } from '@/managers/SocketManager';
import { getConnectionState } from '@/state/connectionStore';
import {
  GAME_CONFIG,
  CharacterType,
  getCharacterStats,
  ASSET_KEYS,
} from '../utils/constants';

export class Player extends Phaser.Physics.Arcade.Sprite {
  public characterType: CharacterType;

  public playerId: string;

  public isLocalPlayer: boolean;

  public username: string;

  private character: (typeof GAME_CONFIG.CHARACTERS)[CharacterType];

  private currentHealth: number;

  private currentStocks: number;

  private maxHealth: number;

  private isInvulnerable: boolean = false;

  private invulnerabilityTimer: Phaser.Time.TimerEvent | null = null;

  // Separate flutter animation state (visual-only, doesn't affect gameplay)
  private isFluttering: boolean = false;

  private flutterTimer: Phaser.Time.TimerEvent | null = null;

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

  private previousFacingDirection: 'left' | 'right' = 'right';

  private currentTween: Phaser.Tweens.Tween | null = null;

  // Store base scale factors for animations
  private baseScaleX: number = 1;

  private baseScaleY: number = 1;

  // Input state (for local player)
  private inputState = {
    left: false,
    right: false,
    up: false,
    down: false,
    attack: false,
    special: false,
    jumpPressed: false,
  };

  // Add explicit facing direction state
  private facingDirection: 'left' | 'right' = 'right';

  // Network synchronization
  private lastSyncPosition: { x: number; y: number } = { x: 0, y: 0 };

  private lastSyncVelocity: { x: number; y: number } = { x: 0, y: 0 };

  private lastSyncFacing: 'left' | 'right' = 'right';

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
      jumpPressed: boolean;
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

  private static getCharacterSpriteKey(characterType: CharacterType): string {
    // Fail-first approach: strict character sprite mapping
    const spriteMapping: Record<string, string> = {
      DASH: ASSET_KEYS.SPRITESHEETS.DASH_SPRITES,
      REX: ASSET_KEYS.SPRITESHEETS.REX_SPRITES,
      TITAN: ASSET_KEYS.SPRITESHEETS.TITAN_SPRITES,
      NINJA: ASSET_KEYS.SPRITESHEETS.NINJA_SPRITES,
    };

    const spriteKey = spriteMapping[characterType];
    if (!spriteKey) {
      throw new Error(
        `No sprite asset configured for character type: ${characterType}`
      );
    }

    return spriteKey;
  }

  constructor(config: PlayerConfig) {
    // Fail-first approach: use character-specific sprite or throw error
    const spriteKey = Player.getCharacterSpriteKey(config.characterType);
    super(config.scene, config.x, config.y, spriteKey);

    this.characterType = config.characterType;
    this.playerId = config.playerId;
    this.isLocalPlayer = config.isLocalPlayer;
    this.username = config.username;

    this.character = getCharacterStats(this.characterType as string);

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
    this.setupAnimations();
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
    const targetWidth = GAME_CONFIG.PLAYER.DISPLAY_SIZE.WIDTH;
    const targetHeight = GAME_CONFIG.PLAYER.DISPLAY_SIZE.HEIGHT;

    // Force the sprite to be exactly the target size
    this.setDisplaySize(targetWidth, targetHeight);

    // Also set scale as a backup (in case setDisplaySize isn't working)
    const scaleX = targetWidth / this.width;
    const scaleY = targetHeight / this.height;
    this.setScale(scaleX, scaleY);

    // Store base scale factors for animations
    this.baseScaleX = scaleX;
    this.baseScaleY = scaleY;

    // Keep sprites in natural colors (no tinting applied)
    this.clearTint();

    // Set origin for proper positioning
    this.setOrigin(0.5, 1);
  }

  private setupAnimations(): void {
    const animKey = this.characterType.toLowerCase();
    const spriteKey = Player.getCharacterSpriteKey(this.characterType);

    console.log(
      `Setting up animations for ${this.characterType} with spriteKey: ${spriteKey}`
    );

    // Check if the texture exists
    if (!this.scene.textures.exists(spriteKey)) {
      console.error(
        `Texture ${spriteKey} not found! Cannot create animations.`
      );
      return;
    }

    try {
      // Spritesheet layout: 4 columns x 4 rows (16 frames total)
      // Row 1 (frames 0-3): Facing camera (not used)
      // Row 2 (frames 4-7): Facing right ✓
      // Row 3 (frames 8-11): Facing away (not used)
      // Row 4 (frames 12-15): Facing left ✓

      // Create animations for facing right (row 2)
      if (!this.scene.anims.exists(`${animKey}_idle_right`)) {
        this.scene.anims.create({
          key: `${animKey}_idle_right`,
          frames: this.scene.anims.generateFrameNumbers(spriteKey, {
            start: 4,
            end: 4,
          }), // First frame of row 2
          frameRate: 8,
          repeat: -1,
        });
      }

      if (!this.scene.anims.exists(`${animKey}_walk_right`)) {
        this.scene.anims.create({
          key: `${animKey}_walk_right`,
          frames: this.scene.anims.generateFrameNumbers(spriteKey, {
            start: 4,
            end: 7,
          }), // Row 2
          frameRate: 12,
          repeat: -1,
        });
      }

      // Create animations for facing left (row 4)
      if (!this.scene.anims.exists(`${animKey}_idle_left`)) {
        this.scene.anims.create({
          key: `${animKey}_idle_left`,
          frames: this.scene.anims.generateFrameNumbers(spriteKey, {
            start: 12,
            end: 12,
          }), // First frame of row 4
          frameRate: 8,
          repeat: -1,
        });
      }

      if (!this.scene.anims.exists(`${animKey}_walk_left`)) {
        this.scene.anims.create({
          key: `${animKey}_walk_left`,
          frames: this.scene.anims.generateFrameNumbers(spriteKey, {
            start: 12,
            end: 15,
          }), // Row 4
          frameRate: 12,
          repeat: -1,
        });
      }

      // Create jump animations for both directions
      // Jump right (row 2)
      if (!this.scene.anims.exists(`${animKey}_jump_right`)) {
        this.scene.anims.create({
          key: `${animKey}_jump_right`,
          frames: this.scene.anims.generateFrameNumbers(spriteKey, {
            start: 4,
            end: 7,
          }), // Row 2
          frameRate: 10,
          repeat: 0,
        });
      }

      // Jump left (row 4)
      if (!this.scene.anims.exists(`${animKey}_jump_left`)) {
        this.scene.anims.create({
          key: `${animKey}_jump_left`,
          frames: this.scene.anims.generateFrameNumbers(spriteKey, {
            start: 12,
            end: 15,
          }), // Row 4
          frameRate: 10,
          repeat: 0,
        });
      }

      // Set initial animation (facing right by default)
      this.play(`${animKey}_idle_right`);
      console.log(`Successfully created animations for ${this.characterType}`);
    } catch (error) {
      console.error(
        `Failed to create animations for ${this.characterType}:`,
        error
      );
    }
  }

  private setupEventListeners(): void {
    // Listen for physics events
    this.scene.physics.world.on('worldbounds', this.handleWorldBounds, this);
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
      this.facingDirection = 'left';
    } else if (this.inputState.right) {
      body.setVelocityX(this.character.speed);
      this.facingDirection = 'right';
    }

    // Jumping - use discrete press detection for proper double jump
    if (this.inputState.jumpPressed && this.canJump()) {
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
    // Ensure scene time plugin is ready before accessing it
    if (!this.scene || !this.scene.time) return;

    // Handle both actual invulnerability and visual flutter effects
    if (this.isInvulnerable || this.isFluttering) {
      // Flash effect during invulnerability or flutter animation
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
    const prevFacing = this.previousFacingDirection;

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

    // Apply visual effects if state OR direction changed
    if (
      prevState !== this.animationState ||
      prevFacing !== this.facingDirection
    ) {
      this.playAnimation(this.animationState);
      this.previousFacingDirection = this.facingDirection;
    }
  }

  private playAnimation(newState: string): void {
    // Stop current tween
    if (this.currentTween) {
      this.currentTween.stop();
      this.currentTween = null;
    }

    // Reset transform to base scale (not 1)
    this.setScale(this.baseScaleX, this.baseScaleY);
    this.setRotation(0);

    // Use spritesheet animations with directional support
    const animKey = this.characterType.toLowerCase();
    const direction = this.facingDirection;

    try {
      switch (newState) {
        case 'idle':
          if (this.scene.anims.exists(`${animKey}_idle_${direction}`)) {
            this.play(`${animKey}_idle_${direction}`);
          }
          break;
        case 'walking':
          if (this.scene.anims.exists(`${animKey}_walk_${direction}`)) {
            this.play(`${animKey}_walk_${direction}`);
          }
          break;
        case 'jumping':
        case 'falling':
          if (this.scene.anims.exists(`${animKey}_jump_${direction}`)) {
            this.play(`${animKey}_jump_${direction}`);
          }
          break;
        case 'attacking':
          // No attack animation available, use walking animation as feedback
          if (this.scene.anims.exists(`${animKey}_walk_${direction}`)) {
            this.play(`${animKey}_walk_${direction}`);
          }
          break;
        default:
          if (this.scene.anims.exists(`${animKey}_idle_${direction}`)) {
            this.play(`${animKey}_idle_${direction}`);
          }
          break;
      }
    } catch (error) {
      console.error(
        `Failed to play animation ${newState} for ${this.characterType}:`,
        error
      );
    }
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
    // Ensure scene time plugin is ready before accessing it
    if (!this.scene || !this.scene.time) return false;

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

    // Visual feedback - use scale effect instead of problematic tinting
    const originalScaleX = this.scaleX;
    const originalScaleY = this.scaleY;

    // Brief white flash with quick scale bounce
    this.setTint(0xffffff);
    this.setScale(originalScaleX * 1.1, originalScaleY * 1.05);

    this.scene.time.delayedCall(50, () => {
      // Reset to natural sprite colors (no tint)
      this.clearTint();
      this.setScale(originalScaleX, originalScaleY);
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
    if (
      this.isInvulnerable ||
      this.currentHealth <= 0 ||
      this.currentStocks <= 0
    ) {
      return;
    }

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

    // Sync health/stock changes to network for local player
    if (this.isLocalPlayer) {
      this.syncHealthAndStocks();
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
      // Reset to natural sprite colors (no tint)
      this.clearTint();
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

    // Use spawn point - must be provided by scene
    if (spawnEvent.x === 0 && spawnEvent.y === 0) {
      throw new Error('Scene must provide spawn point coordinates');
    }
    const spawnX = spawnEvent.x;
    const spawnY = spawnEvent.y;

    this.setPosition(spawnX, spawnY);
    this.setVelocity(0, 0);

    // Reset health and accumulated damage
    this.currentHealth = this.maxHealth;
    this.accumulatedDamage = 0;

    // Reset visual state
    this.setVisible(true);
    this.clearTint(); // Reset to natural sprite colors
    this.setAlpha(1);

    // Re-enable physics
    if (this.body) {
      (this.body as Phaser.Physics.Arcade.Body).enable = true;
    }

    // Grant respawn invulnerability
    this.makeInvulnerable(GAME_CONFIG.TIMING.RESPAWN_INVULNERABILITY);

    // Sync health/stock changes to network for local player
    if (this.isLocalPlayer) {
      this.syncHealthAndStocks();
    }

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

    // Notify backend if this is the local player
    if (this.isLocalPlayer) {
      const socketManager = getSocketManager();
      if (socketManager) {
        // Get the actual user ID from connection state
        const connectionState = getConnectionState();
        const koEvent = {
          type: 'player_ko',
          data: { playerId: connectionState.userId },
          timestamp: Date.now(),
        };
        SocketManager.emit('gameEvent', koEvent);
      }
    }

    // Emit defeat event locally
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
        // Reset to natural sprite colors (no tint)
        this.clearTint();
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

  public getUsername(): string {
    return this.username;
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
    // Ensure scene time plugin is ready before accessing it
    if (!this.scene || !this.scene.time) return 0;

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
    if (!socketManager || !SocketManager.isConnected()) return;

    // Only sync if position, velocity, or facing has changed significantly
    const body = this.body as Phaser.Physics.Arcade.Body;
    const positionChanged =
      Math.abs(this.x - this.lastSyncPosition.x) > 1 ||
      Math.abs(this.y - this.lastSyncPosition.y) > 1;

    const velocityChanged =
      Math.abs(body.velocity.x - this.lastSyncVelocity.x) > 5 ||
      Math.abs(body.velocity.y - this.lastSyncVelocity.y) > 5;

    const facingChanged = this.facingDirection !== this.lastSyncFacing;

    if (positionChanged || velocityChanged || facingChanged) {
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

    // Send position with sequence number and facing direction for server reconciliation
    SocketManager.sendPlayerInput(
      'move',
      { position, velocity, facing: this.facingDirection },
      this.inputSequence
    );

    // Update last sync values
    this.lastSyncPosition = { ...position };
    this.lastSyncVelocity = { ...velocity };
    this.lastSyncFacing = this.facingDirection;
  }

  public syncAttack(attackType: string): void {
    if (!this.isLocalPlayer) return;

    const socketManager = getSocketManager();
    if (!socketManager) return;

    this.inputSequence += 1;

    const attackData = {
      type: 'attack',
      attackType,
      direction: this.facingDirection === 'left' ? -1 : 1,
      facing: this.facingDirection,
      sequence: this.inputSequence,
      timestamp: Date.now(),
    };

    SocketManager.emit(SOCKET_EVENTS.PLAYER_INPUT, attackData);
  }

  public syncInputAction(inputType: 'jump' | 'special', data?: any): void {
    if (!this.isLocalPlayer) return;

    const socketManager = getSocketManager();
    if (!socketManager) return;

    this.inputSequence += 1;

    if (inputType === 'jump') {
      if (!data?.jumpType) {
        throw new Error('Jump type is required for jump input');
      }
      SocketManager.sendPlayerJump(data.jumpType);
    } else if (inputType === 'special') {
      if (!data?.specialType) {
        throw new Error('Special type is required for special input');
      }
      SocketManager.sendPlayerSpecial(data.specialType, data);
    }
  }

  public syncHealthAndStocks(): void {
    if (!this.isLocalPlayer) return;

    const socketManager = getSocketManager();
    if (!socketManager || !this.body) return;

    const body = this.body as Phaser.Physics.Arcade.Body;

    // Create player update message with current state
    const playerUpdate = {
      position: { x: this.x, y: this.y },
      velocity: { x: body.velocity.x, y: body.velocity.y },
      animation: this.animationState,
      health: this.currentHealth,
      stocks: this.currentStocks,
      isInvulnerable: this.isInvulnerable,
    };

    // Send update to server using PLAYER_UPDATE event
    SocketManager.emit(SOCKET_EVENTS.PLAYER_UPDATE, {
      playerId: this.playerId,
      update: playerUpdate,
      timestamp: Date.now(),
    });
  }

  // Methods to handle remote player updates
  public applyRemotePosition(
    position: { x: number; y: number },
    velocity: { x: number; y: number },
    facing?: 'left' | 'right'
  ): void {
    if (this.isLocalPlayer) return;

    // Update facing direction if provided
    if (facing) {
      this.facingDirection = facing;
    }

    // Immediate position update for instant visual feedback
    this.setPosition(position.x, position.y);

    // Set velocity if physics body exists
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setVelocity(velocity.x, velocity.y);
    }

    // Try to add to interpolation buffer if scene timing is available
    if (this.scene && this.scene.time) {
      const currentTime = this.scene.time.now;

      // Add to interpolation buffer for smoother movement
      this.interpolationBuffer.push({
        position: { ...position },
        velocity: { ...velocity },
        timestamp: currentTime,
      });

      // Keep buffer size manageable
      if (this.interpolationBuffer.length > this.maxBufferSize) {
        this.interpolationBuffer.shift();
      }
    } else {
      // Fallback: use Date.now() for timestamp if scene time isn't available
      this.interpolationBuffer.push({
        position: { ...position },
        velocity: { ...velocity },
        timestamp: Date.now(),
      });

      if (this.interpolationBuffer.length > this.maxBufferSize) {
        this.interpolationBuffer.shift();
      }
    }
  }

  public applyRemoteAttack(
    _attackType: string,
    direction: number,
    facing?: 'left' | 'right'
  ): void {
    if (this.isLocalPlayer) return;

    // Update facing based on explicit facing or direction
    if (facing) {
      this.facingDirection = facing;
    } else {
      // Fallback to direction-based facing
      this.facingDirection = direction < 0 ? 'left' : 'right';
    }

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

  public applyRemoteHealthUpdate(update: {
    health: number;
    stocks: number;
    isInvulnerable?: boolean;
  }): void {
    if (this.isLocalPlayer) return; // Only apply to remote players

    // Update health and stocks
    this.currentHealth = update.health;
    this.currentStocks = update.stocks;

    // Update invulnerability state if provided
    if (update.isInvulnerable !== undefined) {
      this.isInvulnerable = update.isInvulnerable;
    }

    // Handle defeat state
    if (this.currentStocks <= 0) {
      this.setVisible(false);
      if (this.body) {
        (this.body as Phaser.Physics.Arcade.Body).enable = false;
      }
    } else {
      // Ensure player is visible if they have stocks
      this.setVisible(true);
      if (this.body) {
        (this.body as Phaser.Physics.Arcade.Body).enable = true;
      }
    }
  }

  private updateRemotePlayerInterpolation(): void {
    if (this.isLocalPlayer || this.interpolationBuffer.length === 0) return;

    // Get current time, preferring scene time but falling back to Date.now()
    const currentTime =
      this.scene && this.scene.time ? this.scene.time.now : Date.now();
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
    jumpPressed: boolean;
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

    if (this.flutterTimer) {
      this.flutterTimer.remove();
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

  // Add getter for facing direction
  public getFacingDirection(): 'left' | 'right' {
    return this.facingDirection;
  }

  /**
   * Trigger hit flutter animation for visual feedback
   * This creates the same invulnerability-like flashing effect without actual invulnerability
   * Used to show hit feedback to attackers
   */
  public triggerHitFlutterAnimation(duration: number = 500): void {
    // Enable visual flutter effect (doesn't affect gameplay invulnerability)
    this.isFluttering = true;

    // Clear any existing flutter timer
    if (this.flutterTimer) {
      this.flutterTimer.remove();
    }

    // Set up flutter animation timer
    this.flutterTimer = this.scene.time.delayedCall(duration, () => {
      // Stop flutter effect
      this.isFluttering = false;

      // Reset alpha if no actual invulnerability is active
      if (!this.isInvulnerable) {
        this.setAlpha(1);
      }
    });
  }

  /**
   * Apply hit effect that's visible to all players (attacker and victim)
   * This should be called when this player gets hit to show the effect on all screens
   */
  public applyVisibleHitEffect(damageInfo: DamageInfo): void {
    // Apply the visual damage feedback (tint flash)
    this.applyDamageVisualFeedback(damageInfo);

    // Apply the flutter animation for a short duration
    const flutterDuration = damageInfo.isCritical ? 800 : 500;
    this.triggerHitFlutterAnimation(flutterDuration);
  }
}
