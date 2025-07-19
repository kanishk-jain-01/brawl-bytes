# 🚀 Brawl Bytes Deployment Guide

## Prerequisites
- [ ] GitHub repository with your code
- [ ] Render.com account
- [ ] Vercel account
- [ ] Git CLI installed

## Step 1: Database Setup on Render

   1. **Create PostgreSQL Database:**
   ```bash
   # Go to https://dashboard.render.com/
   # Click "New" → "PostgreSQL"
   # Name: brawl-bytes-db (Render service name)
   # Database: brawlbytes_prod (actual PostgreSQL database name)
   # User: brawlbytes
   # Version: PostgreSQL 15 (recommended for multiplayer games)
   # Region: Same as your backend (Oregon recommended)
   # Plan: Starter (free) or Standard ($7/month)
   ```

2. **Get Database Connection String:**
   - Copy the "Internal Database URL" for backend configuration
   - Copy the "External Database URL" for local development (optional)

## Step 2: Backend Deployment on Render

1. **Create Web Service:**
   ```bash
   # Go to https://dashboard.render.com/
   # Click "New" → "Web Service"
   # Connect your GitHub repository
   # Select repository: your-repo-name
   ```

2. **Configure Service:**
   - **Name:** `brawl-bytes-backend`
   - **Region:** Oregon (or closest to users)
   - **Branch:** `main`
   - **Root Directory:** `backend`
   - **Runtime:** Node
   - **Build Command:** `cd .. && npm run install:all && npm run build:shared && cd backend && npm run build`
   - **Start Command:** `npm run start`

3. **Environment Variables:**
   ```env
   NODE_ENV=production
   PORT=443
   DATABASE_URL=[Use database connection string from Step 1]
   JWT_SECRET=[Generate a secure 64+ character string]
   FRONTEND_URL=https://your-app-name.vercel.app
   CORS_ORIGIN=https://your-app-name.vercel.app
   GAME_TICK_RATE=60
   MAX_PLAYERS_PER_MATCH=4
   BCRYPT_SALT_ROUNDS=12
   LOG_LEVEL=info
   ```

4. **Deploy Backend:**
   - Click "Create Web Service"
   - Wait for deployment (5-10 minutes)
   - Note your backend URL: `https://your-backend-name.onrender.com`

## Step 3: Database Migration

1. **Connect to Database:**
   ```bash
   # In your local backend directory
   cp .env.example .env
   # Edit .env with your production DATABASE_URL
   
   # Run migrations
   cd backend
   npx prisma migrate deploy
   
   # Seed initial data (optional)
   npm run sync-constants:force
   ```

## Step 4: Frontend Deployment on Vercel

1. **Update Environment File:**
   ```bash
   # Edit frontend/.env.production
   VITE_API_URL=https://your-backend-name.onrender.com
   VITE_SOCKET_URL=https://your-backend-name.onrender.com
   ```

2. **Deploy to Vercel:**
   ```bash
   # Option A: Vercel CLI (recommended)
   npm install -g vercel
   vercel --prod
   
   # Option B: GitHub Integration
   # Go to https://vercel.com/dashboard
   # Import your GitHub repository
   # Set framework preset to "Other"
   # Set build command: "cd frontend && npm run build"
   # Set output directory: "frontend/dist"
   # Set install command: "npm run install:all && npm run build:shared"
   ```

3. **Configure Environment:**
   - In Vercel dashboard → Project Settings → Environment Variables
   - Add production environment variables:
     ```
     VITE_API_URL=https://your-backend-name.onrender.com
     VITE_SOCKET_URL=https://your-backend-name.onrender.com
     NODE_ENV=production
     ```

## Step 5: Update Backend CORS

1. **Update Backend Environment:**
   ```bash
   # In Render dashboard → Your backend service → Environment
   # Update these variables with your actual Vercel URL:
   FRONTEND_URL=https://your-actual-app.vercel.app
   CORS_ORIGIN=https://your-actual-app.vercel.app
   ```

2. **Redeploy Backend:**
   - Trigger manual redeploy in Render dashboard

## Step 6: Testing

1. **Test Basic Connectivity:**
   ```bash
   # Check backend health
   curl https://your-backend-name.onrender.com/health
   
   # Check frontend loads
   open https://your-app.vercel.app
   ```

2. **Test Authentication:**
   - Create account on frontend
   - Login and verify JWT token works
   - Check browser console for Socket.io connection

3. **Test Multiplayer:**
   - Open game in multiple browser tabs/devices
   - Test matchmaking and real-time gameplay
   - Verify Socket.io events work correctly

## Step 7: Production Optimizations

1. **Upgrade Plans (Optional):**
   - Render: Upgrade to Standard plan for better performance
   - Vercel: Pro plan for better analytics and edge functions

2. **Domain Setup (Optional):**
   - Configure custom domain in Vercel
   - Update CORS_ORIGIN in backend environment

3. **Monitoring:**
   - Set up error tracking (Sentry)
   - Monitor server logs in Render dashboard
   - Set up uptime monitoring

## Troubleshooting

### Common Issues:

1. **Socket.io Connection Failed:**
   - Check CORS_ORIGIN matches frontend URL exactly
   - Verify VITE_SOCKET_URL is correct
   - Check browser console for detailed errors

2. **Database Connection Failed:**
   - Verify DATABASE_URL is correct
   - Ensure migrations were run
   - Check Render database is active

3. **Build Failures:**
   - Check all dependencies are in package.json
   - Verify build commands are correct
   - Review build logs in deployment dashboard

4. **Authentication Issues:**
   - Verify JWT_SECRET is set and consistent
   - Check token expiration settings
   - Ensure HTTPS is used in production

5. **TypeScript Compilation Errors:**
   - If you see "Could not find declaration file" errors during build
   - Ensure all @types/* packages are in dependencies (not devDependencies)
   - Run `npm install` locally to verify the build works
   - Check that TypeScript is included in dependencies for production builds

## URLs After Deployment:
- **Frontend:** https://your-app.vercel.app
- **Backend:** https://your-backend.onrender.com
- **Database:** Managed by Render (internal access only)

## Cost Estimate:
- **Free Tier:** Vercel (Frontend) + Render Starter (Backend + DB) = $0/month
- **Production:** Vercel Pro ($20/month) + Render Standard ($7+$7/month) = $34/month 