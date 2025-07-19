/* eslint-disable max-classes-per-file */
/*
 * GameScene Unit Tests
 * -------------------
 * Focused test suite for key GameScene functionality.
 * Tests core scene initialization, player management, game logic,
 * and event handling without deep UI mock complexity.
 */

import { DamageType } from '@/types';
import { GameScene } from '../../scenes/GameScene';
import { Player } from '../../entities/Player';
import { Stage } from '../../entities/Stage';
import * as GameState from '../../state/GameState';
import { GAME_CONFIG } from '../../utils/constants';

// Mock Phaser for GameScene
jest.mock('phaser', () => {
  class MockSprite {
    public scene: any;

    public texture: string;

    constructor(scene: unknown, _x: number, _y: number, texture: string) {
      this.scene = scene as any;
      this.texture = texture;
    }
  }

  class MockScene {
    constructor(config?: any) {
      if (config) {
        Object.assign(this, config);
      }
    }
  }

  return {
    __esModule: true,
    default: {
      Physics: { Arcade: { Sprite: MockSprite } },
      Scene: MockScene,
      Math: { RND: { pick: jest.fn().mockReturnValue({ x: 200, y: 400 }) } },
    },
    Physics: { Arcade: { Sprite: MockSprite } },
    Scene: MockScene,
    Math: { RND: { pick: jest.fn().mockReturnValue({ x: 200, y: 400 }) } },
  };
});

// Mock the GameState module
jest.mock('../../state/GameState');

// Mock Player entity
jest.mock('../../entities/Player');

// Mock Stage entity
jest.mock('../../entities/Stage');

