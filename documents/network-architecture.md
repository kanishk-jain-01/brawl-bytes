# Network Architecture

## Overview

Brawl Bytes uses a client-server architecture with authoritative server design to ensure fair gameplay. The networking layer handles real-time multiplayer communication using Socket.io for WebSocket connections with HTTP fallback support.

## Architecture Diagram

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Frontend      │    │   Frontend      │
│   (Player 1)    │    │   (Player 2)    │    │   (Player 3)    │
│                 │    │                 │    │                 │
│  ┌─────────────┐│    │  ┌─────────────┐│    │  ┌─────────────┐│
│  │ Game Client ││    │  │ Game Client ││    │  │ Game Client ││
│  │ Prediction  ││    │  │ Prediction  ││    │  │ Prediction  ││
│  │ Rendering   ││    │  │ Rendering   ││    │  │ Rendering   ││
│  └─────────────┘│    │  └─────────────┘│    │  └─────────────┘│
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          │ Socket.io            │ Socket.io            │ Socket.io
          │ (WebSocket)          │ (WebSocket)          │ (WebSocket)
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │     Backend Server      │
                    │                         │
                    │  ┌─────────────────────┐│
                    │  │   Game Loop (60Hz)  ││
                    │  │   - Physics Sim     ││
                    │  │   - Collision Det   ││
                    │  │   - State Update    ││
                    │  └─────────────────────┘│
                    │                         │
                    │  ┌─────────────────────┐│
                    │  │   Socket Manager    ││
                    │  │   - Room Management ││
                    │  │   - Message Routing ││
                    │  │   - Connection Pool ││
                    │  └─────────────────────┘│
                    │                         │
                    │  ┌─────────────────────┐│
                    │  │   Input Validation  ││
                    │  │   - Rate Limiting   ││
                    │  │   - Sanity Checks   ││
                    │  └─────────────────────┘│
                    └─────────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   PostgreSQL Database   │
                    │                         │
                    │   - User Accounts       │
                    │   - Match History       │
                    │   - Player Stats        │
                    │   - Game Constants      │
                    │   - Leaderboards        │
                    └─────────────────────────┘
```

## Game Constants API

Brawl Bytes uses a centralized configuration system where all game constants are served via REST API from the database. This enables real-time game balancing without code deployments.

### API Endpoints

```http
# Get all constants (called on game startup)
GET /api/constants
Response: { success: true, data: { physics: {...}, combat: {...}, ... } }

# Get constants by category
GET /api/constants/:category
Response: { success: true, data: { gravity: 800, jump_velocity: -600, ... } }

# Get specific constant
GET /api/constants/:category/:name
Response: { success: true, data: { name: "gravity", value: 800, description: "..." } }

# Update constant (admin only)
PUT /api/constants/:category/:name
Body: { value: 850 }
Response: { success: true, data: { name: "gravity", value: 850, updatedAt: "..." } }
```

### Constants Flow

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Database      │───▶│   REST API      │───▶│   Game Client   │
│   (PostgreSQL)  │    │   /api/constants│    │   (Frontend)    │
│                 │    │                 │    │                 │
│ • 50+ Constants │    │ • Cached (1min) │    │ • Loaded once   │
│ • Categories:   │    │ • Validation    │    │ • Strict checks │
│   - physics     │    │ • Error handling│    │ • No fallbacks  │
│   - combat      │    │                 │    │                 │
│   - characters  │    │                 │    │                 │
│   - game        │    │                 │    │                 │
│   - ui          │    │                 │    │                 │
│   - network     │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   Game Server           │
                    │   (Backend)             │
                    │                         │
                    │ • Uses same constants   │
                    │ • Server-side validation│
                    │ • Physics authority     │
                    │ • Combat validation     │
                    └─────────────────────────┘
```

### Fail-Fast Behavior

The system is designed with **no fallback logic**. If constants cannot be loaded:

```typescript
// Frontend - Game won't start
if (!GAME_CONFIG.PHYSICS.GRAVITY) {
  throw new Error('Database constants required for game operation');
}

// Backend - Server operations fail
if (!constants.COMBAT.ATTACK_RANGE) {
  throw new Error('Attack range not loaded from database constants');
}
```

