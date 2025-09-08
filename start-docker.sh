#!/bin/bash

# Start Docker containers with Neon database
echo "🚀 Starting Interview Me application with Docker..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo "Please create a .env file with your Neon database URL and other variables."
    echo "Example:"
    echo "DATABASE_URL=postgresql://username:password@your-neon-host/database"
    echo "JWT_SECRET=your-super-secret-jwt-key"
    exit 1
fi

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

# Start the containers
echo "🐳 Starting Docker containers..."
docker-compose -f docker-compose.neon.yml up -d

echo "✅ Application started!"
echo "🌐 Web app: http://localhost:3000"
echo "🔧 API: http://localhost:3001"
echo "📊 Health check: http://localhost:3001/health"

echo ""
echo "To view logs:"
echo "  docker-compose -f docker-compose.neon.yml logs -f"
echo ""
echo "To stop:"
echo "  docker-compose -f docker-compose.neon.yml down"
