@echo off
chcp 65001 >nul
title AI Prompt Generator

echo ============================================
echo   AI Prompt Generator
echo ============================================
echo.

cd /d %~dp0

set "NODE_EXE="
if exist "C:\nvm4w\nodejs\node.exe" set "NODE_EXE=C:\nvm4w\nodejs\node.exe"
if exist "C:\Program Files\nodejs\node.exe" set "NODE_EXE=C:\Program Files\nodejs\node.exe"

if "%NODE_EXE%"=="" (
    for %%X in (node.exe) do set "NODE_EXE=%%~$PATH:X"
)

if "%NODE_EXE%"=="" (
    echo [ERROR] Node.js not found.
    echo Install from: https://nodejs.org/
    pause
    exit /b 1
)

echo [Node] %NODE_EXE%
"%NODE_EXE%" -v
echo.

if not exist node_modules (
    echo [1/3] Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo [ERROR] npm install failed
        pause
        exit /b 1
    )
    echo [OK] Dependencies installed
    echo.
) else (
    echo [1/3] Dependencies ready
)

if not exist .env.local (
    echo [2/3] Creating .env.local...
    if exist .env.local.example (
        copy .env.local.example .env.local
        echo [INFO] Please edit .env.local and add your API Key
    ) else (
        echo [WARN] .env.local.example not found
    )
) else (
    echo [2/3] .env.local exists
)

echo.
echo [3/3] Starting dev server...
echo ============================================
echo   Open: http://localhost:3000
echo   Press Ctrl+C to stop
echo ============================================
echo.

npm run dev

if errorlevel 1 (
    echo.
    echo [ERROR] Failed to start
    pause
    exit /b 1
)
