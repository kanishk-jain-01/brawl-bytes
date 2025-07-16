# MVP Implementation Task List

Based on the Brawl Bytes planning documents, this task list focuses on creating a minimal viable product (MVP) that demonstrates core gameplay mechanics without over-engineering.

## Relevant Files

- `frontend/package.json` - Frontend dependencies (Vite, Phaser, TypeScript, Socket.io-client) ✓
- `frontend/tsconfig.json` - TypeScript configuration for frontend ✓
- `frontend/vite.config.ts` - Vite bundler configuration ✓
- `frontend/index.html` - Main HTML entry point ✓
- `frontend/src/main.ts` - Phaser game initialization and entry point ✓
- `frontend/src/scenes/BootScene.ts` - Initial loading scene for assets ✓
- `frontend/src/scenes/MenuScene.ts` - Main menu with play options ✓
- `frontend/src/scenes/CharacterSelectScene.ts` - Character selection interface ✓
- `frontend/src/scenes/StageSelectScene.ts` - Stage selection interface for host ✓
- `frontend/src/scenes/PreMatchLobbyScene.ts` - Pre-match lobby showing players, selections, and ready status ✓
- `frontend/src/scenes/GameScene.ts` - Core gameplay scene with physics, combat, and attack collision detection ✓
- `frontend/src/entities/Player.ts` - Player entity with movement, combat, advanced health/damage system, and animation system ✓
- `frontend/src/entities/Stage.ts` - Stage entity with platforms, boundaries, hazards, and collision detection ✓
- `frontend/src/utils/socket.ts` - Socket.io client setup for multiplayer with authentication, room management, and real-time events ✓
- `frontend/src/utils/constants.ts` - Game constants (character stats, physics values)
- `frontend/src/types/GameState.ts` - TypeScript interfaces for game state
- `frontend/jest.config.ts` - Jest configuration for frontend testing ✓
- `frontend/src/__tests__/setup.ts` - Jest setup and mocks for frontend ✓
- `frontend/src/__tests__/main.test.ts` - Basic Jest setup verification test ✓
- `frontend/src/__mocks__/fileMock.ts` - Asset file mocks ✓
- `frontend/.eslintrc.js` - ESLint configuration for frontend with Airbnb + TypeScript ✓
- `frontend/.prettierrc` - Prettier configuration for consistent code formatting ✓
- `frontend/src/__tests__/entities/Player.test.ts` - Unit tests for Player entity (Player creation tests complete, movement tests in progress) ✓
- `frontend/src/__tests__/scenes/GameScene.test.ts` - Unit tests for GameScene
- `backend/package.json` - Backend dependencies (Express, Socket.io, TypeScript, Prisma, PostgreSQL, Jest) ✓
- `backend/tsconfig.json` - TypeScript configuration for backend ✓
- `backend/.env.example` - Environment variables template ✓
- `backend/src/server.ts` - Express server with Socket.io setup ✓
- `backend/jest.config.ts` - Jest configuration for backend testing ✓
- `backend/src/__tests__/setup.ts` - Jest setup and custom matchers ✓
- `backend/src/__tests__/server.test.ts` - Basic Jest setup and API tests ✓
- `backend/.eslintrc.js` - ESLint configuration for backend with Airbnb + TypeScript ✓
- `backend/.prettierrc` - Prettier configuration for consistent code formatting ✓
- `.gitignore` - Root-level gitignore for node_modules, dist, .env, coverage, and OS files ✓
- `backend/prisma/schema.prisma` - Database schema definition with User, PlayerProfile, Match, Character, and Stage models ✓
- `backend/.env` - Environment variables for database connection ✓
- `backend/prisma/migrations/20250715003734_init/migration.sql` - Initial database migration file ✓
- `backend/src/generated/prisma/` - Generated Prisma client for type-safe database access ✓
- `backend/prisma/seed.ts` - Database seed file with default characters and stages ✓
- `backend/src/auth/passport.ts` - Passport.js configuration with Local and JWT strategies ✓
- `backend/src/auth/middleware.ts` - Authentication middleware for protecting routes ✓
- `backend/src/auth/utils.ts` - JWT token generation and password hashing utilities ✓
- `backend/src/database/repositories/UserRepository.ts` - User data access layer ✓
- `backend/src/database/repositories/MatchRepository.ts` - Match data access layer
- `backend/src/game/GameRoom.ts` - Room management for multiplayer matches with player state, match lifecycle, and real-time synchronization ✓
- `backend/src/game/GameState.ts` - Authoritative game state management
- `backend/src/game/PhysicsSystem.ts` - Server-side physics validation and authority with movement, combat, and collision validation ✓
- `backend/src/networking/SocketManager.ts` - Socket connection and message handling with room management, authentication, and game events ✓
- `backend/.env` - Environment variables for database connection
- `backend/src/__tests__/game/GameRoom.test.ts` - Unit tests for GameRoom class
- `backend/src/__tests__/database/UserRepository.test.ts` - Unit tests for UserRepository

### Notes

- Use local PostgreSQL installed via Homebrew for development
- Include basic user authentication for proper multiplayer experience
- Character and stage data can be seeded into PostgreSQL
- Focus on local development first before deploying
- Unit tests should be written alongside implementation for critical components
- Use `npm test` to run Jest tests for both frontend and backend

## Tasks

- [x] 1.0 Project Setup & Basic Infrastructure
  - [x] 1.1 Create project root directory structure (frontend/, backend/, documents/)
  - [x] 1.2 Initialize frontend with Vite + TypeScript + Phaser 3
  - [x] 1.3 Initialize backend with Node.js + Express + TypeScript
  - [x] 1.4 Set up Jest testing framework for both frontend and backend
  - [x] 1.5 Set up ESLint/Prettier for both frontend and backend
  - [x] 1.6 Create basic .gitignore files for node_modules, dist, .env
  - [x] 1.7 Set up package.json scripts for dev, build, start, and test commands

