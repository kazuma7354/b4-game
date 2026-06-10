@echo off
echo ====================================
echo Space Training - Local Server Start
echo ====================================
echo.

REM Python 3 を確認
python --version >nul 2>&1
if %errorlevel% equ 0 (
    echo Python found. Starting server...
    python -m http.server 8000
    goto end
)

REM Python がない場合は、python3 を試す
python3 --version >nul 2>&1
if %errorlevel% equ 0 (
    echo Python3 found. Starting server...
    python3 -m http.server 8000
    goto end
)

REM Python が見つからない場合
echo.
echo ERROR: Python is not installed or not in PATH
echo.
echo Solution:
echo 1. Install Python from https://www.python.org/downloads/
echo 2. Make sure to check "Add Python to PATH" during installation
echo.
pause

:end
echo.
echo Server stopped.
pause

