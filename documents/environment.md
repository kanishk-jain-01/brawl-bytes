# Environment Configuration

## Environment Variables Setup

### Backend Environment Variables

Create a `.env` file in your `backend/` directory with the following variables:

```env
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/brawlbytes_dev"

# Server Configuration
PORT=3001
NODE_ENV=development

# JWT Authentication
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_EXPIRES_IN="7d"
JWT_REFRESH_EXPIRES_IN="30d"

# Socket.io Configuration
CORS_ORIGIN="http://localhost:5173"

# Game Configuration
GAME_TICK_RATE=60
MAX_PLAYERS_PER_MATCH=4

# Security
BCRYPT_SALT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL="debug"

# Optional OAuth (uncomment if enabling social login)
# OAUTH_GOOGLE_CLIENT_ID=""
# OAUTH_GOOGLE_CLIENT_SECRET=""
# OAUTH_DISCORD_CLIENT_ID=""
# OAUTH_DISCORD_CLIENT_SECRET=""
```

### Example Environment File (`.env.example`)

```env
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/brawlbytes_dev"

# Server Configuration
PORT=3001
NODE_ENV=development

# JWT Authentication (CHANGE THESE IN PRODUCTION!)
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_EXPIRES_IN="7d"
JWT_REFRESH_EXPIRES_IN="30d"

# Socket.io Configuration
CORS_ORIGIN="http://localhost:5173"

# Game Configuration
GAME_TICK_RATE=60
MAX_PLAYERS_PER_MATCH=4

# Security
BCRYPT_SALT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL="debug"

# Optional OAuth (uncomment if enabling social login)
# OAUTH_GOOGLE_CLIENT_ID=""
# OAUTH_GOOGLE_CLIENT_SECRET=""
# OAUTH_DISCORD_CLIENT_ID=""
# OAUTH_DISCORD_CLIENT_SECRET=""
```

## Local Development Setup

### 1. PostgreSQL Local Installation

**Option A: Docker (Recommended)**
```bash
# Run PostgreSQL in Docker
docker run --name brawlbytes-postgres \
  -e POSTGRES_DB=brawlbytes_dev \
  -e POSTGRES_USER=brawlbytes \
  -e POSTGRES_PASSWORD=dev_password \
  -p 5432:5432 \
  -d postgres:15

# Your local DATABASE_URL would be:
DATABASE_URL="postgresql://brawlbytes:dev_password@localhost:5432/brawlbytes_dev"
```

**Option B: Native Installation**
```bash
# macOS (with Homebrew)
brew install postgresql
brew services start postgresql
createdb brawlbytes_dev

# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo -u postgres createdb brawlbytes_dev

# Your local DATABASE_URL would be:
DATABASE_URL="postgresql://postgres:@localhost:5432/brawlbytes_dev"
```

### 2. Prisma Setup Commands

```bash
# Initialize Prisma (if not already done)
npx prisma init

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# Seed the database (optional)
npx prisma db seed

# View database in Prisma Studio
npx prisma studio
```

## Production Setup (Render)

### 1. Create PostgreSQL Database on Render

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "PostgreSQL"
3. Configure:
   - **Name**: `brawlbytes-db`
   - **Database**: `brawlbytes`
   - **User**: `brawlbytes`
   - **Region**: Same as your backend service
   - **Plan**: Free (1GB) or Starter ($7/month, 10GB)

### 2. Backend Service Environment Variables

Add these to your Render backend service:

```env
# Database (Use Internal Database URL from Render PostgreSQL dashboard)
DATABASE_URL="postgresql://brawlbytes:password@dpg-xxxxx-a.oregon-postgres.render.com/brawlbytes"

# Server Configuration
PORT=10000
NODE_ENV=production

# JWT Authentication (Generate strong secrets!)
JWT_SECRET="your-production-jwt-secret-generate-a-strong-one"
JWT_EXPIRES_IN="7d"
JWT_REFRESH_EXPIRES_IN="30d"

# Socket.io Configuration
CORS_ORIGIN="https://your-game.vercel.app"

# Game Configuration
GAME_TICK_RATE=60
MAX_PLAYERS_PER_MATCH=4

# Security
BCRYPT_SALT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL="info"

# Optional OAuth (uncomment if enabling social login)
# OAUTH_GOOGLE_CLIENT_ID=""
# OAUTH_GOOGLE_CLIENT_SECRET=""
# OAUTH_DISCORD_CLIENT_ID=""
# OAUTH_DISCORD_CLIENT_SECRET=""
```

### 3. Build Commands for Render

**Build Command:**
```bash
npm install && npx prisma generate && npx prisma migrate deploy && npm run build
```

**Start Command:**
```bash
npm start
```

## Environment-Specific Configuration

### Package.json Scripts

Add these scripts to your `backend/package.json`:

```json
{
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "db:migrate": "prisma migrate dev",
    "db:generate": "prisma generate",
    "db:seed": "prisma db seed",
    "db:studio": "prisma studio",
    "db:reset": "prisma migrate reset",
    "test": "jest",
    "test:watch": "jest --watch"
  }
}
```


## Security Best Practices

### 1. Environment Variable Security

- **Never commit `.env` files** to version control
- **Use different secrets** for development and production
- **Rotate JWT secrets** regularly in production
- **Use strong passwords** for database connections

### 2. Database Security

```sql
-- Create read-only user for analytics/reporting
CREATE USER brawlbytes_readonly WITH PASSWORD 'readonly_password';
GRANT CONNECT ON DATABASE brawlbytes TO brawlbytes_readonly;
GRANT USAGE ON SCHEMA public TO brawlbytes_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO brawlbytes_readonly;
```

### 3. Connection Security

- **Use SSL connections** in production
- **Implement connection pooling** for better performance
- **Set connection timeouts** to prevent hanging connections

## Monitoring & Debugging

### Environment Validation

Add environment validation to your server startup to ensure all required variables are present before the application starts.

This configuration ensures smooth development locally and seamless deployment to Render with PostgreSQL! 