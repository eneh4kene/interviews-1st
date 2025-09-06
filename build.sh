#!/bin/bash

# Build script for Render.com deployment
# Ensures packages are built in correct dependency order

set -e

echo "🚀 Starting Render build process..."

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Build packages in correct order
echo "🔨 Building shared packages..."
npm run build --workspace=@interview-me/types
npm run build --workspace=@interview-me/ui

# Build API last
echo "🔨 Building API..."
npm run build --workspace=@interview-me/api

echo "✅ Build completed successfully!"
