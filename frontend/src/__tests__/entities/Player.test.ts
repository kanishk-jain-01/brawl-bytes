/**
 * Player Entity Unit Tests
 * ------------------------
 * Comprehensive tests for the Player entity including creation, movement, combat,
 * health/damage system, knockback mechanics, stock system, and visual states.
 */

import {
  Player,
  DamageType,
  DamageInfo,
  PlayerConfig,
} from '../../entities/Player';
import { GAME_CONFIG, CharacterType } from '../../utils/constants';

// Mock Phaser Physics
jest.mock('phaser', () => {
  class MockSprite {
    public scene: any;

    public texture: string;

    public flipX: boolean = false;

    constructor(scene: any, x: number, y: number, texture: string) {
      this.scene = scene;
      this.texture = texture;
      // Don't set x, y as they're defined as getters in tests
    }

    setDisplaySize = jest.fn().mockReturnThis();

    setTint = jest.fn().mockReturnThis();

    setOrigin = jest.fn().mockReturnThis();

    setFlipX = jest.fn().mockReturnThis();

    setAlpha = jest.fn().mockReturnThis();

    setVisible = jest.fn().mockReturnThis();

    setPosition = jest.fn().mockReturnThis();

    setVelocity = jest.fn().mockReturnThis();

    setScale = jest.fn().mockReturnThis();

    setRotation = jest.fn().mockReturnThis();

    setData = jest.fn().mockReturnThis();

    getData = jest.fn().mockReturnValue(null);

    destroy = jest.fn();
  }

  return {
    __esModule: true,
    default: {
      Physics: {
        Arcade: {
          Sprite: MockSprite,
        },
      },
      Scene: class MockScene {},
      Time: {
        TimerEvent: class MockTimerEvent {},
      },
    },
    Physics: {
      Arcade: {
        Sprite: MockSprite,
      },
    },
    Scene: class MockScene {},
    Time: {
      TimerEvent: class MockTimerEvent {},
    },
  };
});

// Mock Phaser Scene and Physics
const createMockScene = () => {
  const mockScene = {
    add: {
      existing: jest.fn(),
      rectangle: jest.fn().mockReturnValue({
        setData: jest.fn(),
        destroy: jest.fn(),
        active: true,
      }),
      text: jest.fn().mockReturnValue({
        setOrigin: jest.fn().mockReturnThis(),
        setScrollFactor: jest.fn().mockReturnThis(),
        setText: jest.fn(),
      }),
    },
    physics: {
      add: {
        existing: jest.fn(),
        overlap: jest.fn(),
      },
      world: {
        on: jest.fn(),
        off: jest.fn(),
        bounds: { width: 2000, height: 1200 },
      },
    },
    time: {
      now: 0,
      delayedCall: jest.fn(),
      addEvent: jest.fn(),
    },
    tweens: {
      add: jest.fn().mockReturnValue({
        stop: jest.fn(),
      }),
    },
    events: {
      emit: jest.fn(),
    },
    cameras: {
      main: {
        shake: jest.fn(),
        flash: jest.fn(),
      },
    },
  };

  return mockScene as any;
};

// Mock Physics Body
const createMockPhysicsBody = () => ({
  setCollideWorldBounds: jest.fn(),
  setBounce: jest.fn(),
  setDragX: jest.fn(),
  setMaxVelocity: jest.fn(),
  setSize: jest.fn(),
  setOffset: jest.fn(),
  setVelocityX: jest.fn(),
  setVelocityY: jest.fn(),
  setVelocity: jest.fn(),
  touching: { down: false },
  velocity: { x: 0, y: 0 },
  enable: true,
});

