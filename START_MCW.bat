@echo off
title Marbles Championship Wrestling (MCW)
echo =======================================================
echo    Starting Marbles Championship Wrestling (MCW)...
echo =======================================================
echo.

cd /d "%~dp0"

IF NOT EXIST ".env" (
    IF EXIST ".env.example" (
        echo [Setup] Creating default .env configuration file...
        copy .env.example .env >nul
    )
)

IF NOT EXIST "node_modules" (
    echo [1/3] First-time setup: Installing dependencies...
    call npm install
)

IF NOT EXIST "backend\node_modules" (
    echo [2/3] Installing backend dependencies...
    call npm install --prefix backend
)

echo [3/3] Generating database client...
call npx prisma generate --schema=backend/prisma/schema.prisma

echo.
echo =======================================================
echo    Launching MCW Application...
echo =======================================================
echo.
npm start
pause

