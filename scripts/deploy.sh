#!/bin/bash

# Brawl Bytes Deployment Script
# This script helps automate the deployment process

set -e

echo "🚀 Brawl Bytes Deployment Script"
echo "================================="

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check if we're in the correct directory
if [ ! -f "package.json" ] || [ ! -d "frontend" ] || [ ! -d "backend" ]; then
    print_error "Please run this script from the root of your Brawl Bytes project"
    exit 1
fi

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
print_step "Checking prerequisites..."

if ! command_exists git; then
    print_error "Git is required but not installed"
    exit 1
fi

if ! command_exists node; then
    print_error "Node.js is required but not installed"
    exit 1
fi

if ! command_exists npm; then
    print_error "npm is required but not installed"
    exit 1
fi

print_status "All prerequisites check out!"

# Function to generate a secure JWT secret
generate_jwt_secret() {
    if command_exists openssl; then
        openssl rand -base64 64 | tr -d "=+/" | cut -c1-64
    else
        # Fallback for systems without openssl
        node -e "console.log(require('crypto').randomBytes(64).toString('base64').slice(0,64))"
    fi
}

# Main deployment menu
while true; do
    echo
    echo "What would you like to do?"
    echo "1) Install dependencies and build project"
    echo "2) Create production environment files"
    echo "3) Generate secure JWT secret"
    echo "4) Test local build"
    echo "5) Deploy to Vercel (requires Vercel CLI)"
    echo "6) Show deployment URLs"
    echo "7) Exit"
    echo

    read -p "Enter your choice (1-7): " choice

    case $choice in
        1)
            print_step "Installing dependencies and building project..."
            npm run install:all
            npm run build:all
            print_status "Build completed successfully!"
            ;;
        2)
            print_step "Creating production environment files..."
            
            # Create backend .env.example if it doesn't exist
            if [ ! -f "backend/.env.example" ]; then
                print_status "Created backend/.env.example"
            fi
            
            # Create frontend production env
            if [ ! -f "frontend/.env.production" ]; then
                print_status "Created frontend/.env.production"
            fi
            
            print_warning "Remember to update the URLs in these files after deployment!"
            ;;
        3)
            print_step "Generating secure JWT secret..."
            JWT_SECRET=$(generate_jwt_secret)
            echo
            print_status "Generated JWT Secret:"
            echo "JWT_SECRET=\"$JWT_SECRET\""
            echo
            print_warning "Save this secret securely! You'll need it for your backend environment variables."
            echo
            ;;
        4)
            print_step "Testing local build..."
            
            # Test frontend build
            print_status "Building frontend..."
            cd frontend
            npm run build
            cd ..
            
            # Test backend build
            print_status "Building backend..."
            cd backend
            npm run build
            cd ..
            
            print_status "Local build test completed successfully!"
            ;;
        5)
            print_step "Deploying to Vercel..."
            
            if ! command_exists vercel; then
                print_error "Vercel CLI not found. Install it with: npm install -g vercel"
                continue
            fi
            
            print_status "Building project first..."
            npm run build:all
            
            print_status "Deploying to Vercel..."
            vercel --prod
            ;;
        6)
            print_step "Deployment URLs and Resources:"
            echo
            echo "📋 Deployment Dashboards:"
            echo "  • Render Dashboard: https://dashboard.render.com/"
            echo "  • Vercel Dashboard: https://vercel.com/dashboard"
            echo
            echo "📖 Documentation:"
            echo "  • Render Node.js Guide: https://docs.render.com/node-js"
            echo "  • Vercel Deployment Guide: https://vercel.com/docs/deployments/overview"
            echo
            echo "🔧 After Deployment:"
            echo "  • Update frontend/.env.production with your backend URL"
            echo "  • Update backend environment variables with your frontend URL"
            echo "  • Run database migrations using the production DATABASE_URL"
            echo
            ;;
        7)
            print_status "Goodbye! 🚀"
            exit 0
            ;;
        *)
            print_error "Invalid choice. Please enter a number between 1-7."
            ;;
    esac
done 