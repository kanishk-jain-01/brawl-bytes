# Software Testing Strategy
Jest is our unified testing framework across both frontend and backend. 

### Frontend Testing Setup ✅
- **Environment**: jsdom for DOM simulation
- **Dependencies**: jest, ts-jest, @types/jest, canvas, identity-obj-proxy, jest-environment-jsdom
- **Mocks**: Phaser game engine, Canvas API, asset files
- **Configuration**: `frontend/jest.config.ts` with path mapping and coverage thresholds

### Backend Testing Setup ✅
- **Environment**: Node.js
- **Dependencies**: jest, ts-jest, @types/jest, supertest, @types/supertest, socket.io-client
- **Features**: Custom matchers, server lifecycle management, API testing
- **Configuration**: `backend/jest.config.ts` with path mapping and coverage thresholds

## Running Tests During Development

### Basic Commands
```bash
# Frontend tests
cd frontend/
npm test                 # Run all tests once
npm run test:watch       # Run tests in watch mode (re-run on file changes)
npm run test:coverage    # Run tests with coverage report

# Backend tests  
cd backend/
npm test                 # Run all tests once
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage report
```

### Code Quality Commands
```bash
# Frontend linting and formatting
cd frontend/
npm run lint              # Check for linting issues
npm run lint:fix          # Auto-fix linting issues
npm run format            # Format code with Prettier
npm run format:check      # Check if code is properly formatted

# Backend linting and formatting
cd backend/
npm run lint              # Check for linting issues
npm run lint:fix          # Auto-fix linting issues
npm run format            # Format code with Prettier
npm run format:check      # Check if code is properly formatted
```

### Development Workflow Integration

1. **Test-Driven Development (TDD)**
   - Write failing tests first for new features
   - Implement the feature to make tests pass
   - Refactor while keeping tests green

2. **Continuous Testing**
   - Use `npm run test:watch` during development
   - Tests automatically re-run when files change
   - Immediate feedback on code changes

3. **Pre-commit Testing**
   - Run full test suite before committing
   - Ensure coverage thresholds are met (70% minimum)
   - Run linting and formatting checks: `npm run lint && npm run format:check`

## Testing Strategies for Game Components

### Frontend Game Testing

**Player Entity Testing**
```typescript
// Example: frontend/src/__tests__/entities/Player.test.ts
describe('Player Entity', () => {
  it('should move left when left key is pressed', () => {
    const player = new Player(scene, 100, 100);
    player.handleInput({ left: true });
    expect(player.velocity.x).toBeLessThan(0);
  });

  it('should take damage and reduce health', () => {
    const player = new Player(scene, 100, 100);
    const initialHealth = player.health;
    player.takeDamage(25);
    expect(player.health).toBe(initialHealth - 25);
  });
});
```

**Scene Testing**
```typescript
// Test scene transitions and state management
describe('GameScene', () => {
  it('should initialize with two players', () => {
    const scene = new GameScene();
    scene.create();
    expect(scene.players).toHaveLength(2);
  });
});
```

**Networking Testing**
```typescript
// Test Socket.io client behavior
describe('Socket Client', () => {
  it('should emit player movement events', () => {
    const mockSocket = createMockSocket();
    const networkSystem = new NetworkSystem(mockSocket);
    networkSystem.sendPlayerMove({ x: 100, y: 200 });
    expect(mockSocket.emit).toHaveBeenCalledWith('playerMove', { x: 100, y: 200 });
  });
});
```

### Backend Game Testing

**Game Room Testing**
```typescript
// Example: backend/src/__tests__/game/GameRoom.test.ts
describe('GameRoom', () => {
  it('should add player to room', () => {
    const room = new GameRoom('room1');
    room.addPlayer('player1', mockSocket);
    expect(room.players.size).toBe(1);
  });

  it('should start game when room is full', () => {
    const room = new GameRoom('room1', { maxPlayers: 2 });
    room.addPlayer('player1', mockSocket1);
    room.addPlayer('player2', mockSocket2);
    expect(room.gameState.status).toBe('playing');
  });
});
```

**Physics Validation Testing**
```typescript
// Test server-side physics validation
describe('PhysicsSystem', () => {
  it('should validate player movement is within bounds', () => {
    const physics = new PhysicsSystem();
    const isValid = physics.validatePlayerPosition({ x: 1500, y: 100 });
    expect(isValid).toBe(false); // Exceeds stage bounds
  });
});
```

**API Endpoint Testing**
```typescript
// Test REST API endpoints
describe('Health Endpoint', () => {
  it('should return server health status', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('OK');
  });
});
```

## Integration Testing Strategies

### Socket.io Multiplayer Testing
```typescript
// Test real-time multiplayer interactions
describe('Multiplayer Integration', () => {
  it('should sync player positions between clients', async () => {
    const client1 = io('http://localhost:3001');
    const client2 = io('http://localhost:3001');
    
    client1.emit('playerMove', { x: 100, y: 200 });
    
    await new Promise(resolve => {
      client2.on('playerUpdate', (data) => {
        expect(data.x).toBe(100);
        expect(data.y).toBe(200);
        resolve();
      });
    });
  });
});
```

## Coverage Goals and Monitoring

### Target Coverage (70-80% minimum)
- **Critical paths**: Player mechanics, networking, game state management
- **High priority**: Combat system, collision detection, matchmaking
- **Medium priority**: UI components, scene transitions
- **Low priority**: Visual effects, animations

### Viewing Coverage Reports
```bash
npm run test:coverage
# Opens coverage/lcov-report/index.html in browser
# Shows line, branch, function, and statement coverage
```

### Coverage Exclusions
- Asset files and mocks
- Configuration files
- Development utilities
- Pure visual components without logic

## Testing Best Practices for Game Development

1. **Mock Game Engine Dependencies**
   - Phaser scenes, sprites, physics
   - Use lightweight mocks for fast test execution

2. **Test Game Logic, Not Rendering**
   - Focus on mechanics, state changes, interactions
   - Avoid testing visual positioning/animations

3. **Simulate User Interactions**
   - Mock keyboard/mouse input events
   - Test game responses to player actions

4. **Network Resilience Testing**
   - Test disconnect/reconnect scenarios
   - Validate state synchronization edge cases

5. **Performance-Aware Testing**
   - Test critical game loops don't degrade
   - Validate memory usage in long-running tests

## AI-Assisted Test Generation

Use Claude to generate tests efficiently:

```
Prompt examples:
- "Write Jest unit test for this Player class: [paste code]"
- "Create integration test for Socket.io room management: [paste GameRoom code]"
- "Generate test cases for combat damage calculation: [paste combat logic]"
- "Write test to validate physics collision detection: [paste collision code]"
```

## Debugging Failed Tests

1. **Use descriptive test names** - Clearly state what's being tested
2. **Add console.log statements** - Debug test data and state
3. **Check test isolation** - Ensure tests don't depend on each other
4. **Mock external dependencies** - Isolate the code under test
5. **Use Jest's debugging features** - `--verbose`, `--detectOpenHandles`

## Integration with Development Process

- **Before implementing new features**: Write failing tests
- **During development**: Run tests in watch mode
- **Before committing**: Ensure all tests pass and coverage is maintained
- **During code review**: Review tests alongside implementation
- **Before deployment**: Run full test suite including integration tests

This testing strategy ensures code quality, catches bugs early, and maintains confidence during rapid game development.