- [x] 2.0 Database Setup & Basic Authentication
  - [x] 2.1 Verify PostgreSQL is running locally via Homebrew
  - [x] 2.2 Create brawlbytes_dev database locally
  - [x] 2.3 Install and configure Prisma ORM in backend
  - [x] 2.4 Create Prisma schema with User, PlayerProfile, and basic Match models
  - [x] 2.5 Run initial Prisma migration to create database tables
  - [x] 2.6 Set up basic JWT authentication with Passport.js
  - [x] 2.7 Create user registration and login API endpoints
  - [x] 2.8 Create database seed file with default characters and stages
  - [x] 2.9 Write unit tests for UserRepository and authentication endpoints

- [x] 3.0 Core Frontend Game Engine Setup
  - [x] 3.1 Set up Phaser 3 game configuration and main.ts entry point
  - [x] 3.2 Create BootScene for asset loading and initial setup
  - [x] 3.3 Create MenuScene with play button and basic navigation
  - [x] 3.4 Create CharacterSelectScene with character grid and selection
  - [x] 3.5 Create basic GameScene with camera and input setup
  - [x] 3.6 Set up scene transitions and game state management
  - [x] 3.7 Configure Vite for asset bundling and development server

- [x] 4.0 Basic Character System & Physics
  - [x] 4.1 Create Player entity class with Phaser physics body
  - [x] 4.2 Implement basic movement (left/right movement, jumping)
  - [x] 4.3 Add character sprites and basic animations (idle, walk, jump)
  - [x] 4.4 Implement basic attack system with hitboxes
  - [x] 4.5 Create Stage entity with platforms and boundaries
  - [x] 4.6 Add health system and damage calculation
  - [x] 4.7 Implement knockback mechanics and stock system
  - [x] 4.8 Add victory/defeat conditions and match end logic
  - [x] 4.9 Write unit tests for Player entity and combat mechanics

- [ ] 5.0 Multiplayer Networking Foundation
  - [x] 5.1 Set up Socket.io server in backend with room management
  - [x] 5.2 Create GameRoom class for match state and player management
  - [x] 5.3 Implement client-side Socket.io connection and authentication
  - [x] 5.4 Add real-time player position and input synchronization
    - [x] 5.4.1 Add real-time position broadcasting from local player
    - [x] 5.4.2 Add position receiving and interpolation for remote players
    - [x] 5.4.3 Add input broadcasting for attacks and actions
    - [x] 5.4.4 Add client-side prediction with server reconciliation
  - [x] 5.5 Create server-side physics validation and authority
  - [x] 5.6 Implement matchmaking queue for 2-player matches
  - [x] 5.7 Add disconnect handling and reconnection logic
    - [x] 5.7.1 Analyze existing disconnect handling code in SocketManager and GameRoom
    - [x] 5.7.2 Enhance backend disconnect handling with graceful cleanup and reconnection timeout
    - [x] 5.7.3 Improve frontend reconnection logic with exponential backoff and user feedback
    - [x] 5.7.4 Implement automatic game pause/resume on player disconnect/reconnect
    - [x] 5.7.5 Add configurable reconnection timeout with room cleanup
    - [x] 5.7.6 Test various disconnect scenarios and edge cases
  - [ ] 5.8 Lobby & Selection Synchronization
    - [x] 5.8.1 Create StageSelectScene (frontend UI for host to choose stage)
    - [x] 5.8.2 Implement PreMatchLobby flow (show players, ready status, selected characters & stage)
    - [x] 5.8.3 Emit `selectCharacter`, `selectStage`, and `setPlayerReady` events from frontend via SocketManager
    - [x] 5.8.4 Add backend lobby events (`charSelected`, `stageSelected`, `playerReady`, `lobby:state`, `lobby:start`)
    - [x] 5.8.5 Extend GameRoom to store selections, validate inputs, and start match once all players ready
    - [x] 5.8.6 Broadcast `lobby:state` updates and `game:start` payload including chosen stage & character assignments
    - [x] 5.8.7 Update NetworkManager/GameScene to initialize players and stage from `game:start` data
    - [ ] 5.8.8 Add unit tests for lobby flow and selection validation (backend)
    - [ ] 5.8.9 Emit authoritative state snapshots (`game:state`) from backend at 60 Hz and deltas on key events
    - [ ] 5.8.10 Consume `game:state` / `positionCorrection` on frontend, reconcile predicted vs authoritative state for all players
  - [ ] 5.9 Multiplayer Integration & End-to-End Tests
    - [ ] 5.9.1 Backend integration test: simulate two socket.io clients through lobby → game flow
    - [ ] 5.9.2 Frontend integration test: verify CharacterSelectScene emits correct events and GameScene spawns correct entities
    - [ ] 5.9.3 Disconnect/reconnect integration test: ensure pause/resume works end-to-end
    - [ ] 5.9.4 Performance test: sustain 60 FPS game loop with multiple clients for 30 seconds without desync

- [ ] 6.0 MVP Polish & Testing
  - [ ] 6.1 Add basic UI elements (health bars, stock counters, timer)
  - [ ] 6.2 Implement sound effects for attacks, jumps, and hits
  - [ ] 6.3 Add visual feedback for attacks (hit effects, screen shake)
  - [ ] 6.4 Create post-match results screen with basic stats
  - [ ] 6.5 Add responsive design for different screen sizes
  - [ ] 6.6 Test local multiplayer functionality thoroughly
  - [ ] 6.7 Optimize performance for 60fps gameplay
  - [ ] 6.8 Create basic deployment configuration for testing