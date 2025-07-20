import { PhysicsSystem } from '../PhysicsSystem'; // Adjust path if needed
import { GameConstantsService } from '../../services/GameConstantsService'; // Adjust path

// Mock the entire GameConstantsService module
jest.mock('../../services/GameConstantsService', () => {
  // Return a mock class that doesn't require constructor args
  return {
    GameConstantsService: jest.fn().mockImplementation(() => {
      return {
        // Mock any methods that might be called (e.g., getPhysicsConstants if used in expansions)
        getPhysicsConstants: jest.fn().mockResolvedValue({
          // Fake constants if needed for other tests; not used in applyDamage
          BOUNDS: {
            MIN_X: -2000,
            MAX_X: 2000,
            MIN_Y: -2000,
            MAX_Y: 1200,
            DEATH_ZONE_Y: 1300,
          },
          COMBAT: { INVULNERABILITY_DURATION: 1000 },
          // Add more as needed
        }),
        invalidateCache: jest.fn(),
      };
    }),
  };
});

describe('PhysicsSystem - applyDamage', () => {
  let physicsSystem: PhysicsSystem;

  beforeEach(() => {
    // Cast to bypass TypeScript constructor check (since runtime is mocked)
    const MockedService = GameConstantsService as any;
    const mockService = new MockedService();

    physicsSystem = new PhysicsSystem(mockService);

    // Initialize a test player
    physicsSystem.initializePlayer({ userId: 'test-player' } as any); // Minimal mock player

    // Mock getRandomSpawnPoint to return a fixed position (for KO cases)
    jest
      .spyOn(physicsSystem, 'getRandomSpawnPoint')
      .mockReturnValue({ x: 500, y: 500 });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should apply normal damage and knockback correctly', () => {
    const timestamp = Date.now();
    const result = physicsSystem.applyDamage(
      'test-player',
      20,
      { x: 50, y: -30 },
      timestamp
    );

    expect(result.success).toBe(true);
    expect(result.newState).toBeDefined();

    const newState = result.newState!;
    expect(newState.health).toBe(80); // 100 - 20
    expect(newState.accumulatedDamage).toBe(20);
    expect(newState.velocity).toEqual({ x: 50, y: -30 }); // Knockback added (from {0,0})
    expect(newState.isInvulnerable).toBe(true);
    expect(newState.lastInvulnerabilityStart).toBe(timestamp);
    expect(newState.stocks).toBe(3); // No KO
  });

  test('should cap health at 0 and not go negative', () => {
    const timestamp = Date.now();
    const result = physicsSystem.applyDamage(
      'test-player',
      150,
      { x: 0, y: 0 },
      timestamp
    );

    expect(result.success).toBe(true);
    const newState = result.newState!;
    expect(newState.health).toBe(0); // Capped at 0
    expect(newState.accumulatedDamage).toBe(150);
  });

  test('should handle KO: reduce stocks, reset health/damage, reposition, and apply invul', () => {
    const timestamp = Date.now();
    // First, apply damage to trigger health <=0
    const result = physicsSystem.applyDamage(
      'test-player',
      100,
      { x: 0, y: 0 },
      timestamp
    );

    expect(result.success).toBe(true);
    const newState = result.newState!;
    expect(newState.health).toBe(100); // Reset after KO
    expect(newState.stocks).toBe(2); // Lost one stock
    expect(newState.accumulatedDamage).toBe(0); // Reset
    expect(newState.position).toEqual({ x: 500, y: 500 }); // Mocked spawn point
    expect(newState.velocity).toEqual({ x: 0, y: 0 }); // Reset
    expect(newState.isInvulnerable).toBe(true);
    expect(newState.lastInvulnerabilityStart).toBe(timestamp);
  });

  test('should handle zero stocks: cap at 0', () => {
    // Set initial stocks to 1 for this test
    const playerState = physicsSystem.getPlayerState('test-player')!;
    playerState.stocks = 1;

    const timestamp = Date.now();
    const result = physicsSystem.applyDamage(
      'test-player',
      100,
      { x: 0, y: 0 },
      timestamp
    );

    expect(result.success).toBe(true);
    const newState = result.newState!;
    expect(newState.stocks).toBe(0); // Capped at 0
  });

  test('should return failure if player not found', () => {
    const result = physicsSystem.applyDamage(
      'non-existent-player',
      10,
      { x: 0, y: 0 },
      Date.now()
    );
    expect(result.success).toBe(false);
    expect(result.newState).toBeUndefined();
  });
});
