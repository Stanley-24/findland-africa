#!/bin/bash

# FindLand Africa - Development Startup Script
echo "🏗️ Starting FindLand Africa Development Environment..."

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8+ first."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ first."
    exit 1
fi

# Start backend
echo "🚀 Starting FastAPI backend..."
cd backend
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate
pip install -r requirements.txt

echo "🌐 Backend starting on http://localhost:8000"
echo "📚 API docs available at http://localhost:8000/docs"
python main.py &
BACKEND_PID=$!

# Start frontend
echo "🎨 Starting React frontend..."
cd ../frontend
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
fi

echo "🌐 Frontend starting on http://localhost:3000"
npm start &
FRONTEND_PID=$!

echo ""
echo "✅ FindLand Africa is running!"
echo "   Backend:  http://localhost:8000"
echo "   Frontend: http://localhost:3000"
echo "   API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop both services"

# Wait for user to stop
wait $BACKEND_PID $FRONTEND_PID
