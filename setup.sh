#!/bin/bash

echo "🚀 AI Live Chat Agent - Setup Script"
echo "===================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if MongoDB is running
echo -e "${BLUE}Checking MongoDB...${NC}"
if ! command -v mongod &> /dev/null; then
    echo -e "${RED}❌ MongoDB not found. Please install MongoDB first.${NC}"
    echo "Visit: https://www.mongodb.com/try/download/community"
    exit 1
else
    echo -e "${GREEN}✓ MongoDB found${NC}"
fi

# Check if Node.js is installed
echo -e "${BLUE}Checking Node.js...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found. Please install Node.js first.${NC}"
    echo "Visit: https://nodejs.org/"
    exit 1
else
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}✓ Node.js ${NODE_VERSION} found${NC}"
fi

# Setup Backend
echo ""
echo -e "${BLUE}Setting up Backend...${NC}"
cd backend

if [ ! -f ".env" ]; then
    echo "Creating .env file..."
    cp .env.exmaple .env
    echo -e "${RED}⚠️  Please edit backend/.env and add your GEMINI_API_KEY${NC}"
fi

echo "Installing backend dependencies..."
npm install

cd ..

# Setup Frontend
echo ""
echo -e "${BLUE}Setting up Frontend...${NC}"
cd frontend

echo "Installing frontend dependencies..."
npm install

cd ..

# Final Instructions
echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo "Next steps:"
echo ""
echo "1. Edit backend/.env and add your GEMINI_API_KEY"
echo "   Get one at: https://makersuite.google.com/app/apikey"
echo ""
echo "2. Start MongoDB:"
echo "   mongod"
echo ""
echo "3. Start Backend (in a new terminal):"
echo "   cd backend && npm run dev"
echo ""
echo "4. Start Frontend (in another terminal):"
echo "   cd frontend && npm run dev"
echo ""
echo "5. Open browser to http://localhost:5173"
echo ""
echo -e "${GREEN}Happy chatting! 🎉${NC}"
