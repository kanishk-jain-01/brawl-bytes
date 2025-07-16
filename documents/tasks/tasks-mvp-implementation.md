# MVP Implementation Task List

Based on the Brawl Bytes planning documents, this task list focuses on creating a minimal viable product (MVP) that demonstrates core gameplay mechanics without over-engineering.

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
  - [ ] 4.9 Write unit tests for Player entity and combat mechanics

- [ ] 4.10 Front-End Authentication
  - [x] 4.10.1 Auth API wrapper (login/register/refresh)
  - [x] 4.10.2 LoginScene with username & password (register toggle)
  - [x] 4.10.3 Token storage and auto-authentication on page load
  - [x] 4.10.4 Socket.io authenticate(token) hookup in main.ts
  - [x] 4.10.5 Logout flow (clear token & return to LoginScene)
  - [ ] 4.10.6 Frontend auth unit tests

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