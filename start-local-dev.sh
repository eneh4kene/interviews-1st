#!/bin/bash

# Start local development with custom ports
echo "🚀 Starting Interview Me locally with custom ports..."

# Set environment variables for custom ports
export NEXT_PUBLIC_API_BASE_URL=http://localhost:3003
export PORT=3003
export NODE_ENV=development

echo "📡 API will run on: http://localhost:3003"
echo "🌐 Web will run on: http://localhost:3002"
echo ""

# Start API in background
echo "🔧 Starting API server..."
cd apps/api
npm run dev &
API_PID=$!

# Wait a moment for API to start
sleep 3

# Start Web in background
echo "🌐 Starting Web server..."
cd ../web
PORT=3002 npm run dev &
WEB_PID=$!

echo ""
echo "✅ Both servers started!"
echo "🌐 Web app: http://localhost:3002"
echo "🔧 API: http://localhost:3003"
echo "📊 Health check: http://localhost:3003/health"
echo ""
echo "Press Ctrl+C to stop both servers"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping servers..."
    kill $API_PID 2>/dev/null
    kill $WEB_PID 2>/dev/null
    echo "✅ Servers stopped"
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Wait for user to stop
wait