### Performance Characteristics

- **Startup Load**: Single API call (~2KB payload) with all 50+ constants
- **Caching**: Server-side cache (1 minute duration) for optimal performance
- **Updates**: Real-time via PUT requests, cache invalidation automatic
- **Network**: Minimal overhead after initial load

## Core Network Components

### 1. Socket.io Configuration

```typescript
// Backend: Socket.io server setup
import { Server } from 'socket.io';
import { createServer } from 'http';

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    methods: ["GET", "POST"]
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e6, // 1MB max message size
  allowEIO3: true
});

// Frontend: Socket.io client setup
import { io } from 'socket.io-client';

const socket = io(process.env.VITE_BACKEND_URL || 'http://localhost:3001', {
  transports: ['websocket', 'polling'],
  timeout: 20000,
  forceNew: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
});
```

### 2. Message Types & Protocol

```typescript
// Network message types
interface NetworkMessage {
  type: string;
  timestamp: number;
  data: any;
}

// Client -> Server Messages
interface ClientMessages {
  'player:join': { username: string; characterId: string };
  'player:input': { keys: InputState; sequence: number };
  'player:attack': { attackType: string; direction: Vector2 };
  'player:ready': { isReady: boolean };
  'match:leave': {};
  'chat:message': { message: string };
}

// Server -> Client Messages
interface ServerMessages {
  'game:state': { gameState: GameState; tick: number };
  'game:start': { players: Player[]; stage: string };
  'game:end': { winner: string; results: MatchResult };
  'player:joined': { player: Player };
  'player:left': { playerId: string };
  'error': { message: string; code: number };
}
```

### 3. Game State Synchronization

```typescript
interface GameState {
  tick: number;
  timestamp: number;
  players: {
    [playerId: string]: PlayerState;
  };
  projectiles: Projectile[];
  stage: StageState;
  matchInfo: {
    timeRemaining: number;
    status: 'waiting' | 'playing' | 'paused' | 'ended';
  };
}

interface PlayerState {
  id: string;
  position: Vector2;
  velocity: Vector2;
  health: number;
  stocks: number;
  isGrounded: boolean;
  currentAction: string;
  animationFrame: number;
  lastInputSequence: number;
}
```

## Authoritative Server Design

### 1. Server Authority

The server maintains the authoritative game state and validates all client actions:

```typescript
class GameRoom {
  private gameState: GameState;
  private tickRate = 60; // 60 FPS server tick rate
  private gameLoop: NodeJS.Timeout;

  startGameLoop() {
    this.gameLoop = setInterval(() => {
      this.processPendingInputs();
      this.updatePhysics();
      this.detectCollisions();
      this.broadcastGameState();
    }, 1000 / this.tickRate);
  }

  processPendingInputs() {
    for (const [playerId, inputs] of this.pendingInputs) {
      const player = this.gameState.players[playerId];
      if (this.validateInput(player, inputs)) {
        this.applyInput(player, inputs);
      } else {
        this.flagSuspiciousActivity(playerId, 'invalid_input');
      }
    }
  }

  validateInput(player: PlayerState, input: InputState): boolean {
    // Validate input timing
    if (input.sequence <= player.lastInputSequence) return false;
    
    // Validate input possibility (e.g., can't jump while in air without double-jump)
    if (input.jump && !player.isGrounded && !player.hasDoubleJump) return false;
    
    // Validate movement bounds
    if (Math.abs(input.movement.x) > 1 || Math.abs(input.movement.y) > 1) return false;
    
    return true;
  }
}
```

### 2. Client-Side Prediction

Clients predict their own actions immediately for responsive gameplay:

