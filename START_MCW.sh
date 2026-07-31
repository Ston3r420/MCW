#!/bin/bash
echo "======================================================="
echo "   Starting Marbles Championship Wrestling (MCW)..."
echo "======================================================="
cd "$(dirname "$0")"

if [ ! -f ".env" ] && [ -f ".env.example" ]; then
    echo "[Setup] Creating default .env configuration file..."
    cp .env.example .env
fi

if [ ! -d "node_modules" ]; then
    echo "[1/3] First-time setup: Installing dependencies..."
    npm install
fi

if [ ! -d "backend/node_modules" ]; then
    echo "[2/3] Installing backend dependencies..."
    npm install --prefix backend
fi

echo "[3/3] Generating database client..."
npx prisma generate --schema=backend/prisma/schema.prisma

echo "======================================================="
echo "   Launching MCW Application..."
echo "======================================================="
npm start

