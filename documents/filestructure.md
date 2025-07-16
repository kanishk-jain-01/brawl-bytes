# File Structure: 

project/
├── README.md                # Overall docs, deployment guide
├── .gitignore               # Ignore node_modules, dist, etc.
├── .github/                 # CI workflows
│   └── workflows/
│       └── deploy.yml       # Separate jobs for frontend/backend
├── documents/               # Planning and documentation
│   ├── deployment.md        # Deployment strategy (Vercel + Render + PostgreSQL)
│   ├── features.md          # Features breakdown
│   ├── projectoverview.md   # Project overview
│   ├── techstack.md         # Tech stack (including PostgreSQL + Prisma)
│   ├── testing.md           # Testing strategy
│   ├── database.md          # Database design and models
│   ├── environment.md       # Environment configuration (PostgreSQL + Prisma)
│   ├── network-architecture.md  # Detailed networking design
│   ├── game-balance.md      # Character stats, damage values, frame data
│   ├── security-plan.md     # Security measures and validation
│   ├── performance-requirements.md  # Target FPS, latency, concurrent users
│   ├── user-flow.md         # From landing page to playing a match
│   └── tasks/               # Task management and progress tracking
├── frontend/                # Self-contained: Vite + Phaser + TS + Jest
│   ├── package.json         # Frontend deps/scripts (vite, phaser, socket.io-client, jest, ts-jest, jsdom)
│   ├── tsconfig.json        # Frontend TS config
│   ├── jest.config.ts       # With jsdom env
│   ├── vite.config.ts       # Vite bundler
│   ├── index.html           # HTML entry
│   ├── src/
│   │   ├── main.ts          # Phaser init
│   │   ├── scenes/          # Game scenes
│   │   │   ├── BootScene.ts     # Initial loading
│   │   │   ├── MenuScene.ts     # Main menu
│   │   │   ├── LobbyScene.ts    # Matchmaking/room selection
│   │   │   ├── CharacterSelectScene.ts  # Character selection
│   │   │   ├── GameScene.ts     # Main gameplay
│   │   │   └── ResultScene.ts   # Post-game results
│   │   ├── entities/        # Game objects
│   │   │   ├── Player.ts        # Player entity with physics
│   │   │   ├── Projectile.ts    # Projectile entities
│   │   │   ├── Stage.ts         # Stage/platform entities
│   │   │   └── UI/              # UI components
│   │   │       ├── HealthBar.ts
│   │   │       ├── StockCounter.ts
│   │   │       └── HUD.ts
│   │   ├── systems/         # Game systems
│   │   │   ├── InputSystem.ts   # Input handling and prediction
│   │   │   ├── NetworkSystem.ts # Client-side networking
│   │   │   ├── PhysicsSystem.ts # Client physics simulation
│   │   │   ├── RenderSystem.ts  # Rendering optimizations
│   │   │   └── AudioSystem.ts   # Sound management
│   │   ├── utils/           # Utilities
│   │   │   ├── socket.ts        # Socket.io client setup
│   │   │   ├── interpolation.ts # Client-side interpolation
│   │   │   ├── prediction.ts    # Client-side prediction
│   │   │   └── constants.ts     # Game constants
│   │   ├── types/           # TypeScript definitions
│   │   │   ├── index.ts         # Main type exports
│   │   │   ├── GameState.ts     # Game state interfaces
│   │   │   ├── Player.ts        # Player-related types
│   │   │   └── Network.ts       # Network message types
│   │   └── __tests__/       # Unit/integration tests
│   │       ├── entities/        # Entity tests
│   │       ├── systems/         # System tests
│   │       └── utils/           # Utility tests
│   ├── assets/              # Game assets
│   │   ├── sprites/             # Character and object sprites
│   │   ├── audio/               # Sound effects and music
│   │   ├── fonts/               # Custom fonts
│   │   └── stages/              # Stage backgrounds and tilesets
│   ├── __mocks__/           # Jest mocks
│   │   ├── Phaser.js            # Phaser mock
│   │   └── fileMock.js          # Asset file mock
│   └── dist/                # Built output (git-ignored)
└── backend/                 # Self-contained: Node + Express + Socket.io + PostgreSQL + Prisma + TS + Jest
    ├── package.json         # Backend deps/scripts (express, socket.io, prisma, @prisma/client, jest, ts-jest, supertest)
    ├── tsconfig.json        # Backend TS config
    ├── jest.config.ts       # With node env
    ├── .env                 # Environment variables (DATABASE_URL, etc.)
    ├── .env.example         # Example environment file
    ├── prisma/              # Prisma ORM setup (standard location)
    │   ├── schema.prisma        # Database schema definition
    │   ├── seed.ts              # Initial data seeding
    │   └── migrations/          # Database migrations
    │       └── 20250716005307_init/
    │           └── migration.sql
    ├── src/
    │   ├── server.ts            # Main entry point with Express + Socket.io
    │   ├── auth/                # Authentication layer
    │   │   ├── passport.ts          # Passport.js configuration (Local + JWT)
    │   │   ├── middleware.ts        # Auth middleware for route protection
    │   │   └── utils.ts             # JWT generation, password hashing
    │   ├── controllers/         # Request handlers (Express pattern)
    │   │   └── gameConstantsController.ts  # Game constants API controller
    │   ├── routes/              # API route definitions
    │   │   ├── auth.ts              # Authentication endpoints (/api/auth)
    │   │   ├── characters.ts        # Character data endpoints
    │   │   ├── stages.ts            # Stage data endpoints
    │   │   └── gameConstants.ts     # Game constants endpoints (/api/constants)
    │   ├── services/            # Business logic layer
    │   │   └── GameConstantsService.ts  # Game constants business logic
    │   ├── database/            # Data access layer
    │   │   └── repositories/        # Repository pattern for data access
    │   │       ├── UserRepository.ts           # User CRUD operations
    │   │       └── GameConstantsRepository.ts  # Game constants data access
    │   ├── game/                # Core game logic
    │   │   ├── GameRoom.ts          # Room management and player state
    │   │   └── PhysicsSystem.ts     # Server-side physics validation
    │   ├── networking/          # Network management
    │   │   └── SocketManager.ts     # Socket.io connection and message handling
    │   ├── utils/               # Shared utilities
    │   └── __tests__/           # Unit and integration tests
    │       ├── __mocks__/           # Test mocks (Prisma, etc.)
    │       ├── auth/                # Authentication tests
    │       ├── database/            # Repository tests
    │       ├── routes/              # API endpoint tests
    │       ├── server.test.ts       # Server integration tests
    │       └── setup.ts             # Jest test setup
    └── dist/                    # Compiled JS (git-ignored)