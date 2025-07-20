# 🥊 Brawl Bytes

> **A real-time multiplayer 2D fighting game inspired by Super Smash Bros and Brawlhalla**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=flat&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Phaser](https://img.shields.io/badge/Phaser-3.90-9b59b6?style=flat)](https://phaser.io/)
[![Socket.io](https://img.shields.io/badge/Socket.io-4.8.1-010101?style=flat&logo=socket.io&logoColor=white)](https://socket.io/)

**Brawl Bytes** is a fast-paced, real-time multiplayer fighting game where players battle as unique characters across dynamic stages. Built with modern web technologies, it features smooth 60 FPS gameplay, real-time synchronization, and a progression system that unlocks new content as you play.

---

## ✨ Features

### 🎮 **Core Gameplay**
- **Real-time Multiplayer**: Battle up to 4 players simultaneously with low-latency networking
- **Physics-Based Combat**: Fluid movement with gravity, knockback, and collision detection
- **Stock System**: Traditional fighting game lives system - knock opponents off the stage to win
- **Combo System**: Chain attacks together for devastating damage combinations

### 👥 **Character Roster**
| Character | Type | Description | Unlock Requirement |
|-----------|------|-------------|-------------------|
| **Rex** | Balanced | Well-rounded fighter with solid stats across the board | Default |
| **Dash** | Speed | Lightning-fast character with high mobility and agility | Default |
| **Titan** | Heavy | Tank character with massive damage and health | Default |
| **Ninja** | Assassin | Stealthy fighter with precision strikes and teleportation | Level 5, 10 wins |

### 🏟️ **Dynamic Stages**
- **Battle Arena**: Classic flat stage perfect for competitive play
- **Jungle Clearing**: Multi-platform stage with natural hazards
- **Volcano Forge**: High-intensity stage with lava hazards and moving platforms
- **Ancient Colosseum**: Grand arena with interactive elements

### 🚀 **Advanced Features**
- **Database-Driven Configuration**: Live game balancing without code deployments
- **Matchmaking System**: Intelligent player matching with queue management
- **Progression System**: Unlock characters, stages, and cosmetics through gameplay
- **User Authentication**: Secure JWT-based login with persistent sessions
- **Spectator Mode**: Watch live matches and learn from other players
- **Replay System**: Save and review your best (and worst) moments

---

## 🎯 Quick Start

### Prerequisites
- **Node.js** 18+ and **npm**
- **PostgreSQL** (local installation or Docker)
- **Git** for cloning the repository

### 1. Clone & Install
```bash
git clone https://github.com/your-username/brawl-bytes.git
cd brawl-bytes

# Install all dependencies for the monorepo
npm run install:all
```

### 2. Database Setup
```bash
# Start PostgreSQL (adjust for your setup)
# Docker: docker run --name postgres -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres
# Or use your local PostgreSQL installation

# Set up backend environment
cd backend
cp .env.example .env
# Edit .env with your database connection details
```

### 3. Initialize Database
```bash
# Create database tables
npx prisma migrate dev

# Seed with game data (characters, stages, constants)
npm run sync-constants:force
```

### 4. Start Development Servers
```bash
# Terminal 1: Backend server (http://localhost:3001)
cd backend
npm run dev

# Terminal 2: Frontend client (http://localhost:3000)
cd frontend
npm run dev
```

### 5. Play!
1. Open http://localhost:3000 in multiple browser tabs
2. Create accounts and log in
3. Join the matchmaking queue or create a private room
4. Select your character and stage
5. Battle it out in real-time!

---

## 🏗️ Architecture

Brawl Bytes uses a modern monorepo architecture with clear separation of concerns:

```
brawl-bytes/
├── frontend/          # Phaser 3 game client (TypeScript + Vite)
├── backend/           # Node.js server (Express + Socket.io)
├── shared-types/      # Shared TypeScript definitions
├── game-constants-master.yaml  # Single source of truth for game config
└── documents/         # Comprehensive documentation
```

### Tech Stack

#### **Frontend**
- **[Phaser 3](https://phaser.io/)**: 2D game engine with physics and scene management
- **[TypeScript](https://www.typescriptlang.org/)**: Type-safe development
- **[Vite](https://vitejs.dev/)**: Lightning-fast build tool and dev server
- **[Socket.io Client](https://socket.io/)**: Real-time communication
- **[Zustand](https://github.com/pmndrs/zustand)**: Lightweight state management

#### **Backend**
- **[Node.js](https://nodejs.org/)**: JavaScript runtime
- **[Express.js](https://expressjs.com/)**: Web framework for REST APIs
- **[Socket.io](https://socket.io/)**: Real-time bidirectional communication
- **[PostgreSQL](https://www.postgresql.org/)**: Production-grade database
- **[Prisma](https://www.prisma.io/)**: Type-safe database ORM
- **[Passport.js](http://www.passportjs.org/)**: Authentication middleware

#### **DevOps & Deployment**
- **[Vercel](https://vercel.com/)**: Frontend hosting with global CDN
- **[Render](https://render.com/)**: Backend and database hosting
- **GitHub Actions**: Continuous deployment pipeline

---

## 🎮 Game Mechanics

### Combat System
- **Health & Damage**: Each character starts with 100 HP
- **Knockback Physics**: Damage increases knockback velocity
- **Stock System**: 3 lives per player by default
- **Attack Types**: Light attacks, heavy attacks, and special moves
- **Invincibility Frames**: Brief invulnerability after taking damage

### Input Controls
| Action | Keyboard | Alternative |
|--------|----------|-------------|
| Move | WASD | Arrow Keys |
| Jump | Space | Up Arrow |
| Light Attack | J | Z |
| Heavy Attack | K | X |
| Special Attack | L | C |
| Shield | Hold S | Hold Down |

### Physics & Movement
- **Gravity**: 800 pixels/second²
- **Jump Height**: Character-specific (500-700 pixels)
- **Movement Speed**: 200-450 pixels/second (varies by character)
- **Double Jump**: All characters can double jump
- **Air Control**: Reduced movement control while airborne

---

## 🛠️ Development

### Project Structure
```
backend/
├── src/
│   ├── auth/              # Authentication & JWT handling
│   ├── controllers/       # REST API request handlers
│   ├── database/          # Prisma repositories & data access
│   ├── game/              # Core game logic & physics
│   ├── networking/        # Socket.io connection management
│   ├── routes/            # Express route definitions
│   └── services/          # Business logic layer
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── migrations/        # Database version control
└── scripts/
    └── sync-constants.ts  # Game configuration sync tool

frontend/
├── src/
│   ├── scenes/            # Phaser game scenes
│   │   ├── MenuScene.ts      # Main menu
│   │   ├── CharacterSelectScene.ts
│   │   ├── GameScene.ts      # Main gameplay
│   │   └── ...
│   ├── entities/          # Game objects (Player, Stage, etc.)
│   ├── managers/          # Game systems (Input, Network, Combat)
│   ├── state/             # Global state management
│   └── types/             # TypeScript type definitions
└── public/
    └── assets/            # Game sprites, sounds, backgrounds
```

### Available Scripts

#### **Root Level**
```bash
npm run install:all        # Install all workspace dependencies
npm run build:all          # Build all packages
npm run build:shared       # Build shared types only
```

#### **Backend** (`cd backend`)
```bash
npm run dev                 # Start development server with hot reload
npm run build              # Build for production
npm run start              # Start production server
npm run sync-constants     # Update game configuration from YAML
npm run typecheck          # TypeScript type checking
npm run lint               # ESLint code linting
```

#### **Frontend** (`cd frontend`)
```bash
npm run dev                # Start Vite dev server
npm run build              # Build for production
npm run preview            # Preview production build
npm run typecheck          # TypeScript type checking
```

### Database Operations
```bash
# Generate Prisma client after schema changes
npx prisma generate

# Create and run new migrations
npx prisma migrate dev --name add-new-feature

# Reset database to pristine state
npx prisma migrate reset

# View data in Prisma Studio
npx prisma studio
```

### Game Configuration
Game balance and configuration is managed through `game-constants-master.yaml`:

```yaml
# Example: Adjust character stats
characters:
  dash:
    stats:
      health: 80
      speed: 400
      attack_damage: 15
      jump_velocity: -650
```

After editing, sync to database:
```bash
cd backend
npm run sync-constants
```

---

## 🚀 Deployment

### Production Deployment

#### **Frontend (Vercel)**
1. Connect your GitHub repository to Vercel
2. Set build configuration:
   - **Build Command**: `npm run build:shared && cd frontend && npm run build`
   - **Output Directory**: `frontend/dist`
   - **Install Command**: `npm install && npm install --workspaces`
3. Add environment variables:
   ```
   VITE_API_URL=https://your-backend.onrender.com
   VITE_SOCKET_URL=https://your-backend.onrender.com
   ```

#### **Backend & Database (Render)**
1. Create PostgreSQL database on Render
2. Create web service with:
   - **Build Command**: `cd .. && npm run install:all && npm run build:shared && cd backend && npx prisma generate && npm run build`
   - **Start Command**: `npm run start`
3. Set environment variables:
   ```
   DATABASE_URL=your_postgres_connection_string
   JWT_SECRET=your_secure_jwt_secret
   FRONTEND_URL=https://your-app.vercel.app
   NODE_ENV=production
   ```
4. Run database migrations and seed data

For detailed deployment instructions, see the [Deployment Guide](deployment-guide.md).

### Automated Deployment Script
```bash
# Use the included deployment helper
./scripts/deploy.sh
```

---

## 📚 API Documentation

### REST API Endpoints
- **Authentication**: `/auth/register`, `/auth/login`, `/auth/refresh`
- **Game Data**: `/api/characters`, `/api/stages`, `/api/constants`
- **User Profile**: `/auth/profile`

### WebSocket Events
- **Matchmaking**: `joinQueue`, `leaveQueue`, `matchFound`
- **Lobby**: `selectCharacter`, `selectStage`, `playerReady`
- **Gameplay**: `playerInput`, `gameStateUpdate`, `matchEnd`

For complete API documentation, see [API & WebSocket Reference](documents/api-websocket-reference.md).

---

## 🧪 Testing

### Running Tests
```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test

# Integration tests
npm run test:e2e
```

### Test Coverage
- Unit tests for game logic and utilities
- Integration tests for API endpoints
- Socket.io connection and event testing
- Physics system validation
- Database operations testing

---

## 🤝 Contributing

We welcome contributions! Here's how to get started:

### Development Process
1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** your changes: `git commit -m 'Add amazing feature'`
4. **Push** to the branch: `git push origin feature/amazing-feature`
5. **Open** a Pull Request

### Contribution Guidelines
- Follow the existing code style (ESLint + Prettier configured)
- Write tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting
- Use descriptive commit messages

### Areas for Contribution
- 🎨 **New Characters**: Design and implement unique fighters
- 🏟️ **Stages**: Create dynamic battle arenas
- 🎵 **Audio**: Add music and sound effects
- 🎮 **Game Modes**: Tournament brackets, team battles
- 🔧 **Performance**: Optimize networking and rendering
- 📚 **Documentation**: Improve guides and tutorials

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Inspiration**: Super Smash Bros series, Brawlhalla
- **Technologies**: Built with amazing open source tools
- **Community**: Thanks to all contributors and players
- **Assets**: Character sprites and backgrounds from various artists

---

## 📞 Support

- **Documentation**: Comprehensive guides in the `/documents` folder
- **Issues**: Report bugs via [GitHub Issues](https://github.com/your-username/brawl-bytes/issues)
- **Discussions**: Join the community in [GitHub Discussions](https://github.com/your-username/brawl-bytes/discussions)

---

<div align="center">

**Ready to join the fight? Clone the repo and start battling! 🥊**

[⚡ Quick Start](#-quick-start) • [🎮 Play Online](https://your-app.vercel.app) • [📚 Documentation](documents/) • [🤝 Contribute](#-contributing)

---

*Built with ❤️ by the Brawl Bytes team*

</div> 