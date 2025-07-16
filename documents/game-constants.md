# Game Constants Management

## Overview

Brawl Bytes uses a centralized database-driven configuration system for all game constants. This enables real-time game balancing, consistent values across frontend and backend, and eliminates hardcoded magic numbers throughout the codebase.

## Architecture

```
Database (PostgreSQL) → Game Constants API → Frontend/Backend Consumers
```

### Key Principles
- **Single Source of Truth**: All constants come from the database
- **Fail-Fast Behavior**: Application won't start without valid constants
- **No Fallbacks**: Strict validation ensures database dependency
- **Real-Time Updates**: Constants can be modified without code deployments

## Constant Categories

### 1. Physics Constants (`physics`)
Controls core game physics and movement mechanics.

| Constant | Description | Default Value |
|----------|-------------|---------------|
| `gravity` | Gravity force applied to players | 800 |
| `jump_velocity` | Initial velocity for player jumps | -600 |
| `double_jump_velocity` | Velocity for double jump | -500 |
| `move_speed` | Base movement speed for players | 200 |
| `max_velocity` | Maximum velocity limit for players | 800 |
| `max_acceleration` | Maximum acceleration for players | 1200 |
| `friction` | Ground friction coefficient | 0.9 |
| `air_resistance` | Air resistance coefficient | 0.95 |
| `bounce_factor` | Bounce factor for collisions | 0.1 |
| `walking_threshold` | Velocity threshold for walking animation | 10 |
| `double_jump_multiplier` | Multiplier for double jump velocity | 0.8 |
| `world_bounds` | Game world boundaries (object) | See below |

**World Bounds Object:**
```json
{
  "min_x": -1000,
  "max_x": 1000,
  "min_y": -500,
  "max_y": 600,
  "death_zone_y": 800,
  "width": 2000,
  "height": 1100
}
```

### 2. Combat Constants (`combat`)
Defines damage, attack timing, and combat mechanics.

| Constant | Description | Default Value |
|----------|-------------|---------------|
| `attack_cooldown` | Minimum time between attacks (ms) | 400 |
| `invulnerability_duration` | Invulnerability time after damage (ms) | 1000 |
| `critical_invulnerability_duration` | Invulnerability after critical damage (ms) | 1500 |
| `respawn_invulnerability` | Invulnerability time after respawn (ms) | 2000 |
| `max_damage_per_hit` | Maximum damage per single hit | 50 |
| `min_damage_per_hit` | Minimum damage per hit | 1 |
| `max_knockback_velocity` | Maximum knockback velocity | 1200 |
| `fall_damage` | Damage from falling off stage | 25 |
| `critical_multiplier` | Damage multiplier for critical hits | 1.5 |
| `critical_chance` | Chance for critical hit (0.0-1.0) | 0.1 |
| `attack_range` | Default attack range in pixels | 150 |
| `max_combo_time` | Maximum time for combo chain (ms) | 2000 |
| `flash_interval` | Flash interval during invulnerability (ms) | 200 |

### 3. Character Stats (`characters`)
Individual character balance and attributes.

#### Dash (Fast Lightweight)
```json
{
  "name": "Dash",
  "speed": 250,
  "jumpVelocity": -650,
  "health": 80,
  "attackDamage": 15,
  "weight": 0.8
}
```

#### Rex (Balanced Allrounder)
```json
{
  "name": "Rex",
  "speed": 200,
  "jumpVelocity": -600,
  "health": 100,
  "attackDamage": 20,
  "weight": 1.0
}
```

#### Titan (Heavy Hitter)
```json
{
  "name": "Titan",
  "speed": 150,
  "jumpVelocity": -550,
  "health": 120,
  "attackDamage": 30,
  "weight": 1.3
}
```

### 4. Game Rules (`game`)
Match settings and gameplay rules.

| Constant | Description | Default Value |
|----------|-------------|---------------|
| `max_stocks` | Default number of lives per player | 3 |
| `match_time` | Default match duration (ms) | 180000 |
| `respawn_time` | Time before respawn after KO (ms) | 2000 |
| `max_players` | Maximum players per match | 2 |

### 5. UI Constants (`ui`)
User interface styling and colors.

**Colors:**
```json
{
  "primary": "#3498db",
  "secondary": "#2c3e50",
  "success": "#27ae60",
  "danger": "#e74c3c",
  "warning": "#f39c12",
  "text": "#ffffff",
  "text_secondary": "#bdc3c7"
}
```

**Fonts:**
```json
{
  "primary": "Arial, sans-serif",
  "secondary": "monospace"
}
```

### 6. Network Constants (`network`)
Multiplayer synchronization settings.

| Constant | Description | Default Value |
|----------|-------------|---------------|
| `position_sync_rate` | Rate for position updates (ms) | 60 |
| `max_input_buffer_size` | Maximum input buffer size | 60 |
| `interpolation_delay` | Interpolation delay for remote players (ms) | 100 |
| `max_buffer_size` | Maximum network buffer size | 10 |

### 7. Validation Constants (`validation`)
Server-side validation limits.

