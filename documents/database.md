# Database Strategy & Data Models

## Database Technology Choice

### Primary Recommendation: PostgreSQL
**Why PostgreSQL?**
- **ACID compliance** - Critical for consistent user data and match results
- **JSON support** - Store flexible game data (match replays, settings) alongside structured data
- **Excellent TypeScript integration** - Strong typing with libraries like Prisma
- **Scalability** - Handles concurrent users well, supports read replicas
- **Free tier options** - Available on Railway, Render, Supabase

## Database Integration Strategy

### Development Phase
```typescript
// Use Prisma for type-safe database access
npm install prisma @prisma/client
npm install -D prisma

// Database URL examples:
// Local: postgresql://user:password@localhost:5432/brawlbytes
// Railway: postgresql://user:password@containers-us-west-x.railway.app:5432/railway
// Supabase: postgresql://user:password@db.xxx.supabase.co:5432/postgres
```

### Production Considerations
- **Connection pooling** - Use PgBouncer or similar for high concurrency
- **Read replicas** - Separate read/write operations for better performance
- **Backup strategy** - Automated daily backups with point-in-time recovery
- **Monitoring** - Track query performance, connection counts, storage usage

## Core Data Models

### 1. Users & Authentication
```sql
-- Users table - Core user information
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100),
    avatar_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false
);

-- User sessions for authentication
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);
```

### 2. Player Profiles & Progression
```sql
-- Player stats and progression
CREATE TABLE player_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    level INTEGER DEFAULT 1,
    experience_points INTEGER DEFAULT 0,
    coins INTEGER DEFAULT 0,
    gems INTEGER DEFAULT 0,
    total_matches INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    win_streak INTEGER DEFAULT 0,
    best_win_streak INTEGER DEFAULT 0,
    rating INTEGER DEFAULT 1000, -- ELO-style rating
    rank_tier VARCHAR(20) DEFAULT 'Bronze',
    favorite_character VARCHAR(50),
    settings JSONB DEFAULT '{}', -- User preferences
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Character unlock status
CREATE TABLE character_unlocks (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    character_id VARCHAR(50) NOT NULL,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, character_id)
);

-- Stage unlock status
CREATE TABLE stage_unlocks (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    stage_id VARCHAR(50) NOT NULL,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, stage_id)
);
```

### 3. Match System
```sql
-- Game matches
CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_type VARCHAR(20) NOT NULL, -- 'ranked', 'casual', 'private'
    stage_id VARCHAR(50) NOT NULL,
    max_players INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'waiting', -- 'waiting', 'in_progress', 'completed', 'cancelled'
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,
    winner_id UUID REFERENCES users(id),
    match_data JSONB, -- Full match replay data
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Match participants
CREATE TABLE match_participants (
    match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    character_id VARCHAR(50) NOT NULL,
    placement INTEGER, -- 1st, 2nd, 3rd, 4th place
    damage_dealt INTEGER DEFAULT 0,
    damage_taken INTEGER DEFAULT 0,
    kills INTEGER DEFAULT 0,
    deaths INTEGER DEFAULT 0,
    stocks_remaining INTEGER DEFAULT 0,
    rating_change INTEGER DEFAULT 0,
    experience_gained INTEGER DEFAULT 0,
    coins_earned INTEGER DEFAULT 0,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    left_at TIMESTAMP WITH TIME ZONE,
    PRIMARY KEY (match_id, user_id)
);
```

### 4. Leaderboards & Rankings
```sql
-- Season-based leaderboards
CREATE TABLE seasons (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT false,
    rewards JSONB -- Season rewards configuration
);

-- Leaderboard entries
CREATE TABLE leaderboard_entries (
    season_id INTEGER REFERENCES seasons(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL,
    rank_position INTEGER,
    matches_played INTEGER DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (season_id, user_id)
);

-- Daily/weekly statistics
CREATE TABLE player_statistics (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    stat_date DATE NOT NULL,
    matches_played INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    damage_dealt INTEGER DEFAULT 0,
    damage_taken INTEGER DEFAULT 0,
    playtime_minutes INTEGER DEFAULT 0,
    PRIMARY KEY (user_id, stat_date)
);
```

