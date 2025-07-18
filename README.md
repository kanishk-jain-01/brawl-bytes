# Brawl Bytes

**Brawl Bytes** is a 2D real-time multiplayer browser brawler inspired by Smash Bros and Brawlhalla. Select a fighter, pick a stage, and knock your friends off the platform in fast-paced matches at 60 FPS.

## Table of Contents
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [License](#license)

## Features
- **Real-time Multiplayer** – Low-latency gameplay powered by Socket.io and an authoritative Node.js server.
- **Character & Stage Selection** – Multiple fighters with unique stats and specials; varied arenas that change strategy.
- **Knock-out Combat** – Damage, knock-back, edge-guarding, and stock-based victories.
- **Progression System** – Win matches to unlock additional characters and stages.
- **Cross-Platform Web Client** – Play instantly in any modern desktop or mobile browser.

## Tech Stack
### Frontend
- [Phaser 3](https://phaser.io/) – 2D game engine
- TypeScript + Vite – Fast builds, type safety
- Socket.io Client – Real-time networking

### Backend
- Node.js + Express – REST API & WebSocket host
- Socket.io – Bidirectional real-time communication
- PostgreSQL + Prisma – Relational data with type-safe ORM
- Passport.js + JWT – Secure authentication & authorization

### Tooling
- Jest – Unit & integration tests
- ESLint & Prettier – Consistent code style
- Docker (optional) – Containerised local database

## Project Structure
```text
brawl-bytes/
├─ frontend/        # Phaser 3 game client
│  ├─ src/
│  │  ├─ scenes/    # Game scenes (Menu, Game, etc.)
│  │  ├─ entities/  # Player, Stage, & other game objects
│  │  ├─ state/     # Global game state management
│  │  └─ utils/     # Shared helpers & constants
│  └─ tests/        # Jest unit tests
├─ backend/         # Express + Socket.io server
│  ├─ src/
│  │  ├─ game/      # Game loop & logic
│  │  ├─ networking/# Socket.io event handlers
│  │  ├─ auth/      # Passport strategies & JWT helpers
│  │  ├─ database/  # Prisma repositories & migrations
│  │  └─ routes/    # REST API endpoints
│  └─ tests/        # Jest unit & integration tests
└─ documents/       # Detailed project documentation
```

## Getting Started
### Prerequisites
- **Node.js** 18+
- **npm** (or **yarn**)
- **PostgreSQL** 14+

### Installation
1. **Clone the repository**
   ```bash
   git clone https://github.com/<your-org>/brawl-bytes.git
   cd brawl-bytes
   ```
2. **Install dependencies**
   ```bash
   # Frontend
   cd frontend && npm install
   # Backend
   cd ../backend && npm install
   ```
3. **Configure environment variables**
   ```bash
   cd backend
   cp .env.example .env
   # Update the DATABASE_URL & JWT_* values as needed
   ```
4. **Run database migrations**
   ```bash
   npm run prisma:migrate
   npm run prisma:seed   # optional: seed dev data
   ```
5. **Start the development servers**
   ```bash
   # Terminal 1 – Backend (http://localhost:3001)
   cd backend && npm run dev

   # Terminal 2 – Frontend (http://localhost:3000)
   cd frontend && npm run dev
   ```

## Development Workflow
- **Type Safety** – Strict TypeScript settings across the stack.
- **Hot Reloading** – Vite & ts-node-dev provide instant feedback.
- **Lint → Test → Commit** – Run `npm run lint && npm test` before each commit.
- **Conventional Commits** – `feat(scope): message` for new features, `fix(scope): message` for bug fixes.

## Testing
Execute all tests and generate a coverage report:
```bash
# Frontend
cd frontend && npm test -- --coverage

# Backend
cd backend && npm test -- --coverage
```
Aim for **70 %+** coverage on critical paths.

## Documentation
Comprehensive docs live in the [`documents/`](./documents) directory:
- [Project Overview](./documents/projectoverview.md)
- [Feature Breakdown](./documents/features.md)
- [Technology Stack](./documents/techstack.md)
- [Deployment Guide](./documents/deployment.md)
- More in the folder…

## Contributing
1. Fork the repo & create your branch: `git checkout -b feat/awesome-feature`  
2. Write code **with tests** and follow the coding style guidelines.  
3. Run linters & tests locally.  
4. Commit with a conventional message and push: `git push origin feat/awesome-feature`  
5. Open a Pull Request – describe _what_ & _why_.  
6. Address review comments and iterate until approved.

## License
This project is licensed under the **ISC License** – see the [LICENSE](LICENSE) file for details.

---

_Ready to brawl? Fire up the servers and start building!_