| Constant | Description | Default Value |
|----------|-------------|---------------|
| `position_tolerance` | Position validation tolerance | 50 |
| `velocity_tolerance` | Velocity validation tolerance | 100 |
| `max_position_change_per_ms` | Max position change per millisecond | 1.0 |
| `max_velocity_change_per_ms` | Max velocity change per millisecond | 2.0 |

### 8. Player Entity (`player`)
Player collision and display settings.

| Constant | Description | Default Value |
|----------|-------------|---------------|
| `collision_box` | Player collision dimensions | `{width: 50, height: 70}` |
| `display_size` | Player display dimensions | `{width: 60, height: 80}` |
| `radius` | Collision radius for simplified checks | 25 |

### 9. Animation Constants (`animation`)
Animation timing and effects.

| Constant | Description | Default Value |
|----------|-------------|---------------|
| `breathing_scale` | Breathing animation parameters | `{scaleY: 1.02, duration: 2000}` |
| `hit_effect` | Hit effect animation parameters | `{scaleY: 1.05, duration: 300}` |
| `damage_effect` | Damage effect animation parameters | `{scaleY: 1.15, duration: 200}` |

### 10. Server Configuration (`server`)
Server port settings.

| Constant | Description | Default Value |
|----------|-------------|---------------|
| `port` | Backend server port | 3001 |
| `frontend_port` | Frontend development server port | 3000 |

## API Reference

### Get All Constants
```http
GET /api/constants
```

**Response:**
```json
{
  "success": true,
  "data": {
    "physics": { ... },
    "combat": { ... },
    "characters": { ... },
    // ... all categories
  }
}
```

### Get Constants by Category
```http
GET /api/constants/:category
```

**Example:**
```http
GET /api/constants/physics
```

### Get Specific Constant
```http
GET /api/constants/:category/:name
```

**Example:**
```http
GET /api/constants/physics/gravity
```

### Update Constant (Admin)
```http
PUT /api/constants/:category/:name
Content-Type: application/json

{
  "value": 850
}
```

## Real-Time Balancing Workflow

### 1. Identify Balance Issue
- Monitor player feedback
- Analyze match data
- Review character win rates

### 2. Update Constants
```bash
# Example: Reduce Dash's speed for balancing
curl -X PUT http://localhost:3001/api/constants/characters/dash \
  -H "Content-Type: application/json" \
  -d '{"value": {"name": "Dash", "speed": 230, "jumpVelocity": -650, "health": 80, "attackDamage": 15, "weight": 0.8}}'
```

### 3. Test Changes
- Constants update immediately in-game
- No server restart required
- Cache refreshes within 1 minute

### 4. Monitor Results
- Observe gameplay changes
- Collect new data
- Iterate as needed

## Developer Guide

### Adding New Constants

1. **Add to Database Seed:**
```typescript
// In backend/prisma/seed.ts
{
  id: 'new_constant_id',
  category: 'category_name',
  name: 'constant_name',
  description: 'Description of the constant',
  value: defaultValue,
  dataType: 'number' // or 'object', 'string'
}
```

2. **Update Frontend Constants:**
```typescript
// In frontend/src/utils/constants.ts
// Add to appropriate GAME_CONFIG section
```

3. **Update Type Interfaces:**
```typescript
// In backend/src/services/GameConstantsService.ts
// Add to PhysicsConstants interface if applicable
```

### Using Constants in Code

**Frontend:**
```typescript
import { GAME_CONFIG } from '@/utils/constants';

// Use constants (loaded from API on startup)
const gravity = GAME_CONFIG.PHYSICS.GRAVITY;
const maxHealth = GAME_CONFIG.CHARACTERS.REX.health;
```

**Backend:**
```typescript
const constants = await this.constantsService.getPhysicsConstants();
const maxDamage = constants.COMBAT.MAX_DAMAGE_PER_HIT;
```

## Error Handling

### Startup Failures
If constants can't be loaded:
```
❌ Failed to initialize game: Unable to connect to game server
```

### Runtime Failures
If constants become invalid:
```typescript
throw new Error('Character stats not loaded from database. Database constants must be loaded before creating players.');
```

## Performance Considerations

- **Caching**: Constants cached for 1 minute server-side
- **Startup Load**: All constants fetched once on game initialization
- **Memory Usage**: ~50 constants stored in memory
- **Network**: Single API call on startup (~2KB payload)

## Security Notes

- Constants API currently has no authentication
- Future: Add admin authentication for PUT endpoints
- Read operations (GET) remain public for game clients
- Validate all constant values before database storage

## Troubleshooting

### Constants Not Loading
1. Check backend server is running on port 3001
2. Verify database connection
3. Ensure database has been seeded
4. Check browser console for API errors

### Values Not Updating
1. Wait up to 1 minute for cache refresh
2. Check API response for updated values
3. Verify PUT request succeeded
4. Restart game client if needed

### Performance Issues
1. Monitor cache hit rates
2. Check database query performance
3. Consider increasing cache duration if needed
4. Optimize frequently accessed constants