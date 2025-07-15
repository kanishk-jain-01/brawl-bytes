# Technology Stack: 
## Phaser 3
2D Game Framework developed in JavaScript. Game Objects are the building objects of all Phaser games, including Sprites, Images, Text, Meshes, Containers, Nine Slice, Videos, TileSprites, Particle Emitters, Shapes.  

## Socket.io 
Networking Framework. Handles real-time bidirectional communication for multiplayer (e.g., syncing player movements, attacks, and health). It works over WebSockets with fallbacks, ensuring low latency.

## TypeScript 
Adds type safety to JS code, reducing bugs in unfamiliar territory. Phaser has official TS types.

## Vite
Modern bundler/dev server for the frontend. It's faster than Webpack/Create React App, supports TS out-of-the-box, and builds to plain static HTML/JS/CSS. No React/Next.js needed—Phaser works directly in vanilla JS/TS.

## Node.js 
For the backend server (hosts Socket.io and serves static files during dev).

## PostgreSQL + Prisma
**PostgreSQL** - Production-grade relational database for user accounts, match data, leaderboards, and game progression. Excellent performance, ACID compliance, and JSON support for flexible game data.
**Prisma** - Type-safe database ORM that generates TypeScript types from your database schema. Provides migrations, seeding, and excellent developer experience with auto-completion and compile-time safety.
**Local Development** - Run PostgreSQL locally via Docker or native installation.
**Production** - Managed PostgreSQL on Render with automatic backups and scaling.

## Express.js
**Purpose** - Web application framework for Node.js backend server. Handles REST API endpoints, middleware integration, and serves as the foundation for Socket.io server setup.
**Features** - Routing, middleware support, static file serving, and JSON parsing for API communications.

## Authentication & Security
**Passport.js** - Authentication middleware with support for local strategy (username/password) and JWT tokens. Integrates with Express and provides Socket.io authentication guards.
**bcrypt** - Password hashing library with salt rounds for secure credential storage.
**jsonwebtoken** - JWT token generation and verification for stateless authentication (15min access tokens + 30 day refresh tokens).

## Testing & Development
**Jest** - Testing framework for unit tests, integration tests, and mocking Socket.io connections for multiplayer testing.
**CORS** - Cross-origin resource sharing middleware for frontend-backend communication.
**Rate Limiting** - Express middleware to prevent abuse and spam in multiplayer matches.

## Deployment & Hosting
**Vercel** - Frontend hosting with global CDN, auto-deployment from Git, and optimized for static TypeScript/Vite builds.
**Render.com** - Backend hosting with persistent WebSocket support, auto-scaling, SSL certificates, and managed PostgreSQL integration.
**Environment Configuration** - Separate development and production environment variables for database URLs, JWT secrets, and CORS origins.