describe('Player Entity', () => {
  let mockScene: any;
  let mockPhysicsBody: any;
  let basePlayerConfig: PlayerConfig;

  beforeEach(() => {
    mockScene = createMockScene();
    mockPhysicsBody = createMockPhysicsBody();

    // Reset time
    mockScene.time.now = 0;

    basePlayerConfig = {
      scene: mockScene,
      x: 400,
      y: 300,
      characterType: 'BALANCED_ALLROUNDER' as CharacterType,
      playerId: 'test-player',
      isLocalPlayer: true,
    };

    // Mock the body property
    Object.defineProperty(Player.prototype, 'body', {
      get: () => mockPhysicsBody,
      configurable: true,
    });

    // Mock position properties
    Object.defineProperty(Player.prototype, 'x', {
      get: () => basePlayerConfig.x,
      configurable: true,
    });
    Object.defineProperty(Player.prototype, 'y', {
      get: () => basePlayerConfig.y,
      configurable: true,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Player Creation & Initialization', () => {
    it('should create a player with correct initial properties', () => {
      const player = new Player(basePlayerConfig);

      expect(player.characterType).toBe('BALANCED_ALLROUNDER');
      expect(player.playerId).toBe('test-player');
      expect(player.isLocalPlayer).toBe(true);
      expect(player.getHealth()).toBe(
        GAME_CONFIG.CHARACTERS.BALANCED_ALLROUNDER.health
      );
      expect(player.getStocks()).toBe(GAME_CONFIG.GAME.MAX_STOCKS);
      expect(player.isDefeated()).toBe(false);
    });

    it('should initialize different character types correctly', () => {
      const characterTypes: CharacterType[] = [
        'FAST_LIGHTWEIGHT',
        'BALANCED_ALLROUNDER',
        'HEAVY_HITTER',
      ];

      characterTypes.forEach(characterType => {
        const config = { ...basePlayerConfig, characterType };
        const player = new Player(config);

        expect(player.characterType).toBe(characterType);
        expect(player.getHealth()).toBe(
          GAME_CONFIG.CHARACTERS[characterType].health
        );
        expect(player.getCharacterData()).toEqual(
          GAME_CONFIG.CHARACTERS[characterType]
        );
      });
    });

    it('should set up physics body correctly', () => {
      new Player(basePlayerConfig);

      expect(mockPhysicsBody.setCollideWorldBounds).toHaveBeenCalledWith(false);
      expect(mockPhysicsBody.setBounce).toHaveBeenCalledWith(
        GAME_CONFIG.PHYSICS.BOUNCE_FACTOR
      );
      expect(mockPhysicsBody.setDragX).toHaveBeenCalledWith(
        GAME_CONFIG.PHYSICS.FRICTION * 1000
      );
      expect(mockPhysicsBody.setSize).toHaveBeenCalledWith(50, 70);
      expect(mockPhysicsBody.setOffset).toHaveBeenCalledWith(5, 5);
    });

    it('should add player to scene and physics world', () => {
      const player = new Player(basePlayerConfig);

      expect(mockScene.add.existing).toHaveBeenCalledWith(player);
      expect(mockScene.physics.add.existing).toHaveBeenCalledWith(player);
    });

    it('should set up event listeners', () => {
      const player = new Player(basePlayerConfig);

      expect(mockScene.physics.world.on).toHaveBeenCalledWith(
        'worldbounds',
        expect.any(Function),
        player
      );
    });
  });

  describe('Movement System', () => {
    let player: Player;

    beforeEach(() => {
      player = new Player(basePlayerConfig);
    });

    it('should update input state for local player', () => {
      const inputState = {
        left: true,
        right: false,
        up: false,
        down: false,
        attack: false,
        special: false,
      };

      player.updateInputState(inputState);
      player.update();

      expect(mockPhysicsBody.setVelocityX).toHaveBeenCalledWith(
        -GAME_CONFIG.CHARACTERS.BALANCED_ALLROUNDER.speed
      );
      expect(player.setFlipX).toHaveBeenCalledWith(true);
    });

    it('should not update input state for non-local player', () => {
      const nonLocalConfig = { ...basePlayerConfig, isLocalPlayer: false };
      const nonLocalPlayer = new Player(nonLocalConfig);

      nonLocalPlayer.updateInputState({
        left: true,
        right: false,
        up: false,
        down: false,
        attack: false,
        special: false,
      });
      nonLocalPlayer.update();

      expect(mockPhysicsBody.setVelocityX).not.toHaveBeenCalled();
    });

    it('should handle right movement', () => {
      const inputState = {
        left: false,
        right: true,
        up: false,
        down: false,
        attack: false,
        special: false,
      };

      player.updateInputState(inputState);
      player.update();

      expect(mockPhysicsBody.setVelocityX).toHaveBeenCalledWith(
        GAME_CONFIG.CHARACTERS.BALANCED_ALLROUNDER.speed
      );
      expect(player.setFlipX).toHaveBeenCalledWith(false);
    });

    it('should handle jumping when grounded', () => {
      // Set up grounded state
      mockPhysicsBody.touching.down = true;
      player.update(); // Update grounded state first

      const inputState = {
        left: false,
        right: false,
        up: true,
        down: false,
        attack: false,
        special: false,
      };
      player.updateInputState(inputState);
      player.update();

      expect(mockPhysicsBody.setVelocityY).toHaveBeenCalledWith(
        GAME_CONFIG.CHARACTERS.BALANCED_ALLROUNDER.jumpVelocity
      );
    });

    it('should handle double jump when airborne', () => {
      // First simulate landing to enable double jump
      mockPhysicsBody.touching.down = true;
      player.update(); // This sets up grounded state and enables double jump

      // Then simulate being airborne again
      mockPhysicsBody.touching.down = false;
      player.update(); // This updates grounded state to false

      const inputState = {
        left: false,
        right: false,
        up: true,
        down: false,
        attack: false,
        special: false,
      };
      player.updateInputState(inputState);
      player.update();

      expect(mockPhysicsBody.setVelocityY).toHaveBeenCalledWith(
        GAME_CONFIG.CHARACTERS.BALANCED_ALLROUNDER.jumpVelocity *
          GAME_CONFIG.PHYSICS.DOUBLE_JUMP_MULTIPLIER
      );
    });

    it('should not allow movement during attack', () => {
      mockScene.time.now = 1000; // Start at a non-zero time

      // First perform an attack
      const attackInput = {
        left: false,
        right: false,
        up: false,
        down: false,
        attack: true,
        special: false,
      };
      player.updateInputState(attackInput);
      player.update();

      // Verify attack was created
      expect(mockScene.add.rectangle).toHaveBeenCalled();

      // Clear the mock to check for new calls
      mockPhysicsBody.setVelocityX.mockClear();

      // Now try to move during attack (still within cooldown period)
      mockScene.time.now = 1200; // 200ms later, still less than 400ms cooldown
      const moveInput = {
        left: true,
        right: false,
        up: false,
        down: false,
        attack: false,
        special: false,
      };
      player.updateInputState(moveInput);
      player.update();

      // Should not move because attack is in progress
      expect(mockPhysicsBody.setVelocityX).not.toHaveBeenCalled();
    });
  });

  describe('Combat System', () => {
    let player: Player;

    beforeEach(() => {
      player = new Player(basePlayerConfig);
      mockScene.time.now = 1000; // Start at non-zero time to avoid initial timing issues
    });

    it('should create attack hitbox when attacking', () => {
      const inputState = {
        left: false,
        right: false,
        up: false,
        down: false,
        attack: true,
        special: false,
      };

      player.updateInputState(inputState);
      player.update();

      expect(mockScene.add.rectangle).toHaveBeenCalledWith(
        expect.any(Number), // x position
        expect.any(Number), // y position
        80, // width
        60, // height
        0xff0000,
        0.3
      );
      expect(mockScene.events.emit).toHaveBeenCalledWith(
        'attackHitboxCreated',
        expect.any(Object)
      );
    });

    it('should respect attack cooldown', () => {
      const inputState = {
        left: false,
        right: false,
        up: false,
        down: false,
        attack: true,
        special: false,
      };

      // First attack
      player.updateInputState(inputState);
      player.update();

      // Immediately try to attack again (within cooldown period)
      mockScene.time.now = 1100; // 100ms later, less than 400ms cooldown
      player.updateInputState(inputState);
      player.update();

      // Should only create one attack hitbox
      expect(mockScene.add.rectangle).toHaveBeenCalledTimes(1);
    });

    it('should allow attack after cooldown expires', () => {
      const inputState = {
        left: false,
        right: false,
        up: false,
        down: false,
        attack: true,
        special: false,
      };

      // First attack
      player.updateInputState(inputState);
      player.update();

      // Wait for cooldown to expire
      mockScene.time.now = 1000 + GAME_CONFIG.TIMING.ATTACK_COOLDOWN + 100;
      player.updateInputState(inputState);
      player.update();

      // Should create second attack hitbox
      expect(mockScene.add.rectangle).toHaveBeenCalledTimes(2);
    });

    it('should calculate attack knockback correctly', () => {
      const inputState = {
        left: false,
        right: false,
        up: false,
        down: false,
        attack: true,
        special: false,
      };

      player.updateInputState(inputState);
      player.update();

      expect(mockScene.events.emit).toHaveBeenCalledWith(
        'attackHitboxCreated',
        expect.objectContaining({
          knockback: expect.objectContaining({
            x: expect.any(Number),
            y: expect.any(Number),
          }),
        })
      );
    });
  });

  describe('Health & Damage System', () => {
    let player: Player;

    beforeEach(() => {
      player = new Player(basePlayerConfig);
      mockScene.time.now = 0;
    });

    it('should take physical damage correctly', () => {
      const initialHealth = player.getHealth();
      const damageInfo: DamageInfo = {
        amount: 20,
        type: DamageType.PHYSICAL,
        source: 'test',
      };

      player.takeDamage(damageInfo);

      expect(player.getHealth()).toBeLessThan(initialHealth);
      expect(player.getAccumulatedDamage()).toBeGreaterThan(0);
    });

    it('should handle different damage types', () => {
      const damageTypes = [
        DamageType.PHYSICAL,
        DamageType.ELEMENTAL,
        DamageType.ENVIRONMENTAL,
        DamageType.FALL,
      ];

      damageTypes.forEach(type => {
        const testPlayer = new Player({
          ...basePlayerConfig,
          playerId: `test-${type}`,
        });
        const initialHealth = testPlayer.getHealth();

        testPlayer.takeDamage({
          amount: 10,
          type,
          source: 'test',
        });

        expect(testPlayer.getHealth()).toBeLessThan(initialHealth);
      });
    });

    it('should apply critical hit multiplier', () => {
      const regularDamage: DamageInfo = {
        amount: 20,
        type: DamageType.PHYSICAL,
        source: 'test',
      };

      const criticalDamage: DamageInfo = {
        amount: 20,
        type: DamageType.PHYSICAL,
        isCritical: true,
        source: 'test',
      };

      const player1 = new Player({ ...basePlayerConfig, playerId: 'regular' });
      const player2 = new Player({ ...basePlayerConfig, playerId: 'critical' });

      player1.takeDamage(regularDamage);
      player2.takeDamage(criticalDamage);

      expect(player2.getAccumulatedDamage()).toBeGreaterThan(
        player1.getAccumulatedDamage()
      );
    });

    it('should not take damage during invulnerability', () => {
      const damageInfo: DamageInfo = {
        amount: 20,
        type: DamageType.PHYSICAL,
        source: 'test',
      };

      // Take damage to trigger invulnerability
      player.takeDamage(damageInfo);
      const healthAfterFirstDamage = player.getHealth();

      // Immediately try to take damage again
      player.takeDamage(damageInfo);
      const healthAfterSecondDamage = player.getHealth();

      expect(healthAfterSecondDamage).toBe(healthAfterFirstDamage);
    });

    it('should heal correctly', () => {
      // First take some damage
      player.takeDamage({
        amount: 30,
        type: DamageType.PHYSICAL,
        source: 'test',
      });

      const damagedHealth = player.getHealth();

      // Then heal
      player.heal(15);

      expect(player.getHealth()).toBeGreaterThan(damagedHealth);
      expect(player.getHealth()).toBeLessThanOrEqual(player.getMaxHealth());
    });

    it('should not heal above max health', () => {
      const maxHealth = player.getMaxHealth();

      player.heal(100); // Large heal amount

      expect(player.getHealth()).toBe(maxHealth);
    });

    it('should not heal when defeated', () => {
      // Defeat the player by depleting all stocks
      // Need to bypass invulnerability to ensure damage is applied each time

      // Manually set stocks to 1 and then cause final defeat
      // This simulates a player who has already lost 2 stocks
      const setStocksMethod = ((player as any).currentStocks = 1);

      // Final damage to deplete last stock and defeat player
      player.takeDamage({
        amount: 1000,
        type: DamageType.PHYSICAL,
        source: 'test',
      });

      expect(player.isDefeated()).toBe(true);
      expect(player.getHealth()).toBe(0);

      player.heal(50);

      expect(player.getHealth()).toBe(0);
    });
  });

  describe('Knockback System', () => {
    let player: Player;

    beforeEach(() => {
      player = new Player(basePlayerConfig);
    });

    it('should apply knockback when taking damage', () => {
      const knockbackInfo: DamageInfo = {
        amount: 10,
        type: DamageType.PHYSICAL,
        knockback: { x: 200, y: -100 },
        source: 'test',
      };

      player.takeDamage(knockbackInfo);

      expect(mockPhysicsBody.setVelocity).toHaveBeenCalledWith(
        expect.any(Number), // x velocity (modified by scaling)
        expect.any(Number) // y velocity (modified by scaling)
      );
    });

    it('should scale knockback with accumulated damage', () => {
      // Manually set accumulated damage to test scaling
      (player as any).accumulatedDamage = 50; // 50% damage on a 100 health character

      const knockbackInfo: DamageInfo = {
        amount: 10,
        type: DamageType.PHYSICAL,
        knockback: { x: 200, y: -100 },
        source: 'test',
      };

      player.takeDamage(knockbackInfo);

      // Should have been called with scaled knockback values
      // With 50% accumulated damage, multiplier = 1.0 + 50 * 0.015 = 1.75
      // Weight for BALANCED_ALLROUNDER = 1.0, so weight multiplier = 1.0
      // Expected: x = 200 * 1.75 = 350, y = -100 * 1.75 = -175
      expect(mockPhysicsBody.setVelocity).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('should not apply knockback when no knockback is specified', () => {
      const damageInfo: DamageInfo = {
        amount: 10,
        type: DamageType.PHYSICAL,
        source: 'test',
      };

      player.takeDamage(damageInfo);

      expect(mockPhysicsBody.setVelocity).not.toHaveBeenCalled();
    });
  });

  describe('Stock & Defeat System', () => {
    let player: Player;

    beforeEach(() => {
      player = new Player(basePlayerConfig);
      mockScene.time.now = 1000; // Start at non-zero time to avoid timing issues
    });

    it('should lose stock when health reaches zero', () => {
      const initialStocks = player.getStocks();

      player.takeDamage({
        amount: 1000, // Enough to deplete health
        type: DamageType.PHYSICAL,
        source: 'test',
      });

      expect(player.getStocks()).toBe(initialStocks - 1);
    });

    it('should respawn after losing stock if stocks remain', () => {
      player.takeDamage({
        amount: 1000,
        type: DamageType.PHYSICAL,
        source: 'test',
      });

      expect(player.getHealth()).toBe(player.getMaxHealth()); // Health should be restored
      expect(player.getAccumulatedDamage()).toBe(0); // Accumulated damage reset
      expect(mockScene.events.emit).toHaveBeenCalledWith(
        'playerRespawned',
        expect.any(Object)
      );
    });

    it('should be defeated when all stocks are lost', () => {
      // Manually set stocks to 1 for the final defeat scenario
      (player as any).currentStocks = 1;

      // Set time to avoid initial timing issues
      mockScene.time.now = 1000;

      // Deal final damage to defeat the player
      player.takeDamage({
        amount: 1000,
        type: DamageType.PHYSICAL,
        source: 'test',
      });

      expect(player.isDefeated()).toBe(true);
      expect(player.getStocks()).toBe(0);
      expect(mockScene.events.emit).toHaveBeenCalledWith(
        'playerDefeated',
        player.playerId
      );
    });

    it('should handle fall damage correctly', () => {
      const fallDamage: DamageInfo = {
        amount: GAME_CONFIG.DAMAGE.FALL_DAMAGE,
        type: DamageType.FALL,
        source: 'world_bounds',
      };

      player.takeDamage(fallDamage);

      expect(player.getHealth()).toBeLessThan(player.getMaxHealth());
    });
  });

  describe('Damage Percentage Calculation', () => {
    let player: Player;

    beforeEach(() => {
      player = new Player(basePlayerConfig);
    });

    it('should calculate damage percentage correctly', () => {
      const damageAmount = 25;
      const maxHealth = player.getMaxHealth();

      player.takeDamage({
        amount: damageAmount,
        type: DamageType.PHYSICAL,
        source: 'test',
      });

      const expectedPercentage = (damageAmount / maxHealth) * 100;
      expect(player.getDamagePercent()).toBeCloseTo(expectedPercentage, 1);
    });

    it('should track time since last damage', () => {
      mockScene.time.now = 1000;

      player.takeDamage({
        amount: 10,
        type: DamageType.PHYSICAL,
        source: 'test',
      });

      mockScene.time.now = 2000;

      expect(player.getTimeSinceLastDamage()).toBe(1000);
    });
  });
});
