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
    PLAYER_RADIUS: number;
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

      // Map database values to PhysicsConstants structure
      const physicsConstants: PhysicsConstants = {
        MOVEMENT: {
          MAX_VELOCITY: formattedConstants.physics?.max_velocity ?? 800,
          MAX_ACCELERATION: formattedConstants.physics?.max_acceleration ?? 1200,
          GRAVITY: formattedConstants.physics?.gravity ?? 800,
          JUMP_VELOCITY: formattedConstants.physics?.jump_velocity ?? -600,
          DOUBLE_JUMP_VELOCITY: formattedConstants.physics?.double_jump_velocity ?? -500,
          FRICTION: formattedConstants.physics?.friction ?? 0.9,
          AIR_RESISTANCE: formattedConstants.physics?.air_resistance ?? 0.95,
        },
        BOUNDS: {
          MIN_X: formattedConstants.physics?.world_bounds?.min_x ?? -1000,
          MAX_X: formattedConstants.physics?.world_bounds?.max_x ?? 1000,
          MIN_Y: formattedConstants.physics?.world_bounds?.min_y ?? -500,
          MAX_Y: formattedConstants.physics?.world_bounds?.max_y ?? 600,
          DEATH_ZONE_Y:
            formattedConstants.physics?.world_bounds?.death_zone_y ?? 800,
        },
        COMBAT: {
          MAX_DAMAGE_PER_HIT:
            formattedConstants.combat?.max_damage_per_hit ?? 50,
          MIN_DAMAGE_PER_HIT: formattedConstants.combat?.min_damage_per_hit ?? 1,
          MAX_KNOCKBACK_VELOCITY:
            formattedConstants.combat?.max_knockback_velocity ?? 1200,
          INVULNERABILITY_DURATION:
            formattedConstants.combat?.invulnerability_duration ?? 1000,
          ATTACK_COOLDOWN_MIN:
            formattedConstants.combat?.attack_cooldown ?? 400,
          MAX_COMBO_TIME: formattedConstants.combat?.max_combo_time ?? 2000,
          ATTACK_RANGE: formattedConstants.combat?.attack_range ?? 150,
        },
        VALIDATION: {
          MAX_POSITION_CHANGE_PER_MS: formattedConstants.validation?.max_position_change_per_ms ?? 1.0,
          MAX_VELOCITY_CHANGE_PER_MS: formattedConstants.validation?.max_velocity_change_per_ms ?? 2.0,
          POSITION_TOLERANCE: formattedConstants.validation?.position_tolerance ?? 50,
          VELOCITY_TOLERANCE: formattedConstants.validation?.velocity_tolerance ?? 100,
          PLAYER_RADIUS: formattedConstants.player?.radius ?? 25,
        },
      };

      // Cache the constants
      this.cachedConstants = physicsConstants;
      this.lastCacheTime = now;

      return physicsConstants;
    } catch (error) {
      console.error(
        'Failed to load game constants from database:',
        error
      );
      
      // Clear cache and re-throw error - no fallbacks allowed
      this.cachedConstants = null;
      throw new Error('Database constants are required for game operation. Cannot start game without valid constants.');
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