describe('GameScene', () => {
  let scene: GameScene;
  let mockScene: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock GameState
    (GameState.getState as jest.Mock).mockReturnValue({
      selectedCharacter: 'REX',
    });

    // Create comprehensive mock scene
    mockScene = {
      physics: {
        world: {
          setBounds: jest.fn(),
          gravity: { y: 0 },
          createDebugGraphic: jest.fn(),
          bounds: { width: 1200, height: 800 },
        },
        add: { existing: jest.fn(), overlap: jest.fn() },
      },
      cameras: {
        main: {
          setBounds: jest.fn(),
          startFollow: jest.fn(),
          setZoom: jest.fn(),
          setLerp: jest.fn(),
          setDeadzone: jest.fn(),
          centerX: 400,
          centerY: 300,
          width: 800,
          height: 600,
          shake: jest.fn(),
          flash: jest.fn(),
          fadeOut: jest.fn(),
          once: jest.fn(),
        },
      },
      input: {
        keyboard: {
          createCursorKeys: jest.fn().mockReturnValue({
            left: { isDown: false },
            right: { isDown: false },
            up: { isDown: false },
            down: { isDown: false },
          }),
          addKey: jest.fn().mockReturnValue({ isDown: false, on: jest.fn() }),
        },
      },
      time: {
        now: 1000,
        addEvent: jest.fn().mockReturnValue({ remove: jest.fn() }),
        delayedCall: jest.fn(),
      },
      add: {
        container: jest.fn().mockReturnValue({
          setScrollFactor: jest.fn(),
          add: jest.fn(),
          getByName: jest.fn(),
        }),
        rectangle: jest.fn().mockReturnValue({
          setStrokeStyle: jest.fn(),
          setName: jest.fn(),
          setOrigin: jest.fn(),
          setScale: jest.fn(),
          setFillStyle: jest.fn(),
          setScrollFactor: jest.fn(),
        }),
        text: jest.fn().mockReturnValue({
          setOrigin: jest.fn().mockReturnThis(),
          setName: jest.fn().mockReturnThis(),
          setText: jest.fn(),
          setScrollFactor: jest.fn().mockReturnThis(),
        }),
      },
      events: { on: jest.fn(), emit: jest.fn() },
      scene: { start: jest.fn() },
    };

    // Mock Stage
    const mockStage = {
      getSpawnPoints: jest.fn().mockReturnValue([
        { x: 200, y: 400 },
        { x: 600, y: 400 },
      ]),
      setupPlayerCollisions: jest.fn(),
    };
    (Stage as unknown as jest.Mock).mockImplementation(() => mockStage);

    // Mock Player
    const createMockPlayer = (config: Record<string, unknown>) => ({
      ...config,
      update: jest.fn(),
      updateInputState: jest.fn(),
      getHealth: jest.fn().mockReturnValue(100),
      getMaxHealth: jest.fn().mockReturnValue(100),
      getStocks: jest.fn().mockReturnValue(3),
      isDefeated: jest.fn().mockReturnValue(false),
      takeDamage: jest.fn(),
      getCharacterData: jest
        .fn()
        .mockReturnValue({ name: 'Test Character', health: 100 }),
      body: { velocity: { x: 0, y: 0 }, touching: { down: false } },
    });
    (Player as unknown as jest.Mock).mockImplementation(createMockPlayer);

    // Create scene and assign mocks
    scene = new GameScene();
    Object.assign(scene, mockScene);
  });

  describe('Scene Initialization', () => {
    it('should initialize with correct scene key', () => {
      expect(scene.constructor.name).toBe('GameScene');
    });

    it('should retrieve selected character from GameState', () => {
      scene.create();
      expect(GameState.getState).toHaveBeenCalled();
    });

    it('should setup physics world with correct bounds and gravity', () => {
      scene.create();

      expect(mockScene.physics.world.setBounds).toHaveBeenCalledWith(
        0,
        0,
        GAME_CONFIG.PHYSICS.WORLD_BOUNDS.WIDTH,
        GAME_CONFIG.PHYSICS.WORLD_BOUNDS.HEIGHT
      );
      expect(mockScene.physics.world.gravity.y).toBe(
        GAME_CONFIG.PHYSICS.GRAVITY
      );
    });

    it('should create stage with correct configuration', () => {
      scene.create();

      expect(Stage).toHaveBeenCalledWith({
        scene,
        stageType: 'BATTLE_ARENA',
        worldWidth: mockScene.physics.world.bounds.width,
        worldHeight: mockScene.physics.world.bounds.height,
      });
    });

    it('should create two players (local and dummy)', () => {
      scene.create();

      expect(Player).toHaveBeenCalledTimes(2);

      // Check local player creation
      expect(Player).toHaveBeenCalledWith(
        expect.objectContaining({
          scene,
          x: 200,
          y: 400,
          characterType: 'REX',
          playerId: 'local_player',
          isLocalPlayer: true,
        })
      );

      // Check dummy player creation
      expect(Player).toHaveBeenCalledWith(
        expect.objectContaining({
          scene,
          x: 600,
          y: 400,
          characterType: 'TITAN',
          playerId: 'dummy_player',
          isLocalPlayer: false,
        })
      );
    });

    it('should setup camera with correct configuration', () => {
      scene.create();

      expect(mockScene.cameras.main.setBounds).toHaveBeenCalledWith(
        0,
        0,
        mockScene.physics.world.bounds.width,
        mockScene.physics.world.bounds.height
      );
      expect(mockScene.cameras.main.startFollow).toHaveBeenCalled();
      expect(mockScene.cameras.main.setZoom).toHaveBeenCalledWith(1);
      expect(mockScene.cameras.main.setLerp).toHaveBeenCalledWith(0.1, 0.1);
      expect(mockScene.cameras.main.setDeadzone).toHaveBeenCalledWith(200, 100);
    });

    it('should setup input handlers', () => {
      scene.create();

      expect(mockScene.input.keyboard.createCursorKeys).toHaveBeenCalled();
      expect(mockScene.input.keyboard.addKey).toHaveBeenCalledWith('W');
      expect(mockScene.input.keyboard.addKey).toHaveBeenCalledWith('A');
      expect(mockScene.input.keyboard.addKey).toHaveBeenCalledWith('S');
      expect(mockScene.input.keyboard.addKey).toHaveBeenCalledWith('D');
      expect(mockScene.input.keyboard.addKey).toHaveBeenCalledWith('SPACE');
      expect(mockScene.input.keyboard.addKey).toHaveBeenCalledWith('X');
      expect(mockScene.input.keyboard.addKey).toHaveBeenCalledWith('ESC');
    });
  });

  describe('Event System', () => {
    beforeEach(() => {
      scene.create();
    });

    it('should setup stage event listeners', () => {
      expect(mockScene.events.on).toHaveBeenCalledWith(
        'playerFellOffStage',
        expect.any(Function)
      );
      expect(mockScene.events.on).toHaveBeenCalledWith(
        'playerHitHazard',
        expect.any(Function)
      );
      expect(mockScene.events.on).toHaveBeenCalledWith(
        'getSpawnPoint',
        expect.any(Function)
      );
      expect(mockScene.events.on).toHaveBeenCalledWith(
        'playerDamaged',
        expect.any(Function)
      );
      expect(mockScene.events.on).toHaveBeenCalledWith(
        'playerDefeated',
        expect.any(Function)
      );
    });

    it('should setup attack system event listeners', () => {
      expect(mockScene.events.on).toHaveBeenCalledWith(
        'attackHitboxCreated',
        expect.any(Function)
      );
      expect(mockScene.events.on).toHaveBeenCalledWith(
        'attackHitboxDestroyed',
        expect.any(Function)
      );
    });

    it('should handle player falling off stage', () => {
      const mockPlayer = { takeDamage: jest.fn(), playerId: 'test_player' };

      // Get the fall handler
      const fallHandler = mockScene.events.on.mock.calls.find(
        (call: any[]) => call[0] === 'playerFellOffStage'
      )[1];

      fallHandler(mockPlayer);

      expect(mockPlayer.takeDamage).toHaveBeenCalledWith({
        amount: GAME_CONFIG.DAMAGE.FALL_DAMAGE,
        type: DamageType.FALL,
        source: 'stage_fall',
      });
      expect(mockScene.cameras.main.shake).toHaveBeenCalledWith(200, 0.03);
    });

    it('should handle player hitting hazard', () => {
      const mockPlayer = { takeDamage: jest.fn(), playerId: 'test_player' };
      const hazardData = {
        player: mockPlayer,
        hazardType: 'spikes',
        damage: 25,
        knockback: { x: 100, y: -50 },
      };

      // Get the hazard handler
      const hazardHandler = mockScene.events.on.mock.calls.find(
        (call: any[]) => call[0] === 'playerHitHazard'
      )[1];

      hazardHandler(hazardData);

      expect(mockPlayer.takeDamage).toHaveBeenCalledWith({
        amount: 25,
        type: DamageType.ENVIRONMENTAL,
        knockback: { x: 100, y: -50 },
        source: 'hazard_spikes',
      });
      expect(mockScene.cameras.main.shake).toHaveBeenCalledWith(150, 0.025);
    });

    it('should provide spawn points when requested', () => {
      const spawnEvent = { x: 0, y: 0 };

      // Get the spawn point handler
      const spawnHandler = mockScene.events.on.mock.calls.find(
        (call: any[]) => call[0] === 'getSpawnPoint'
      )[1];

      spawnHandler(spawnEvent);

      // Should set spawn event coordinates (Phaser.Math.RND.pick returns { x: 200, y: 400 })
      expect(spawnEvent.x).toBe(200);
      expect(spawnEvent.y).toBe(400);
    });
  });

  describe('Game Loop', () => {
    beforeEach(() => {
      scene.create();
      // Mock the players array
      const mockPlayer1 = { update: jest.fn(), isLocalPlayer: true };
      const mockPlayer2 = { update: jest.fn(), isLocalPlayer: false };
      (scene as any).players = [mockPlayer1, mockPlayer2];
      (scene as any).player = mockPlayer1;
    });

    it('should update all players when game is started', () => {
      // Mock the player with all required methods
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (scene as any).player = {
        updateInputState: jest.fn(),
        getHealth: jest.fn().mockReturnValue(100),
        getMaxHealth: jest.fn().mockReturnValue(100),
        getStocks: jest.fn().mockReturnValue(3),
      };

      scene.update();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { players } = scene as any;
      players.forEach((player: Record<string, unknown>) => {
        expect(player.update).toHaveBeenCalled();
      });
    });

    it('should not update when game is not started', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (scene as any).gameStarted = false;

      scene.update();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { players } = scene as any;
      players.forEach((player: Record<string, unknown>) => {
        expect(player.update).not.toHaveBeenCalled();
      });
    });

    it('should handle player input correctly', () => {
      // Mock the player with all required methods
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (scene as any).player = {
        updateInputState: jest.fn(),
        getHealth: jest.fn().mockReturnValue(100),
        getMaxHealth: jest.fn().mockReturnValue(100),
        getStocks: jest.fn().mockReturnValue(3),
      };

      const mockCursors = {
        left: { isDown: true },
        right: { isDown: false },
        up: { isDown: false },
        down: { isDown: false },
      };
      (scene as any).cursors = mockCursors;

      const mockWASDKeys = {
        A: { isDown: false },
        D: { isDown: false },
        W: { isDown: false },
        S: { isDown: false },
      };
      (scene as any).wasdKeys = mockWASDKeys;

      const mockActionKeys = {
        SPACE: { isDown: false },
        X: { isDown: true },
        Z: { isDown: false },
      };
      (scene as any).actionKeys = mockActionKeys;

      scene.update();

      const { player } = scene as any;
      expect(player.updateInputState).toHaveBeenCalledWith({
        left: true,
        right: false,
        up: false,
        down: false,
        attack: true,
        special: false,
      });
    });
  });

  describe('Match Timer', () => {
    beforeEach(() => {
      scene.create();
    });

    it('should start match timer', () => {
      expect(mockScene.time.addEvent).toHaveBeenCalledWith({
        delay: 1000,
        callback: expect.any(Function),
        callbackScope: scene,
        loop: true,
      });
    });

    it('should format time correctly', () => {
      expect((GameScene as any).formatTime(60000)).toBe('1:00');
      expect((GameScene as any).formatTime(90000)).toBe('1:30');
      expect((GameScene as any).formatTime(5000)).toBe('0:05');
    });
  });

  describe('Match End Conditions', () => {
    beforeEach(() => {
      scene.create();
      (scene as any).gameStarted = true;
    });

    it('should end match when only one player remains (elimination)', () => {
      const mockLocalPlayer = {
        isLocalPlayer: true,
        isDefeated: jest.fn().mockReturnValue(false),
        playerId: 'local',
        getCharacterData: jest.fn().mockReturnValue({ name: 'Test Character' }),
        getStocks: jest.fn().mockReturnValue(3),
        getHealth: jest.fn().mockReturnValue(100),
        getMaxHealth: jest.fn().mockReturnValue(100),
      };
      const mockOpponent = {
        isLocalPlayer: false,
        isDefeated: jest.fn().mockReturnValue(true),
        playerId: 'opponent',
      };

      (scene as any).players = [mockLocalPlayer, mockOpponent];

      const endMatchSpy = jest.spyOn(scene as any, 'endMatch');
      (scene as any).checkMatchEndConditions();

      expect(endMatchSpy).toHaveBeenCalledWith('elimination', mockLocalPlayer);
    });

    it('should end match when local player is defeated', () => {
      const mockLocalPlayer = {
        isLocalPlayer: true,
        isDefeated: jest.fn().mockReturnValue(true),
        playerId: 'local',
        getCharacterData: jest.fn().mockReturnValue({ name: 'Test Character' }),
        getStocks: jest.fn().mockReturnValue(0),
        getHealth: jest.fn().mockReturnValue(0),
        getMaxHealth: jest.fn().mockReturnValue(100),
      };
      const mockOpponent = {
        isLocalPlayer: false,
        isDefeated: jest.fn().mockReturnValue(false),
        playerId: 'opponent',
        getCharacterData: jest.fn().mockReturnValue({ name: 'Opponent' }),
      };

      (scene as any).players = [mockLocalPlayer, mockOpponent];

      const endMatchSpy = jest.spyOn(scene as any, 'endMatch');
      (scene as any).checkMatchEndConditions();

      // When local player is defeated, it triggers elimination since only one player remains active
      expect(endMatchSpy).toHaveBeenCalledWith('elimination', mockOpponent);
    });

    it('should not end match when multiple players are active', () => {
      const mockLocalPlayer = {
        isLocalPlayer: true,
        isDefeated: jest.fn().mockReturnValue(false),
        playerId: 'local',
      };
      const mockOpponent = {
        isLocalPlayer: false,
        isDefeated: jest.fn().mockReturnValue(false),
        playerId: 'opponent',
      };

      (scene as any).players = [mockLocalPlayer, mockOpponent];

      const endMatchSpy = jest.spyOn(scene as any, 'endMatch');
      (scene as any).checkMatchEndConditions();

      expect(endMatchSpy).not.toHaveBeenCalled();
    });
  });

  describe('Attack System', () => {
    beforeEach(() => {
      scene.create();
    });

    it('should handle attack hitbox creation', () => {
      const mockHitbox = { id: 'test-hitbox' };
      const mockAttacker = { playerId: 'attacker' };
      const attackData = {
        hitbox: mockHitbox,
        attacker: mockAttacker,
        damage: 20,
        knockback: { x: 200, y: -100 },
      };

      const attackHandler = mockScene.events.on.mock.calls.find(
        (call: any[]) => call[0] === 'attackHitboxCreated'
      )[1];

      attackHandler(attackData);

      const { activeHitboxes } = scene as any;
      expect(activeHitboxes).toContain(mockHitbox);
    });

    it('should remove destroyed hitboxes', () => {
      const mockHitbox = { id: 'test-hitbox' };
      (scene as any).activeHitboxes = [mockHitbox];

      const destroyHandler = mockScene.events.on.mock.calls.find(
        (call: any[]) => call[0] === 'attackHitboxDestroyed'
      )[1];

      destroyHandler(mockHitbox);

      const { activeHitboxes } = scene as any;
      expect(activeHitboxes).not.toContain(mockHitbox);
    });

    it('should setup collision detection for hitboxes', () => {
      const mockHitbox = { id: 'test-hitbox' };
      const mockAttacker = { playerId: 'attacker' };
      const mockVictim = {
        playerId: 'victim',
        isDefeated: jest.fn().mockReturnValue(false),
      };

      (scene as any).players = [mockAttacker, mockVictim];

      const attackData = {
        hitbox: mockHitbox,
        attacker: mockAttacker,
        damage: 20,
        knockback: { x: 200, y: -100 },
      };

      const attackHandler = mockScene.events.on.mock.calls.find(
        (call: any[]) => call[0] === 'attackHitboxCreated'
      )[1];

      attackHandler(attackData);

      expect(mockScene.physics.add.overlap).toHaveBeenCalledWith(
        mockHitbox,
        mockVictim,
        expect.any(Function),
        undefined,
        scene
      );
    });
  });
});