```typescript
class ClientNetworkSystem {
  private pendingInputs: Map<number, InputState> = new Map();
  private serverGameState: GameState;
  private predictedGameState: GameState;

  sendInput(input: InputState) {
    const sequence = this.getNextSequence();
    input.sequence = sequence;
    
    // Store for reconciliation
    this.pendingInputs.set(sequence, input);
    
    // Apply immediately for prediction
    this.applyInputLocally(input);
    
    // Send to server
    this.socket.emit('player:input', input);
  }

  onServerGameState(serverState: GameState) {
    this.serverGameState = serverState;
    this.reconcileWithServer();
  }

  reconcileWithServer() {
    const serverPlayer = this.serverGameState.players[this.playerId];
    const predictedPlayer = this.predictedGameState.players[this.playerId];
    
    // Check if prediction was correct
    const positionDiff = Vector2.distance(serverPlayer.position, predictedPlayer.position);
    
    if (positionDiff > RECONCILIATION_THRESHOLD) {
      // Server correction needed
      this.correctPrediction(serverPlayer);
    }
    
    // Remove acknowledged inputs
    this.cleanupAcknowledgedInputs(serverPlayer.lastInputSequence);
  }
}
```

### 3. Lag Compensation

```typescript
class LagCompensation {
  private static ROLLBACK_BUFFER_SIZE = 60; // 1 second at 60fps
  private gameStateHistory: GameState[] = [];

  rollbackToTimestamp(timestamp: number): GameState {
    // Find the game state closest to the timestamp
    const targetState = this.gameStateHistory.find(state => 
      Math.abs(state.timestamp - timestamp) < 16.67 // ~1 frame tolerance
    );
    
    return targetState || this.gameStateHistory[0];
  }

  validateHitWithRollback(attackerId: string, targetId: string, timestamp: number): boolean {
    const rollbackState = this.rollbackToTimestamp(timestamp);
    const attacker = rollbackState.players[attackerId];
    const target = rollbackState.players[targetId];
    
    return this.checkHitboxCollision(attacker, target);
  }
}
```

## Network Optimization

### 1. Delta Compression

Only send changed data to reduce bandwidth:

```typescript
class DeltaCompression {
  private lastSentState: GameState;

  compressGameState(currentState: GameState): Partial<GameState> {
    const delta: Partial<GameState> = {
      tick: currentState.tick,
      timestamp: currentState.timestamp
    };

    // Only include changed players
    const changedPlayers: { [id: string]: Partial<PlayerState> } = {};
    for (const [playerId, player] of Object.entries(currentState.players)) {
      const lastPlayer = this.lastSentState?.players[playerId];
      const playerDelta = this.getPlayerDelta(player, lastPlayer);
      if (Object.keys(playerDelta).length > 0) {
        changedPlayers[playerId] = playerDelta;
      }
    }

    if (Object.keys(changedPlayers).length > 0) {
      delta.players = changedPlayers;
    }

    this.lastSentState = currentState;
    return delta;
  }
}
```

### 2. Interest Management

Only send relevant data to each client:

```typescript
class InterestManagement {
  getRelevantGameState(playerId: string, fullState: GameState): Partial<GameState> {
    const playerPosition = fullState.players[playerId].position;
    const VISIBILITY_RADIUS = 1000; // pixels

    const relevantPlayers = Object.entries(fullState.players)
      .filter(([id, player]) => {
        if (id === playerId) return true; // Always include self
        const distance = Vector2.distance(playerPosition, player.position);
        return distance <= VISIBILITY_RADIUS;
      })
      .reduce((acc, [id, player]) => {
        acc[id] = player;
        return acc;
      }, {} as { [id: string]: PlayerState });

    return {
      ...fullState,
      players: relevantPlayers
    };
  }
}
```

### 3. Adaptive Quality

Adjust update frequency based on connection quality:

```typescript
class AdaptiveQuality {
  private connectionQuality: Map<string, ConnectionQuality> = new Map();

  updateConnectionQuality(playerId: string, latency: number, packetLoss: number) {
    const quality: ConnectionQuality = {
      latency,
      packetLoss,
      updateRate: this.calculateUpdateRate(latency, packetLoss)
    };
    
    this.connectionQuality.set(playerId, quality);
  }

  calculateUpdateRate(latency: number, packetLoss: number): number {
    if (latency < 50 && packetLoss < 0.01) return 60; // Full rate
    if (latency < 100 && packetLoss < 0.05) return 30; // Half rate
    return 20; // Reduced rate for poor connections
  }
}
```

## Connection Management

### 1. Reconnection Handling

