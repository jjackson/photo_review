#!/bin/bash

# Photo Review Utility Electron App - Launch Script
# This script sets up and runs the Electron app

set -e

echo "=================================="
echo "Photo Review Utility - Electron"
echo "=================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed!"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js found: $(node --version)"

# Check if Python is installed
if command -v python3 &> /dev/null; then
    PYTHON_CMD=python3
elif command -v python &> /dev/null; then
    PYTHON_CMD=python
else
    echo "❌ Python is not installed!"
    echo "Please install Python 3.8 or higher"
    exit 1
fi

echo "✅ Python found: $($PYTHON_CMD --version)"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo ""
    echo "📦 Installing Node.js dependencies..."
    npm install
    echo "✅ Node.js dependencies installed"
fi

# Check if Python dependencies are installed
echo ""
echo "🐍 Checking Python dependencies..."
$PYTHON_CMD -c "import fastapi" 2>/dev/null || {
    echo "📦 Installing Python dependencies..."
    $PYTHON_CMD -m pip install -r src/backend/requirements.txt
    echo "✅ Python dependencies installed"
}

# Start the app
echo ""
echo "🚀 Starting Photo Review Utility..."
echo ""
npm start
