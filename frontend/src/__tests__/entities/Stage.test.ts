/* eslint-disable max-classes-per-file */
/*
 * Stage Entity Unit Tests
 * -----------------------
 * Comprehensive tests for the Stage entity including platform creation,
 * boundary setup, hazard management, collision detection, and spawn points.
 */

import { Stage, StageConfig } from '../../entities/Stage';
import { GAME_CONFIG } from '../../utils/constants';

// Mock Phaser for Stage tests
jest.mock('phaser', () => {
  class MockSprite {
    public scene: any;

    public texture: string;

    constructor(scene: unknown, _x: number, _y: number, texture: string) {
      this.scene = scene as any;
      this.texture = texture;
    }

    setScale = jest.fn().mockReturnThis();

    refreshBody = jest.fn().mockReturnThis();

    setTint = jest.fn().mockReturnThis();

    setData = jest.fn().mockReturnThis();

    getData = jest.fn().mockReturnValue(null);

    setSize = jest.fn().mockReturnThis();

    setVisible = jest.fn().mockReturnThis();

    setAlpha = jest.fn().mockReturnThis();

    destroy = jest.fn();
  }

  class MockStaticGroup {
    public children = { entries: [] };

    create = jest.fn().mockReturnValue(new MockSprite(null, 0, 0, ''));

    clear = jest.fn();

    forEach = jest.fn();
  }

  class MockGraphics {
    fillGradientStyle = jest.fn();

    fillRect = jest.fn();

    destroy = jest.fn();
  }

  return {
    __esModule: true,
    default: {
      Physics: { Arcade: { Sprite: MockSprite, StaticGroup: MockStaticGroup } },
      GameObjects: { Graphics: MockGraphics },
      Math: {
        Between: jest.fn().mockReturnValue(100),
      },
    },
    Physics: { Arcade: { Sprite: MockSprite, StaticGroup: MockStaticGroup } },
    GameObjects: { Graphics: MockGraphics },
    Math: {
      Between: jest.fn().mockReturnValue(100),
    },
  };
});

