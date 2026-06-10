@echo off
echo ====================================
echo Space Training - Local Server (Node.js)
echo ====================================
echo.

REM Node.js を確認
node --version >nul 2>&1
if %errorlevel% equ 0 (
    echo Node.js found. Checking for http-server...
    npx http-server -p 8000
) else (
    echo.
    echo ERROR: Node.js is not installed
    echo.
    echo Solution:
    echo 1. Install Node.js from https://nodejs.org/
    echo 2. Run this script again
    echo.
    pause
)

echo.
echo Server stopped.
pause
