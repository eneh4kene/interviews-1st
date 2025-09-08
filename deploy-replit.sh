#!/bin/bash

# Replit Deployment Script
echo "🚀 Deploying to Replit..."

# Navigate to web app directory
cd apps/web

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the application
echo "🔨 Building application..."
npm run build

# Start the application
echo "🚀 Starting application..."
npm start