describe('Stage Entity', () => {
  let mockScene: any;
  let stageConfig: StageConfig;

  // Helper function to create fresh mocks for each test
  const createMockScene = () => {
    // Create shared mock sprite factory
    const createMockSprite = () => ({
      setScale: jest.fn().mockReturnThis(),
      refreshBody: jest.fn().mockReturnThis(),
      setTint: jest.fn().mockReturnThis(),
      setData: jest.fn().mockReturnThis(),
      getData: jest.fn().mockReturnValue(null),
      setSize: jest.fn().mockReturnThis(),
      setVisible: jest.fn().mockReturnThis(),
      setAlpha: jest.fn().mockReturnThis(),
    });

    // Create separate mock static groups for each system
    const mockPlatforms = {
      children: { entries: [] },
      create: jest.fn().mockImplementation(() => createMockSprite()),
      clear: jest.fn(),
      forEach: jest.fn(),
    };

    const mockBoundaries = {
      children: { entries: [] },
      create: jest.fn().mockImplementation(() => createMockSprite()),
      clear: jest.fn(),
      forEach: jest.fn(),
    };

    const mockHazards = {
      children: { entries: [] },
      create: jest.fn().mockImplementation(() => createMockSprite()),
      clear: jest.fn(),
      forEach: jest.fn(),
    };

    return {
      physics: {
        add: {
          staticGroup: jest
            .fn()
            .mockReturnValueOnce(mockPlatforms) // First call for platforms
            .mockReturnValueOnce(mockBoundaries) // Second call for boundaries
            .mockReturnValueOnce(mockHazards), // Third call for hazards
          collider: jest.fn(),
          overlap: jest.fn(),
        },
      },
      add: {
        graphics: jest.fn().mockReturnValue({
          fillGradientStyle: jest.fn(),
          fillRect: jest.fn(),
          destroy: jest.fn(),
        }),
        circle: jest.fn().mockReturnValue({
          setScrollFactor: jest.fn(),
        }),
        rectangle: jest.fn().mockReturnValue({
          setScrollFactor: jest.fn(),
        }),
      },
      events: {
        emit: jest.fn(),
      },
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockScene = createMockScene();

    stageConfig = {
      scene: mockScene,
      stageType: 'BATTLE_ARENA',
      worldWidth: 1200,
      worldHeight: 800,
    };
  });

  describe('Stage Creation & Initialization', () => {
    it('should create stage with correct configuration', () => {
      const stage = new Stage(stageConfig);

      expect(stage.getStageData()).toEqual(GAME_CONFIG.STAGES.BATTLE_ARENA);
    });

    it('should initialize physics groups correctly', () => {
      const stage = new Stage(stageConfig);
      expect(stage).toBeDefined();

      expect(mockScene.physics.add.staticGroup).toHaveBeenCalledTimes(3); // platforms, boundaries, hazards
    });

    it('should create background graphics', () => {
      const stage = new Stage(stageConfig);
      expect(stage).toBeDefined();

      expect(mockScene.add.graphics).toHaveBeenCalled();
    });

    it('should handle different stage types', () => {
      const stageTypes = [
        'BATTLE_ARENA',
        'FLOATING_ISLANDS',
        'VOLCANIC_CHAMBER',
      ] as const;

      stageTypes.forEach(stageType => {
        const config = {
          ...stageConfig,
          stageType,
          scene: createMockScene() as any,
        };
        const stage = new Stage(config);

        expect(stage.getStageData()).toEqual(GAME_CONFIG.STAGES[stageType]);
      });
    });
  });

  describe('Platform System', () => {
    it('should create platforms based on stage configuration', () => {
      const stage = new Stage(stageConfig);
      const platforms = stage.getPlatforms();

      expect(platforms.create).toHaveBeenCalledTimes(
        GAME_CONFIG.STAGES.BATTLE_ARENA.platforms.length
      );
    });

    it('should configure platform properties correctly', () => {
      const mockPlatform = {
        setScale: jest.fn().mockReturnThis(),
        refreshBody: jest.fn().mockReturnThis(),
        setTint: jest.fn().mockReturnThis(),
        setData: jest.fn().mockReturnThis(),
      };

      const platforms = {
        create: jest.fn().mockReturnValue(mockPlatform),
        children: { entries: [] },
        clear: jest.fn(),
      };

      const boundaries = {
        create: jest.fn().mockReturnValue({
          setSize: jest.fn().mockReturnThis(),
          setVisible: jest.fn().mockReturnThis(),
          setData: jest.fn().mockReturnThis(),
        }),
        children: { entries: [] },
        clear: jest.fn(),
      };

      const hazards = {
        create: jest.fn(),
        children: { entries: [] },
        clear: jest.fn(),
      };

      mockScene.physics.add.staticGroup = jest
        .fn()
        .mockReturnValueOnce(platforms)
        .mockReturnValueOnce(boundaries)
        .mockReturnValueOnce(hazards);

      const stage = new Stage(stageConfig);
      expect(stage).toBeDefined();

      expect(mockPlatform.setScale).toHaveBeenCalled();
      expect(mockPlatform.refreshBody).toHaveBeenCalled();
      expect(mockPlatform.setTint).toHaveBeenCalled();
      expect(mockPlatform.setData).toHaveBeenCalled();
    });

    it('should apply correct colors based on stage type', () => {
      const testStages = [
        { type: 'BATTLE_ARENA', expectedColor: 0x8b4513 },
        { type: 'FLOATING_ISLANDS', expectedColor: 0x708090 },
        { type: 'VOLCANIC_CHAMBER', expectedColor: 0x2f4f4f },
      ] as const;

      testStages.forEach(({ type, expectedColor }) => {
        const mockPlatform = {
          setScale: jest.fn().mockReturnThis(),
          refreshBody: jest.fn().mockReturnThis(),
          setTint: jest.fn().mockReturnThis(),
          setData: jest.fn().mockReturnThis(),
        };

        const platforms = {
          create: jest.fn().mockReturnValue(mockPlatform),
          children: { entries: [] },
          clear: jest.fn(),
        };

        const boundaries = {
          create: jest.fn().mockReturnValue({
            setSize: jest.fn().mockReturnThis(),
            setVisible: jest.fn().mockReturnThis(),
            setData: jest.fn().mockReturnThis(),
          }),
          children: { entries: [] },
          clear: jest.fn(),
        };

        const hazards = {
          create: jest.fn().mockReturnValue({
            setSize: jest.fn().mockReturnThis(),
            setData: jest.fn().mockReturnThis(),
            setTint: jest.fn().mockReturnThis(),
            setAlpha: jest.fn().mockReturnThis(),
          }),
          children: { entries: [] },
          clear: jest.fn(),
        };

        const freshMockScene = createMockScene();
        freshMockScene.physics.add.staticGroup = jest
          .fn()
          .mockReturnValueOnce(platforms)
          .mockReturnValueOnce(boundaries)
          .mockReturnValueOnce(hazards);

        const config = {
          ...stageConfig,
          stageType: type,
          scene: freshMockScene as any,
        };
        const stage = new Stage(config);
        expect(stage).toBeDefined();

        expect(mockPlatform.setTint).toHaveBeenCalledWith(expectedColor);
      });
    });
  });

  describe('Boundary System', () => {
    it('should create all boundary types', () => {
      const boundaries = {
        create: jest.fn().mockReturnValue({
          setSize: jest.fn().mockReturnThis(),
          setVisible: jest.fn().mockReturnThis(),
          setData: jest.fn().mockReturnThis(),
        }),
        children: { entries: [] },
        clear: jest.fn(),
      };

      const platforms = {
        create: jest.fn().mockReturnValue({
          setScale: jest.fn().mockReturnThis(),
          refreshBody: jest.fn().mockReturnThis(),
          setTint: jest.fn().mockReturnThis(),
          setData: jest.fn().mockReturnThis(),
        }),
        children: { entries: [] },
        clear: jest.fn(),
      };

      const hazards = {
        create: jest.fn(),
        children: { entries: [] },
        clear: jest.fn(),
      };

      mockScene.physics.add.staticGroup = jest
        .fn()
        .mockReturnValueOnce(platforms)
        .mockReturnValueOnce(boundaries)
        .mockReturnValueOnce(hazards);

      const stage = new Stage(stageConfig);
      expect(stage).toBeDefined();

      // Should create: bottom (death), left (side), right (side), top (ceiling)
      expect(boundaries.create).toHaveBeenCalledTimes(4);
    });

    it('should configure death boundary correctly', () => {
      const mockBoundary = {
        setSize: jest.fn().mockReturnThis(),
        setVisible: jest.fn().mockReturnThis(),
        setData: jest.fn().mockReturnThis(),
      };

      const boundaries = {
        create: jest.fn().mockReturnValue(mockBoundary),
        children: { entries: [] },
        clear: jest.fn(),
      };

      const platforms = {
        create: jest.fn().mockReturnValue({
          setScale: jest.fn().mockReturnThis(),
          refreshBody: jest.fn().mockReturnThis(),
          setTint: jest.fn().mockReturnThis(),
          setData: jest.fn().mockReturnThis(),
        }),
        children: { entries: [] },
        clear: jest.fn(),
      };

      const hazards = {
        create: jest.fn(),
        children: { entries: [] },
        clear: jest.fn(),
      };

      mockScene.physics.add.staticGroup = jest
        .fn()
        .mockReturnValueOnce(platforms)
        .mockReturnValueOnce(boundaries)
        .mockReturnValueOnce(hazards);

      const stage = new Stage(stageConfig);
      expect(stage).toBeDefined();

      // Death boundary should be positioned at bottom with appropriate size
      expect(boundaries.create).toHaveBeenCalledWith(
        stageConfig.worldWidth / 2,
        stageConfig.worldHeight + 50,
        ''
      );
      expect(mockBoundary.setSize).toHaveBeenCalledWith(
        stageConfig.worldWidth,
        100
      );
      expect(mockBoundary.setData).toHaveBeenCalledWith(
        'boundaryType',
        'death'
      );
    });

    it('should configure side boundaries correctly', () => {
      const mockBoundary = {
        setSize: jest.fn().mockReturnThis(),
        setVisible: jest.fn().mockReturnThis(),
        setData: jest.fn().mockReturnThis(),
      };

      const boundaries = {
        create: jest.fn().mockReturnValue(mockBoundary),
        children: { entries: [] },
        clear: jest.fn(),
      };

      const platforms = {
        create: jest.fn().mockReturnValue({
          setScale: jest.fn().mockReturnThis(),
          refreshBody: jest.fn().mockReturnThis(),
          setTint: jest.fn().mockReturnThis(),
          setData: jest.fn().mockReturnThis(),
        }),
        children: { entries: [] },
        clear: jest.fn(),
      };

      const hazards = {
        create: jest.fn(),
        children: { entries: [] },
        clear: jest.fn(),
      };

      mockScene.physics.add.staticGroup = jest
        .fn()
        .mockReturnValueOnce(platforms)
        .mockReturnValueOnce(boundaries)
        .mockReturnValueOnce(hazards);

      const stage = new Stage(stageConfig);
      expect(stage).toBeDefined();

      // Should create left and right side boundaries
      expect(boundaries.create).toHaveBeenCalledWith(
        -50,
        stageConfig.worldHeight / 2,
        ''
      );
      expect(boundaries.create).toHaveBeenCalledWith(
        stageConfig.worldWidth + 50,
        stageConfig.worldHeight / 2,
        ''
      );
      expect(mockBoundary.setData).toHaveBeenCalledWith('boundaryType', 'side');
    });
  });

  describe('Hazard System', () => {
    it('should create hazards based on stage configuration', () => {
      const hazards = {
        create: jest.fn().mockReturnValue({
          setSize: jest.fn().mockReturnThis(),
          setData: jest.fn().mockReturnThis(),
          setTint: jest.fn().mockReturnThis(),
          setAlpha: jest.fn().mockReturnThis(),
        }),
        children: { entries: [] },
        clear: jest.fn(),
      };

      const platforms = {
        create: jest.fn().mockReturnValue({
          setScale: jest.fn().mockReturnThis(),
          refreshBody: jest.fn().mockReturnThis(),
          setTint: jest.fn().mockReturnThis(),
          setData: jest.fn().mockReturnThis(),
        }),
        children: { entries: [] },
        clear: jest.fn(),
      };

      const boundaries = {
        create: jest.fn().mockReturnValue({
          setSize: jest.fn().mockReturnThis(),
          setVisible: jest.fn().mockReturnThis(),
          setData: jest.fn().mockReturnThis(),
        }),
        children: { entries: [] },
        clear: jest.fn(),
      };

      mockScene.physics.add.staticGroup = jest
        .fn()
        .mockReturnValueOnce(platforms)
        .mockReturnValueOnce(boundaries)
        .mockReturnValueOnce(hazards);

      const stage = new Stage(stageConfig);
      expect(stage).toBeDefined();

      expect(hazards.create).toHaveBeenCalledTimes(
        GAME_CONFIG.STAGES.BATTLE_ARENA.hazards.length
      );
    });

    it('should configure hazard properties correctly', () => {
      const mockHazard = {
        setSize: jest.fn().mockReturnThis(),
        setData: jest.fn().mockReturnThis(),
        setTint: jest.fn().mockReturnThis(),
        setAlpha: jest.fn().mockReturnThis(),
      };

      const hazards = {
        create: jest.fn().mockReturnValue(mockHazard),
        children: { entries: [] },
        clear: jest.fn(),
      };

      const platforms = {
        create: jest.fn().mockReturnValue({
          setScale: jest.fn().mockReturnThis(),
          refreshBody: jest.fn().mockReturnThis(),
          setTint: jest.fn().mockReturnThis(),
          setData: jest.fn().mockReturnThis(),
        }),
        children: { entries: [] },
        clear: jest.fn(),
      };

      const boundaries = {
        create: jest.fn().mockReturnValue({
          setSize: jest.fn().mockReturnThis(),
          setVisible: jest.fn().mockReturnThis(),
          setData: jest.fn().mockReturnThis(),
        }),
        children: { entries: [] },
        clear: jest.fn(),
      };

      // Use VOLCANIC_CHAMBER which has actual hazards
      const volcanicConfig = {
        ...stageConfig,
        stageType: 'VOLCANIC_CHAMBER' as const,
      };

      mockScene.physics.add.staticGroup = jest
        .fn()
        .mockReturnValueOnce(platforms)
        .mockReturnValueOnce(boundaries)
        .mockReturnValueOnce(hazards);

      const stage = new Stage(volcanicConfig);
      expect(stage).toBeDefined();

      expect(mockHazard.setSize).toHaveBeenCalled();
      expect(mockHazard.setData).toHaveBeenCalledWith(
        'hazardType',
        expect.any(String)
      );
      expect(mockHazard.setData).toHaveBeenCalledWith(
        'damage',
        expect.any(Number)
      );
    });

    it('should apply correct damage values for different hazard types', () => {
      const hazardDamages = {
        lava: 15,
        spikes: 20,
        electricity: 10,
      };

      Object.entries(hazardDamages).forEach(([hazardType, expectedDamage]) => {
        const damage = (Stage as any).getHazardDamage(hazardType);
        expect(damage).toBe(expectedDamage);
      });
    });

    it('should return default damage for unknown hazard types', () => {
      const damage = (Stage as any).getHazardDamage('unknown');
      expect(damage).toBe(10);
    });

    it('should return correct knockback for different hazard types', () => {
      const expectedKnockbacks = {
        lava: { x: 0, y: -200 },
        spikes: { x: 0, y: -150 },
        electricity: { x: 0, y: -100 },
      };

      Object.entries(expectedKnockbacks).forEach(
        ([hazardType, expectedKnockback]) => {
          const knockback = (Stage as any).getHazardKnockback(hazardType);
          expect(knockback).toEqual(expectedKnockback);
        }
      );
    });
  });

  describe('Player Collision Setup', () => {
    it('should setup platform collisions', () => {
      const stage = new Stage(stageConfig);
      const mockPlayer = { body: {} } as any;

      stage.setupPlayerCollisions(mockPlayer);

      expect(mockScene.physics.add.collider).toHaveBeenCalledWith(
        mockPlayer,
        stage.getPlatforms()
      );
    });

    it('should setup boundary collisions correctly', () => {
      const mockBoundaries = [
        { getData: jest.fn().mockReturnValue('side') },
        { getData: jest.fn().mockReturnValue('ceiling') },
        { getData: jest.fn().mockReturnValue('death') },
      ];

      const boundaries = {
        create: jest.fn().mockReturnValue({
          setSize: jest.fn().mockReturnThis(),
          setVisible: jest.fn().mockReturnThis(),
          setData: jest.fn().mockReturnThis(),
        }),
        children: { entries: mockBoundaries },
        clear: jest.fn(),
      };

      const platforms = {
        create: jest.fn().mockReturnValue({
          setScale: jest.fn().mockReturnThis(),
          refreshBody: jest.fn().mockReturnThis(),
          setTint: jest.fn().mockReturnThis(),
          setData: jest.fn().mockReturnThis(),
        }),
        children: { entries: [] },
        clear: jest.fn(),
      };

      const hazards = {
        create: jest.fn(),
        children: { entries: [] },
        clear: jest.fn(),
      };

      mockScene.physics.add.staticGroup = jest
        .fn()
        .mockReturnValueOnce(platforms)
        .mockReturnValueOnce(boundaries)
        .mockReturnValueOnce(hazards);

      const stage = new Stage(stageConfig);
      const mockPlayer = { body: {} } as any;

      stage.setupPlayerCollisions(mockPlayer);

      // Should setup colliders for side and ceiling boundaries
      expect(mockScene.physics.add.collider).toHaveBeenCalledTimes(3); // platforms + 2 solid boundaries

      // Should setup overlap for death boundary
      expect(mockScene.physics.add.overlap).toHaveBeenCalledTimes(2); // death boundary + hazards
    });

    it('should setup hazard overlaps', () => {
      const stage = new Stage(stageConfig);
      const mockPlayer = { body: {} } as any;

      stage.setupPlayerCollisions(mockPlayer);

      expect(mockScene.physics.add.overlap).toHaveBeenCalledWith(
        mockPlayer,
        stage.getHazards(),
        expect.any(Function),
        undefined,
        mockScene
      );
    });
  });

  describe('Event Emission', () => {
    it('should emit playerFellOffStage event for death boundary collision', () => {
      const stage = new Stage(stageConfig);
      const mockPlayer = { body: {} } as any;
      const mockBoundary = {
        getData: jest.fn().mockReturnValue('death'),
      } as any;

      // Call the boundary collision handler directly
      (stage as any).handleBoundaryCollision(mockPlayer, mockBoundary);

      expect(mockScene.events.emit).toHaveBeenCalledWith(
        'playerFellOffStage',
        mockPlayer
      );
    });

    it('should emit playerHitHazard event for hazard collision', () => {
      const stage = new Stage(stageConfig);
      const mockPlayer = { body: {} } as any;
      const mockHazard = {
        getData: jest.fn((key: string) => {
          if (key === 'hazardType') return 'lava';
          if (key === 'damage') return 15;
          return null;
        }),
      } as any;

      // Call the hazard collision handler directly
      (stage as any).handleHazardCollision(mockPlayer, mockHazard);

      expect(mockScene.events.emit).toHaveBeenCalledWith('playerHitHazard', {
        player: mockPlayer,
        hazardType: 'lava',
        damage: 15,
        knockback: { x: 0, y: -200 },
      });
    });
  });

  describe('Spawn Points', () => {
    it('should return spawn points based on main platform', () => {
      const stage = new Stage(stageConfig);
      const spawnPoints = stage.getSpawnPoints();

      expect(spawnPoints).toHaveLength(2);
      expect(spawnPoints[0]).toHaveProperty('x');
      expect(spawnPoints[0]).toHaveProperty('y');
      expect(spawnPoints[1]).toHaveProperty('x');
      expect(spawnPoints[1]).toHaveProperty('y');
    });

    it('should return fallback spawn points if no main platform found', () => {
      // Create a stage configuration with no platforms near the bottom
      const modifiedStageData = {
        ...GAME_CONFIG.STAGES.BATTLE_ARENA,
        platforms: [{ x: 400, y: 200, width: 1, height: 1 }], // High platform
      };

      const originalStages = GAME_CONFIG.STAGES;
      (GAME_CONFIG as any).STAGES = {
        ...originalStages,
        BATTLE_ARENA: modifiedStageData,
      };

      const stage = new Stage(stageConfig);
      const spawnPoints = stage.getSpawnPoints();

      // Should return fallback spawn points
      expect(spawnPoints).toEqual([
        {
          x: stageConfig.worldWidth / 2 - 100,
          y: stageConfig.worldHeight - 200,
        },
        {
          x: stageConfig.worldWidth / 2 + 100,
          y: stageConfig.worldHeight - 200,
        },
      ]);

      // Restore original configuration
      (GAME_CONFIG as any).STAGES = originalStages;
    });
  });

  describe('Decorative Elements', () => {
    it('should add arena decorations for BATTLE_ARENA stage', () => {
      const config = { ...stageConfig, stageType: 'BATTLE_ARENA' as const };
      const stage = new Stage(config);
      expect(stage).toBeDefined();

      // Should create clouds for arena
      expect(mockScene.add.circle).toHaveBeenCalled();
    });

    it('should add floating island decorations for FLOATING_ISLANDS stage', () => {
      const config = { ...stageConfig, stageType: 'FLOATING_ISLANDS' as const };
      const stage = new Stage(config);
      expect(stage).toBeDefined();

      // Should create debris rectangles
      expect(mockScene.add.rectangle).toHaveBeenCalled();
    });

    it('should add volcanic decorations for VOLCANIC_CHAMBER stage', () => {
      const config = { ...stageConfig, stageType: 'VOLCANIC_CHAMBER' as const };
      const stage = new Stage(config);
      expect(stage).toBeDefined();

      // Should create smoke circles
      expect(mockScene.add.circle).toHaveBeenCalled();
    });
  });

  describe('Cleanup', () => {
    it('should cleanup all resources on destroy', () => {
      const stage = new Stage(stageConfig);

      stage.destroy();

      expect(stage.getPlatforms().clear).toHaveBeenCalledWith(true, true);
      expect(stage.getBoundaries().clear).toHaveBeenCalledWith(true, true);
      expect(stage.getHazards().clear).toHaveBeenCalledWith(true, true);
    });
  });

  describe('Getters', () => {
    it('should return correct platforms group', () => {
      const stage = new Stage(stageConfig);
      const platforms = stage.getPlatforms();

      expect(platforms).toBeDefined();
      expect(typeof platforms.create).toBe('function');
    });

    it('should return correct boundaries group', () => {
      const stage = new Stage(stageConfig);
      const boundaries = stage.getBoundaries();

      expect(boundaries).toBeDefined();
      expect(typeof boundaries.create).toBe('function');
    });

    it('should return correct hazards group', () => {
      const stage = new Stage(stageConfig);
      const hazards = stage.getHazards();

      expect(hazards).toBeDefined();
      expect(typeof hazards.create).toBe('function');
    });

    it('should return correct stage data', () => {
      const stage = new Stage(stageConfig);
      const stageData = stage.getStageData();

      expect(stageData).toEqual(GAME_CONFIG.STAGES.BATTLE_ARENA);
    });
  });
});
