# MVP Implementation Task List

Based on the Brawl Bytes planning documents, this task list focuses on creating a minimal viable product (MVP) that demonstrates core gameplay mechanics without over-engineering.

## Relevant Files

- `frontend/package.json` - Frontend dependencies (Vite, Phaser, TypeScript, Socket.io-client) ✓
- `frontend/tsconfig.json` - TypeScript configuration for frontend ✓
- `frontend/vite.config.ts` - Vite bundler configuration ✓
- `frontend/index.html` - Main HTML entry point ✓
- `frontend/src/main.ts` - Phaser game initialization and entry point ✓
- `frontend/src/scenes/BootScene.ts` - Initial loading scene for assets ✓
- `frontend/src/scenes/MenuScene.ts` - Main menu with play options
- `frontend/src/scenes/CharacterSelectScene.ts` - Character selection interface
- `frontend/src/scenes/GameScene.ts` - Core gameplay scene with physics and combat
- `frontend/src/entities/Player.ts` - Player entity with movement, combat, and health
- `frontend/src/entities/Stage.ts` - Stage platforms and boundaries
- `frontend/src/utils/socket.ts` - Socket.io client setup for multiplayer
- `frontend/src/utils/constants.ts` - Game constants (character stats, physics values)
- `frontend/src/types/GameState.ts` - TypeScript interfaces for game state
- `frontend/jest.config.ts` - Jest configuration for frontend testing ✓
- `frontend/src/__tests__/setup.ts` - Jest setup and mocks for frontend ✓
- `frontend/src/__tests__/main.test.ts` - Basic Jest setup verification test ✓
- `frontend/src/__mocks__/fileMock.ts` - Asset file mocks ✓
- `frontend/.eslintrc.js` - ESLint configuration for frontend with Airbnb + TypeScript ✓
- `frontend/.prettierrc` - Prettier configuration for consistent code formatting ✓
- `frontend/src/__tests__/entities/Player.test.ts` - Unit tests for Player entity
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
- `backend/src/database/prisma/schema.prisma` - Database schema definition
- `backend/src/database/repositories/UserRepository.ts` - User data access layer
- `backend/src/database/repositories/MatchRepository.ts` - Match data access layer
- `backend/src/game/GameRoom.ts` - Room management for multiplayer matches
- `backend/src/game/GameState.ts` - Authoritative game state management
- `backend/src/game/PhysicsSystem.ts` - Server-side physics validation
- `backend/src/networking/SocketManager.ts` - Socket connection and message handling
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

- [ ] 2.0 Database Setup & Basic Authentication
  - [ ] 2.1 Verify PostgreSQL is running locally via Homebrew
  - [ ] 2.2 Create brawlbytes_dev database locally
  - [ ] 2.3 Install and configure Prisma ORM in backend
  - [ ] 2.4 Create Prisma schema with User, PlayerProfile, and basic Match models
  - [ ] 2.5 Run initial Prisma migration to create database tables
  - [ ] 2.6 Set up basic JWT authentication with Passport.js
  - [ ] 2.7 Create user registration and login API endpoints
  - [ ] 2.8 Create database seed file with default characters and stages
  - [ ] 2.9 Write unit tests for UserRepository and authentication endpoints

- [ ] 3.0 Core Frontend Game Engine Setup
  - [ ] 3.1 Set up Phaser 3 game configuration and main.ts entry point
  - [ ] 3.2 Create BootScene for asset loading and initial setup
  - [ ] 3.3 Create MenuScene with play button and basic navigation
  - [ ] 3.4 Create CharacterSelectScene with character grid and selection
  - [ ] 3.5 Create basic GameScene with camera and input setup
  - [ ] 3.6 Set up scene transitions and game state management
  - [ ] 3.7 Configure Vite for asset bundling and development server

- [ ] 4.0 Basic Character System & Physics
  - [ ] 4.1 Create Player entity class with Phaser physics body
  - [ ] 4.2 Implement basic movement (left/right movement, jumping)
  - [ ] 4.3 Add character sprites and basic animations (idle, walk, jump)
  - [ ] 4.4 Implement basic attack system with hitboxes
  - [ ] 4.5 Create Stage entity with platforms and boundaries
  - [ ] 4.6 Add health system and damage calculation
  - [ ] 4.7 Implement knockback mechanics and stock system
  - [ ] 4.8 Add victory/defeat conditions and match end logic
  - [ ] 4.9 Write unit tests for Player entity and combat mechanics

- [ ] 5.0 Multiplayer Networking Foundation
  - [ ] 5.1 Set up Socket.io server in backend with room management
  - [ ] 5.2 Create GameRoom class for match state and player management
  - [ ] 5.3 Implement client-side Socket.io connection and authentication
  - [ ] 5.4 Add real-time player position and input synchronization
  - [ ] 5.5 Create server-side physics validation and authority
  - [ ] 5.6 Implement matchmaking queue for 2-player matches
  - [ ] 5.7 Add disconnect handling and reconnection logic
  - [ ] 5.8 Sync character selection and stage selection between players
  - [ ] 5.9 Write integration tests for GameRoom and Socket.io functionality

- [ ] 6.0 MVP Polish & Testing
  - [ ] 6.1 Add basic UI elements (health bars, stock counters, timer)
  - [ ] 6.2 Implement sound effects for attacks, jumps, and hits
  - [ ] 6.3 Add visual feedback for attacks (hit effects, screen shake)
  - [ ] 6.4 Create post-match results screen with basic stats
  - [ ] 6.5 Add responsive design for different screen sizes
  - [ ] 6.6 Test local multiplayer functionality thoroughly
  - [ ] 6.7 Optimize performance for 60fps gameplay
  - [ ] 6.8 Create basic deployment configuration for testing