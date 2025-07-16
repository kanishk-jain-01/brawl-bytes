import { PrismaClient } from '@prisma/client';
import { GameConstantsRepository } from '../database/repositories/GameConstantsRepository';

export interface PhysicsConstants {
  MOVEMENT: {
    MAX_VELOCITY: number;
    MAX_ACCELERATION: number;
    GRAVITY: number;
    JUMP_VELOCITY: number;
    DOUBLE_JUMP_VELOCITY: number;
    FRICTION: number;
    AIR_RESISTANCE: number;
  };
  BOUNDS: {
    MIN_X: number;
    MAX_X: number;
    MIN_Y: number;
    MAX_Y: number;
    DEATH_ZONE_Y: number;
  };
  COMBAT: {
    MAX_DAMAGE_PER_HIT: number;
    MIN_DAMAGE_PER_HIT: number;
    MAX_KNOCKBACK_VELOCITY: number;
    INVULNERABILITY_DURATION: number;
    ATTACK_COOLDOWN_MIN: number;
    MAX_COMBO_TIME: number;
    ATTACK_RANGE: number;
  };
  VALIDATION: {
    MAX_POSITION_CHANGE_PER_MS: number;
    MAX_VELOCITY_CHANGE_PER_MS: number;
    POSITION_TOLERANCE: number;
    VELOCITY_TOLERANCE: number;
    MAX_PING_MS: number;
  };
  COLLISION: {
    PLAYER_RADIUS: number;
    STAGE_THICKNESS: number;
  };
}

export class GameConstantsService {
  // eslint-disable-next-line no-use-before-define
  private static instance: GameConstantsService;

  private gameConstantsRepo: GameConstantsRepository;

  private cachedConstants: PhysicsConstants | null = null;

  private lastCacheTime: number = 0;

  private readonly CACHE_DURATION = 60000; // 1 minute cache

  constructor(prisma: PrismaClient) {
    this.gameConstantsRepo = new GameConstantsRepository(prisma);
  }

  public static getInstance(prisma?: PrismaClient): GameConstantsService {
    // eslint-disable-next-line no-use-before-define
    if (!GameConstantsService.instance) {
      if (!prisma) {
        throw new Error(
          'Prisma client must be provided when creating first instance'
        );
      }
      // eslint-disable-next-line no-use-before-define
      GameConstantsService.instance = new GameConstantsService(prisma);
    }
    // eslint-disable-next-line no-use-before-define
    return GameConstantsService.instance;
  }