```typescript
class ReconnectionManager {
  private reconnectionAttempts = 0;
  private maxReconnectionAttempts = 5;
  private reconnectionDelay = 1000;

  handleDisconnection(playerId: string) {
    // Pause game state for this player
    this.pausePlayerState(playerId);
    
    // Set reconnection timeout
    setTimeout(() => {
      if (!this.isPlayerReconnected(playerId)) {
        this.removePlayerFromMatch(playerId);
        this.notifyOtherPlayers('player:left', { playerId });
      }
    }, 30000); // 30 second grace period
  }

  handleReconnection(playerId: string) {
    // Restore player state
    this.resumePlayerState(playerId);
    
    // Send full game state to reconnected player
    this.sendFullGameState(playerId);
    
    // Notify other players
    this.notifyOtherPlayers('player:rejoined', { playerId });
  }
}
```

### 2. Room Management

```typescript
class RoomManager {
  private rooms: Map<string, GameRoom> = new Map();
  private playerRooms: Map<string, string> = new Map();

  joinRoom(playerId: string, roomId?: string): string {
    if (!roomId) {
      roomId = this.findAvailableRoom() || this.createRoom();
    }

    const room = this.rooms.get(roomId);
    if (!room || room.isFull()) {
      throw new Error('Room not available');
    }

    room.addPlayer(playerId);
    this.playerRooms.set(playerId, roomId);
    
    return roomId;
  }

  leaveRoom(playerId: string) {
    const roomId = this.playerRooms.get(playerId);
    if (!roomId) return;

    const room = this.rooms.get(roomId);
    if (room) {
      room.removePlayer(playerId);
      if (room.isEmpty()) {
        this.rooms.delete(roomId);
      }
    }
    
    this.playerRooms.delete(playerId);
  }
}
```

## Performance Monitoring

### 1. Network Metrics

```typescript
class NetworkMetrics {
  private metrics = {
    messagesPerSecond: 0,
    averageLatency: 0,
    packetLoss: 0,
    bandwidth: 0,
    activeConnections: 0
  };

  trackMessage(playerId: string, messageType: string, size: number) {
    this.metrics.messagesPerSecond++;
    this.metrics.bandwidth += size;
    
    // Log high-frequency senders (potential spam)
    if (this.getPlayerMessageRate(playerId) > 100) {
      this.flagSuspiciousActivity(playerId, 'message_spam');
    }
  }

  calculateLatency(playerId: string): number {
    const pingStart = Date.now();
    this.sendPing(playerId, pingStart);
    
    // Response handled in onPong
    return this.playerLatencies.get(playerId) || 0;
  }
}
```

### 2. Error Handling

```typescript
class NetworkErrorHandler {
  handleSocketError(socket: Socket, error: Error) {
    console.error(`Socket error for ${socket.id}:`, error);
    
    // Categorize error
    if (error.message.includes('timeout')) {
      this.handleTimeout(socket);
    } else if (error.message.includes('disconnect')) {
      this.handleDisconnection(socket);
    } else {
      this.handleGenericError(socket, error);
    }
  }

  handleTimeout(socket: Socket) {
    // Attempt to reconnect
    socket.emit('reconnect_attempt');
    
    // If timeout persists, remove from game
    setTimeout(() => {
      if (!socket.connected) {
        this.removeFromGame(socket.id);
      }
    }, 10000);
  }
}
```

## Security Considerations

### 1. Input Validation

```typescript
class InputValidator {
  validatePlayerInput(input: InputState): boolean {
    // Check input frequency (prevent spam)
    if (this.getInputFrequency(input.playerId) > 120) return false;
    
    // Validate input values
    if (Math.abs(input.movement.x) > 1) return false;
    if (Math.abs(input.movement.y) > 1) return false;
    
    // Check for impossible inputs
    if (input.jump && input.crouch) return false;
    
    return true;
  }
}
```

### 2. Rate Limiting

```typescript
class RateLimiter {
  private playerLimits: Map<string, RateLimit> = new Map();

  checkRateLimit(playerId: string, action: string): boolean {
    const limit = this.playerLimits.get(playerId);
    if (!limit) {
      this.playerLimits.set(playerId, new RateLimit());
      return true;
    }

    return limit.checkAction(action);
  }
}
```

This network architecture ensures reliable, secure, and performant real-time multiplayer gameplay while maintaining fairness. 