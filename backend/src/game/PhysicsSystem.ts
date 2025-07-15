import type { GameRoomPlayer } from './GameRoom';
import {
  GameConstantsService,
  type PhysicsConstants,
} from '../services/GameConstantsService';

export interface PlayerPhysicsState {
  playerId: string;
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  isGrounded: boolean;
  canDoubleJump: boolean;
  hasUsedDoubleJump: boolean;
  health: number;
  stocks: number;
  isInvulnerable: boolean;
  lastInvulnerabilityStart: number;
  lastAttackTime: number;
  isAttacking: boolean;
  accumulatedDamage: number;
  lastUpdateTime: number;
}

export interface PhysicsValidationResult {
  valid: boolean;
  correctedState?: Partial<PlayerPhysicsState>;
  reason?: string;
}

export interface AttackData {
  attackerId: string;
  targetId: string;
  damage: number;
  knockback: { x: number; y: number };
  attackType: string;
  timestamp: number;
}

export interface StageData {
  platforms: ReadonlyArray<{
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  }>;
  boundaries: {
    readonly left: number;
    readonly right: number;
    readonly top: number;
    readonly bottom: number;
  };
  hazards?: ReadonlyArray<{
    readonly type?: string;
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
    readonly damage?: number;
  }>;
}

export class PhysicsSystem {
  private playerStates: Map<string, PlayerPhysicsState>;

  private stageData: StageData | null;

  private constantsService: GameConstantsService;

  private cachedConstants: PhysicsConstants | null = null;

  constructor(constantsService: GameConstantsService) {
    this.playerStates = new Map();
    this.stageData = null;
    this.constantsService = constantsService;
  }

  /**
   * Get physics constants (cached for performance)
   */
  private async getConstants(): Promise<PhysicsConstants> {
    if (!this.cachedConstants) {
      this.cachedConstants = await this.constantsService.getPhysicsConstants();
    }
    return this.cachedConstants;
  }

  /**
   * Invalidate constants cache (call when constants are updated)
   */
  public invalidateConstantsCache(): void {
    this.cachedConstants = null;
    this.constantsService.invalidateCache();
  }

  /**
   * Initialize or update a player's physics state
   */
  public initializePlayer(player: GameRoomPlayer): void {
    const initialState: PlayerPhysicsState = {
      playerId: player.userId,
      position: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 },
      isGrounded: false,
      canDoubleJump: true,
      hasUsedDoubleJump: false,
      health: 100,
      stocks: 3,
      isInvulnerable: false,
      lastInvulnerabilityStart: 0,
      lastAttackTime: 0,
      isAttacking: false,
      accumulatedDamage: 0,
      lastUpdateTime: Date.now(),
    };