  /**
   * Get physics constants with caching
   */
  public async getPhysicsConstants(): Promise<PhysicsConstants> {
    const now = Date.now();

    // Return cached constants if still valid
    if (
      this.cachedConstants &&
      now - this.lastCacheTime < this.CACHE_DURATION
    ) {
      return this.cachedConstants;
    }

    try {
      // Fetch constants from database
      const formattedConstants =
        await this.gameConstantsRepo.getFormattedConstants();

      // Helper to enforce presence of every constant (fail-fast philosophy)
      const requireConst = (value: any, path: string) => {
        if (value === undefined || value === null) {
          throw new Error(`Missing constant value: ${path}`);
        }
        return value;
      };

      // Map database values to PhysicsConstants structure
      const physicsConstants: PhysicsConstants = {
        MOVEMENT: {
          MAX_VELOCITY: requireConst(formattedConstants.physics?.max_velocity, 'physics.max_velocity'),
          MAX_ACCELERATION: requireConst(formattedConstants.physics?.max_acceleration, 'physics.max_acceleration'),
          GRAVITY: requireConst(formattedConstants.physics?.gravity, 'physics.gravity'),
          JUMP_VELOCITY: requireConst(formattedConstants.physics?.jump_velocity, 'physics.jump_velocity'),
          DOUBLE_JUMP_VELOCITY: requireConst(formattedConstants.physics?.double_jump_velocity, 'physics.double_jump_velocity'),
          FRICTION: requireConst(formattedConstants.physics?.friction, 'physics.friction'),
          AIR_RESISTANCE: requireConst(formattedConstants.physics?.air_resistance, 'physics.air_resistance'),
        },
        BOUNDS: {
          MIN_X: requireConst(formattedConstants.physics?.world_bounds_min_x, 'physics.world_bounds_min_x'),
          MAX_X: requireConst(formattedConstants.physics?.world_bounds_max_x, 'physics.world_bounds_max_x'),
          MIN_Y: requireConst(formattedConstants.physics?.world_bounds_min_y, 'physics.world_bounds_min_y'),
          MAX_Y: requireConst(formattedConstants.physics?.world_bounds_max_y, 'physics.world_bounds_max_y'),
          DEATH_ZONE_Y: requireConst(formattedConstants.physics?.world_bounds_death_zone_y, 'physics.world_bounds_death_zone_y'),
        },
        COMBAT: {
          MAX_DAMAGE_PER_HIT: requireConst(
            formattedConstants.combat?.max_damage_per_hit,
            'combat.max_damage_per_hit'
          ),
          MIN_DAMAGE_PER_HIT: requireConst(
            formattedConstants.combat?.min_damage_per_hit,
            'combat.min_damage_per_hit'
          ),
          MAX_KNOCKBACK_VELOCITY: requireConst(
            formattedConstants.combat?.max_knockback_velocity,
            'combat.max_knockback_velocity'
          ),
          INVULNERABILITY_DURATION: requireConst(
            formattedConstants.combat?.invulnerability_duration,
            'combat.invulnerability_duration'
          ),
          ATTACK_COOLDOWN_MIN: requireConst(
            formattedConstants.combat?.attack_cooldown,
            'combat.attack_cooldown'
          ),
          MAX_COMBO_TIME: requireConst(
            formattedConstants.combat?.max_combo_time,
            'combat.max_combo_time'
          ),
          ATTACK_RANGE: requireConst(
            formattedConstants.combat?.attack_range,
            'combat.attack_range'
          ),
        },
        VALIDATION: {
          MAX_POSITION_CHANGE_PER_MS: requireConst(formattedConstants.validation?.max_position_change_per_ms, 'validation.max_position_change_per_ms'),
          MAX_VELOCITY_CHANGE_PER_MS: requireConst(formattedConstants.validation?.max_velocity_change_per_ms, 'validation.max_velocity_change_per_ms'),
          POSITION_TOLERANCE: requireConst(formattedConstants.validation?.position_tolerance, 'validation.position_tolerance'),
          VELOCITY_TOLERANCE: requireConst(formattedConstants.validation?.velocity_tolerance, 'validation.velocity_tolerance'),
          MAX_PING_MS: requireConst(formattedConstants.validation?.max_ping_ms, 'validation.max_ping_ms'),
        },
        COLLISION: {
          PLAYER_RADIUS: requireConst(formattedConstants.physics?.collision_player_radius, 'physics.collision_player_radius'),
          STAGE_THICKNESS: requireConst(formattedConstants.physics?.collision_stage_thickness, 'physics.collision_stage_thickness'),
        },
      };

      // Cache the constants
      this.cachedConstants = physicsConstants;
      this.lastCacheTime = now;

      return physicsConstants;
    } catch (error) {
      console.error('Failed to load game constants from database:', error);

      // Clear cache and re-throw error - no fallbacks allowed
      this.cachedConstants = null;
      throw new Error(
        'Database constants are required for game operation. Cannot start game without valid constants.'
      );
    }
  }

  /**
   * Get a specific constant value
   */
  public async getConstantValue(category: string, name: string): Promise<any> {
    try {
      const constant = await this.gameConstantsRepo.getConstant(category, name);
      return constant?.value ?? null;
    } catch (error) {
      console.error(`Failed to get constant ${category}.${name}:`, error);
      return null;
    }
  }

  /**
   * Force refresh of cached constants
   */
  public invalidateCache(): void {
    this.cachedConstants = null;
    this.lastCacheTime = 0;
  }
}
