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
import { GAME_CONFIG, CharacterType } from '../utils/constants';

export interface PlayerConfig {
  scene: Phaser.Scene;
  x: number;
  y: number;
  characterType: CharacterType;
  playerId: string;
  isLocalPlayer: boolean;
}

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

  constructor(config: PlayerConfig) {
    super(config.scene, config.x, config.y, 'player_placeholder');

    this.characterType = config.characterType;
    this.playerId = config.playerId;
    this.isLocalPlayer = config.isLocalPlayer;

    this.character = GAME_CONFIG.CHARACTERS[this.characterType];
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
    body.setCollideWorldBounds(false); // We'll handle boundaries manually
    body.setBounce(0.1);
    body.setDragX(GAME_CONFIG.PHYSICS.FRICTION * 1000);
    body.setMaxVelocity(this.character.speed * 2, 1000);

    // Set hitbox size
    body.setSize(50, 70);
    body.setOffset(5, 5);
  }

  private setupVisuals(): void {
    // Set display size and color based on character
    this.setDisplaySize(60, 80);
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
    };
    return colors[this.characterType];
  }

  private handleWorldBounds(): void {
    // Handle player falling off stage
    if (this.y > this.scene.physics.world.bounds.height) {
      this.takeDamage(25); // Fall damage
      this.respawn();
    }
  }

  public updateInputState(inputState: Partial<typeof this.inputState>): void {
    if (!this.isLocalPlayer) return;

    Object.assign(this.inputState, inputState);
  }

  public update(): void {
    this.updateMovement();
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
      this.setAlpha(this.scene.time.now % 200 < 100 ? 0.5 : 1);
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
    } else if (Math.abs(body.velocity.x) > 10) {
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
      scaleY: 1.02,
      duration: 2000,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });
  }

  private playWalkingAnimation(): void {
    // Subtle bounce while walking
    this.currentTween = this.scene.tweens.add({
      targets: this,
      scaleY: 1.05,
      duration: 300,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });
  }

  private playJumpingAnimation(): void {
    // Stretch effect when jumping
    this.currentTween = this.scene.tweens.add({
      targets: this,
      scaleY: 1.15,
      scaleX: 0.95,
      duration: 200,
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
    } else if (this.canDoubleJump && !this.hasUsedDoubleJump) {
      // Double jump
      body.setVelocityY(this.character.jumpVelocity * 0.8);
      this.hasUsedDoubleJump = true;
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
    this.attackCooldown = 400; // 400ms cooldown

    // Create attack hitbox
    this.createAttackHitbox();

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
    const hitboxX = this.flipX ? this.x - hitboxWidth : this.x + hitboxWidth;
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

    // Remove hitbox after brief duration
    this.scene.time.delayedCall(100, () => {
      attackHitbox.destroy();
    });

    // Store reference for collision detection
    this.setData('attackHitbox', attackHitbox);
  }

  public takeDamage(
    damage: number,
    knockback?: { x: number; y: number }
  ): void {
    if (this.isInvulnerable || this.currentHealth <= 0) return;

    this.currentHealth = Math.max(0, this.currentHealth - damage);

    // Apply knockback
    if (knockback && this.body) {
      const body = this.body as Phaser.Physics.Arcade.Body;
      body.setVelocity(knockback.x, knockback.y);
    }

    // Visual feedback
    this.setTint(0xff0000);
    this.scene.time.delayedCall(200, () => {
      this.setTint(this.getCharacterColor());
    });

    // Grant temporary invulnerability
    this.makeInvulnerable(1000);

    // Check if player is defeated
    if (this.currentHealth <= 0) {
      this.loseStock();
    }
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

  private respawn(): void {
    // Reset position to spawn point
    const spawnX = this.scene.physics.world.bounds.width / 2;
    const spawnY = this.scene.physics.world.bounds.height - 200;

    this.setPosition(spawnX, spawnY);
    this.setVelocity(0, 0);

    // Reset health
    this.currentHealth = this.maxHealth;

    // Grant respawn invulnerability
    this.makeInvulnerable(2000);
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

  destroy(): void {
    if (this.invulnerabilityTimer) {
      this.invulnerabilityTimer.remove();
    }

    if (this.currentTween) {
      this.currentTween.stop();
      this.currentTween = null;
    }

    this.scene.physics.world.off('worldbounds', this.handleWorldBounds, this);

    super.destroy();
  }
}