    this.playerStates.set(player.userId, initialState);
  }

  /**
   * Remove a player from physics simulation
   */
  public removePlayer(playerId: string): void {
    this.playerStates.delete(playerId);
  }

  /**
   * Set stage data for collision detection
   */
  public setStageData(stage: StageData): void {
    this.stageData = stage;
  }

  /**
   * Validate a player's movement update
   */
  public async validateMovement(
    playerId: string,
    newPosition: { x: number; y: number },
    newVelocity: { x: number; y: number },
    timestamp: number
  ): Promise<PhysicsValidationResult> {
    const playerState = this.playerStates.get(playerId);
    if (!playerState) {
      return { valid: false, reason: 'Player not found in physics system' };
    }

    const timeDelta = timestamp - playerState.lastUpdateTime;
    if (timeDelta <= 0) {
      return { valid: false, reason: 'Invalid timestamp' };
    }

    // Get current constants from database
    const constants = await this.getConstants();

    // Validate position bounds
    if (
      newPosition.x < constants.BOUNDS.MIN_X ||
      newPosition.x > constants.BOUNDS.MAX_X ||
      newPosition.y < constants.BOUNDS.MIN_Y ||
      newPosition.y > constants.BOUNDS.MAX_Y
    ) {
      return {
        valid: false,
        reason: 'Position out of bounds',
        correctedState: {
          position: {
            x: Math.max(
              constants.BOUNDS.MIN_X,
              Math.min(constants.BOUNDS.MAX_X, newPosition.x)
            ),
            y: Math.max(
              constants.BOUNDS.MIN_Y,
              Math.min(constants.BOUNDS.MAX_Y, newPosition.y)
            ),
          },
        },
      };
    }

    // Validate velocity bounds
    if (
      Math.abs(newVelocity.x) > constants.MOVEMENT.MAX_VELOCITY ||
      Math.abs(newVelocity.y) > constants.MOVEMENT.MAX_VELOCITY
    ) {
      return {
        valid: false,
        reason: 'Velocity exceeds limits',
        correctedState: {
          velocity: {
            x: Math.max(
              -constants.MOVEMENT.MAX_VELOCITY,
              Math.min(constants.MOVEMENT.MAX_VELOCITY, newVelocity.x)
            ),
            y: Math.max(
              -constants.MOVEMENT.MAX_VELOCITY,
              Math.min(constants.MOVEMENT.MAX_VELOCITY, newVelocity.y)
            ),
          },
        },
      };
    }

    // Validate position change rate
    const positionDelta = {
      x: Math.abs(newPosition.x - playerState.position.x),
      y: Math.abs(newPosition.y - playerState.position.y),
    };

    const maxPositionChange =
      constants.VALIDATION.MAX_POSITION_CHANGE_PER_MS * timeDelta;

    if (
      positionDelta.x > maxPositionChange ||
      positionDelta.y > maxPositionChange
    ) {
      return {
        valid: false,
        reason: 'Position changed too quickly',
        correctedState: {
          position: playerState.position,
          velocity: playerState.velocity,
        },
      };
    }

    // Validate velocity change rate
    const velocityDelta = {
      x: Math.abs(newVelocity.x - playerState.velocity.x),
      y: Math.abs(newVelocity.y - playerState.velocity.y),
    };

    const maxVelocityChange =
      constants.VALIDATION.MAX_VELOCITY_CHANGE_PER_MS * timeDelta;

    if (
      velocityDelta.x > maxVelocityChange ||
      velocityDelta.y > maxVelocityChange
    ) {
      return {
        valid: false,
        reason: 'Velocity changed too quickly',
        correctedState: {
          velocity: playerState.velocity,
        },
      };
    }

    // Check for collision with stage boundaries if stage data is available
    if (this.stageData) {
      const collisionResult = this.checkStageCollision(newPosition);
      if (!collisionResult.valid) {
        return collisionResult;
      }
    }

    // Update player state if validation passes
    playerState.position = { ...newPosition };
    playerState.velocity = { ...newVelocity };
    playerState.lastUpdateTime = timestamp;

    return { valid: true };
  }

  /**
   * Validate an attack action
   */
  public async validateAttack(
    attackData: AttackData
  ): Promise<PhysicsValidationResult> {
    const attacker = this.playerStates.get(attackData.attackerId);
    const target = this.playerStates.get(attackData.targetId);

    if (!attacker || !target) {
      return { valid: false, reason: 'Player(s) not found' };
    }

    // Get current constants from database
    const constants = await this.getConstants();

    // Check attack cooldown
    const timeSinceLastAttack = attackData.timestamp - attacker.lastAttackTime;
    if (timeSinceLastAttack < constants.COMBAT.ATTACK_COOLDOWN_MIN) {
      return { valid: false, reason: 'Attack on cooldown' };
    }

    // Validate damage range
    if (
      attackData.damage < constants.COMBAT.MIN_DAMAGE_PER_HIT ||
      attackData.damage > constants.COMBAT.MAX_DAMAGE_PER_HIT
    ) {
      return {
        valid: false,
        reason: 'Damage value out of range',
        correctedState: {
          accumulatedDamage: Math.max(
            constants.COMBAT.MIN_DAMAGE_PER_HIT,
            Math.min(constants.COMBAT.MAX_DAMAGE_PER_HIT, attackData.damage)
          ),
        },
      };
    }

    // Validate knockback
    const knockbackMagnitude = Math.sqrt(
      attackData.knockback.x ** 2 + attackData.knockback.y ** 2
    );
    if (knockbackMagnitude > constants.COMBAT.MAX_KNOCKBACK_VELOCITY) {
      return { valid: false, reason: 'Knockback too strong' };
    }

    // Check if target is invulnerable
    if (target.isInvulnerable) {
      const invulnerabilityRemaining =
        constants.COMBAT.INVULNERABILITY_DURATION -
        (attackData.timestamp - target.lastInvulnerabilityStart);
      if (invulnerabilityRemaining > 0) {
        return { valid: false, reason: 'Target is invulnerable' };
      }
    }

    // Calculate distance for hit validation
    const distance = Math.sqrt(
      (attacker.position.x - target.position.x) ** 2 +
        (attacker.position.y - target.position.y) ** 2
    );

    // Basic range check (could be expanded based on attack type)
    const maxAttackRange = 150;
    if (distance > maxAttackRange) {
      return { valid: false, reason: 'Target out of attack range' };
    }

    return { valid: true };
  }

  /**
   * Apply damage to a player
   */
  public applyDamage(
    targetId: string,
    damage: number,
    knockback: { x: number; y: number },
    timestamp: number
  ): { success: boolean; newState?: PlayerPhysicsState } {
    const target = this.playerStates.get(targetId);
    if (!target) {
      return { success: false };
    }

    // Apply damage
    target.health = Math.max(0, target.health - damage);
    target.accumulatedDamage += damage;

    // Apply knockback
    target.velocity.x += knockback.x;
    target.velocity.y += knockback.y;

    // Make target invulnerable
    target.isInvulnerable = true;
    target.lastInvulnerabilityStart = timestamp;

    // Check for KO
    if (target.health <= 0) {
      target.stocks = Math.max(0, target.stocks - 1);
      target.health = 100; // Reset health for next stock
      target.accumulatedDamage = 0;

      // Reset position to spawn point
      target.position = { x: 0, y: 0 };
      target.velocity = { x: 0, y: 0 };
    }

    return { success: true, newState: target };
  }

  /**
   * Update physics simulation (gravity, invulnerability, etc.)
   */
  public async updatePhysics(
    _deltaTime: number
  ): Promise<Map<string, PlayerPhysicsState>> {
    const currentTime = Date.now();
    const constants = await this.getConstants();

    this.playerStates.forEach(state => {
      // Update invulnerability
      if (state.isInvulnerable) {
        const invulnerabilityElapsed =
          currentTime - state.lastInvulnerabilityStart;
        if (
          invulnerabilityElapsed >= constants.COMBAT.INVULNERABILITY_DURATION
        ) {
          state.isInvulnerable = false;
        }
      }

      // Check for death zone
      if (state.position.y > constants.BOUNDS.DEATH_ZONE_Y) {
        state.stocks = Math.max(0, state.stocks - 1);
        state.health = 100;
        state.position = { x: 0, y: 0 };
        state.velocity = { x: 0, y: 0 };
        state.isInvulnerable = true;
        state.lastInvulnerabilityStart = currentTime;
      }

      // Update grounded state based on stage collision
      if (this.stageData) {
        state.isGrounded = this.checkGroundCollision(state.position);

        // Reset double jump when grounded
        if (state.isGrounded) {
          state.canDoubleJump = true;
          state.hasUsedDoubleJump = false;
        }
      }

      state.lastUpdateTime = currentTime;
    });

    return new Map(this.playerStates);
  }

  /**
   * Get current physics state for a player
   */
  public getPlayerState(playerId: string): PlayerPhysicsState | undefined {
    return this.playerStates.get(playerId);
  }

  /**
   * Get all player states
   */
  public getAllPlayerStates(): Map<string, PlayerPhysicsState> {
    return new Map(this.playerStates);
  }

  /**
   * Check collision with stage boundaries
   */
  private checkStageCollision(position: {
    x: number;
    y: number;
  }): PhysicsValidationResult {
    if (!this.stageData) {
      return { valid: true };
    }

    const { boundaries } = this.stageData;

    if (
      position.x < boundaries.left ||
      position.x > boundaries.right ||
      position.y < boundaries.top ||
      position.y > boundaries.bottom
    ) {
      return {
        valid: false,
        reason: 'Collision with stage boundary',
        correctedState: {
          position: {
            x: Math.max(
              boundaries.left,
              Math.min(boundaries.right, position.x)
            ),
            y: Math.max(
              boundaries.top,
              Math.min(boundaries.bottom, position.y)
            ),
          },
        },
      };
    }

    return { valid: true };
  }

  /**
   * Check if player is on ground (simplified collision detection)
   */
  private checkGroundCollision(position: { x: number; y: number }): boolean {
    if (!this.stageData) {
      return position.y >= 0; // Assume ground at y=0 if no stage data
    }

    // Check collision with platforms
    const playerRadius = 25; // Simplified player collision box
    for (const platform of this.stageData.platforms) {
      if (
        position.x >= platform.x - playerRadius &&
        position.x <= platform.x + platform.width + playerRadius &&
        position.y >= platform.y - playerRadius &&
        position.y <= platform.y + platform.height + playerRadius
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Reset physics system
   */
  public reset(): void {
    this.playerStates.clear();
    this.stageData = null;
  }
}
