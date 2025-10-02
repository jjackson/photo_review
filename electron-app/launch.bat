@echo off
REM Photo Review Utility Electron App - Launch Script for Windows
REM This script sets up and runs the Electron app

echo ==================================
echo Photo Review Utility - Electron
echo ==================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo X Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo + Node.js found: %NODE_VERSION%

REM Check if Python is installed
where python >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo X Python is not installed!
    echo Please install Python 3.8 or higher
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('python --version') do set PYTHON_VERSION=%%i
echo + Python found: %PYTHON_VERSION%

REM Check if node_modules exists
if not exist "node_modules" (
    echo.
    echo Installing Node.js dependencies...
    call npm install
    echo + Node.js dependencies installed
)

REM Check if Python dependencies are installed
echo.
echo Checking Python dependencies...
python -c "import fastapi" 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Installing Python dependencies...
    python -m pip install -r src\backend\requirements.txt
    echo + Python dependencies installed
)

REM Start the app
echo.
echo Starting Photo Review Utility...
echo.
call npm start