### **[POST-MVP] Leaderboards & Rankings**

### 5. Social Features
```sql
-- Friend system
CREATE TABLE friendships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID REFERENCES users(id) ON DELETE CASCADE,
    addressee_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'accepted', 'blocked'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(requester_id, addressee_id)
);

-- Chat messages (for lobby/post-game chat)
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text', -- 'text', 'emote', 'system'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### **[POST-MVP] Social Features**

### 6. Game Configuration
```sql
-- Character definitions
CREATE TABLE characters (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    stats JSONB NOT NULL, -- speed, power, health, etc.
    unlock_requirements JSONB, -- level, wins, etc.
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stage definitions
CREATE TABLE stages (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    config JSONB NOT NULL, -- platforms, hazards, etc.
    unlock_requirements JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Game constants for centralized configuration
CREATE TABLE game_constants (
    id VARCHAR(50) PRIMARY KEY,
    category VARCHAR(50) NOT NULL, -- 'physics', 'combat', 'game', 'characters', etc.
    name VARCHAR(100) NOT NULL,
    description TEXT,
    value JSONB NOT NULL, -- The actual constant value (number, object, string)
    data_type VARCHAR(20) NOT NULL, -- 'number', 'object', 'string', 'array'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(category, name)
);
```

## Database Integration Architecture

### Backend Integration Structure
```typescript
// backend/src/database/
├── prisma/
│   ├── schema.prisma        # Prisma schema definition
│   ├── migrations/          # Database migrations
│   └── seed.ts             # Initial data seeding
├── repositories/           # Data access layer
│   ├── UserRepository.ts
│   ├── MatchRepository.ts
│   ├── PlayerRepository.ts
│   ├── GameConstantsRepository.ts
│   └── LeaderboardRepository.ts
├── services/              # Business logic layer
│   ├── UserService.ts
│   ├── MatchService.ts
│   ├── RankingService.ts
│   ├── GameConstantsService.ts
│   └── StatisticsService.ts
└── migrations/            # Custom migration scripts
```

### Example Repository Pattern
```typescript
// UserRepository.ts
import { PrismaClient } from '@prisma/client';

export class UserRepository {
    constructor(private prisma: PrismaClient) {}

    async createUser(userData: CreateUserData): Promise<User> {
        return await this.prisma.user.create({
            data: {
                ...userData,
                playerProfile: {
                    create: {
                        level: 1,
                        experiencePoints: 0,
                        rating: 1000
                    }
                }
            },
            include: {
                playerProfile: true
            }
        });
    }

    async getUserByUsername(username: string): Promise<User | null> {
        return await this.prisma.user.findUnique({
            where: { username },
            include: {
                playerProfile: true,
                characterUnlocks: true
            }
        });
    }
}

// GameConstantsRepository.ts
export class GameConstantsRepository {
    constructor(private prisma: PrismaClient) {}

    async getFormattedConstants(): Promise<Record<string, Record<string, any>>> {
        const constants = await this.prisma.gameConstants.findMany({
            where: { isActive: true },
            orderBy: [{ category: 'asc' }, { name: 'asc' }]
        });

        const formatted: Record<string, Record<string, any>> = {};
        constants.forEach(constant => {
            if (!formatted[constant.category]) {
                formatted[constant.category] = {};
            }
            formatted[constant.category][constant.name] = constant.value;
        });

        return formatted;
    }

    async updateConstant(category: string, name: string, value: any) {
        return await this.prisma.gameConstants.update({
            where: { category_name: { category, name } },
            data: { value, updatedAt: new Date() }
        });
    }
}
```

## Performance Optimization

### Indexing Strategy
```sql
-- Essential indexes for performance
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_match_participants_user_id ON match_participants(user_id);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_matches_created_at ON matches(created_at);
CREATE INDEX idx_leaderboard_rating ON leaderboard_entries(season_id, rating DESC);
CREATE INDEX idx_player_stats_date ON player_statistics(user_id, stat_date);
```

### Caching Strategy
```typescript
// Use Redis for frequently accessed data
const cacheKeys = {
    userProfile: (userId: string) => `user:${userId}:profile`,
    leaderboard: (seasonId: number) => `leaderboard:${seasonId}`,
    matchQueue: 'matchmaking:queue',
    activeMatches: 'matches:active'
};
```

## Data Migration & Seeding

### Initial Data Setup
```typescript
// prisma/seed.ts
const seedData = {
    characters: [
        {
            id: 'warrior',
            name: 'Warrior',
            stats: { speed: 70, power: 85, health: 100, jumpHeight: 80 },
            unlockRequirements: { level: 1 }
        },
        {
            id: 'assassin',
            name: 'Assassin',
            stats: { speed: 95, power: 70, health: 75, jumpHeight: 90 },
            unlockRequirements: { level: 5, wins: 10 }
        }
    ],
    stages: [
        {
            id: 'arena',
            name: 'Battle Arena',
            config: { platforms: 3, hazards: [] },
            unlockRequirements: { level: 1 }
        }
    ],
    gameConstants: [
        // Physics Constants
        {
            id: 'physics_gravity',
            category: 'physics',
            name: 'gravity',
            description: 'Gravity force applied to players',
            value: 800,
            dataType: 'number'
        },
        {
            id: 'physics_jump_velocity',
            category: 'physics',
            name: 'jump_velocity',
            description: 'Initial velocity for player jumps',
            value: -600,
            dataType: 'number'
        },
        // Combat Constants
        {
            id: 'combat_attack_cooldown',
            category: 'combat',
            name: 'attack_cooldown',
            description: 'Minimum time between attacks (ms)',
            value: 400,
            dataType: 'number'
        },
        // Character Stats
        {
            id: 'character_dash_stats',
            category: 'characters',
            name: 'dash',
            description: 'Stats for Dash character',
            value: {
                name: 'Dash',
                speed: 250,
                jumpVelocity: -650,
                health: 80,
                attackDamage: 15,
                weight: 0.8
            },
            dataType: 'object'
        }
        // ... 50+ total constants across all categories
    ]
};
```

## Security Considerations

### Data Protection
- **Password hashing** - Use bcrypt with salt rounds ≥ 12
- **Input validation** - Sanitize all user inputs
- **Rate limiting** - Prevent abuse of database operations
- **Audit logging** - Track sensitive operations

## Monitoring & Analytics

### Key Metrics to Track
- **User engagement** - Daily/monthly active users, session duration
- **Match quality** - Average match duration, completion rate
- **Performance** - Database query times, connection pool usage
- **Economy** - Coin/gem distribution, unlock rates

### Analytics Queries
```sql
-- Daily active users
SELECT DATE(last_login) as date, COUNT(*) as active_users
FROM users 
WHERE last_login >= NOW() - INTERVAL '30 days'
GROUP BY DATE(last_login);

-- Match completion rates
SELECT 
    match_type,
    COUNT(*) as total_matches,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_matches,
    ROUND(COUNT(CASE WHEN status = 'completed' THEN 1 END) * 100.0 / COUNT(*), 2) as completion_rate
FROM matches
GROUP BY match_type;
```

## Deployment Strategy

### Environment Configuration
```env
# Development
DATABASE_URL="postgresql://user:password@localhost:5432/brawlbytes_dev"

# Production
DATABASE_URL="postgresql://user:password@prod-db.railway.app:5432/railway"
REDIS_URL="redis://user:password@redis-server:6379"
```

### Backup & Recovery
- **Automated backups** - Daily full backups, hourly incremental
- **Point-in-time recovery** - Restore to any point in the last 30 days
- **Disaster recovery** - Cross-region backup replication
- **Testing** - Regular backup restore testing

This database design provides a solid foundation for your multiplayer brawler, with room for growth and the flexibility to add new features as your game evolves! 