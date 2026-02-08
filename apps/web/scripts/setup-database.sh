#!/bin/bash

# Database Setup Script for bills.bio
# This script automates the entire database setup process

set -e  # Exit on error

echo "🚀 bills.bio Database Setup"
echo "=============================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ PostgreSQL is not installed${NC}"
    echo ""
    echo "Install PostgreSQL:"
    echo "  macOS:   brew install postgresql@16"
    echo "  Ubuntu:  sudo apt install postgresql"
    echo "  Windows: Download from https://www.postgresql.org/download/"
    exit 1
fi

echo -e "${GREEN}✅ PostgreSQL found${NC}"

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo ""
    echo -e "${YELLOW}📝 Creating .env.local from .env.example...${NC}"
    cp .env.example .env.local
    
    # Set default DATABASE_URL
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' 's|DATABASE_URL=.*|DATABASE_URL=postgresql://localhost:5432/bills_bio|' .env.local
    else
        # Linux
        sed -i 's|DATABASE_URL=.*|DATABASE_URL=postgresql://localhost:5432/bills_bio|' .env.local
    fi
    
    echo -e "${GREEN}✅ Created .env.local${NC}"
fi

# Load DATABASE_URL from .env.local
export $(grep -v '^#' .env.local | xargs)

# Extract database name from DATABASE_URL
DB_NAME=$(echo $DATABASE_URL | grep -oP '(?<=\/)[^\/]+$' || echo "bills_bio")

echo ""
echo "🗄️  Database: $DB_NAME"

# Check if database exists
if psql -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
    echo -e "${YELLOW}⚠️  Database '$DB_NAME' already exists${NC}"
    read -p "Do you want to drop and recreate it? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🗑️  Dropping existing database..."
        dropdb $DB_NAME || true
        echo "📦 Creating database..."
        createdb $DB_NAME
        echo -e "${GREEN}✅ Database recreated${NC}"
    fi
else
    echo "📦 Creating database..."
    createdb $DB_NAME
    echo -e "${GREEN}✅ Database created${NC}"
fi

# Install npm dependencies if needed
if [ ! -d "node_modules" ]; then
    echo ""
    echo "📦 Installing npm dependencies..."
    npm install
fi

# Run schema initialization
echo ""
echo "🔧 Initializing database schema..."
psql $DATABASE_URL -f scripts/schema-6-tables.sql
echo -e "${GREEN}✅ Schema initialized${NC}"

# Run seed script
echo ""
echo "🌱 Seeding Bill's profile..."
npm run db:seed
echo -e "${GREEN}✅ Profile seeded${NC}"

# Verify setup
echo ""
echo "🔍 Verifying setup..."
PROFILE_COUNT=$(psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM profiles WHERE type = 'owner';" | xargs)

echo "   Owner profiles: $PROFILE_COUNT"

echo ""
echo -e "${GREEN}🎉 Database setup complete!${NC}"
echo ""
echo "Next steps:"
echo "  1. Start the dev server:  npm run dev"
echo "  2. View Bill's profile:   curl http://localhost:3002/api/profiles/owner"
echo "  3. View all profiles:     curl http://localhost:3002/api/profiles"
echo ""
echo "Dashboard will be available at: http://localhost:3002/dashboard"
