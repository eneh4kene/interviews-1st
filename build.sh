#!/bin/bash

# Build script for Render.com deployment
# Ensures packages are built in correct dependency order

set -e

echo "🚀 Starting Render build process..."

# Detect package manager
if [ -f "yarn.lock" ]; then
    PKG_MANAGER="yarn"
    echo "📦 Using Yarn package manager"
else
    PKG_MANAGER="npm"
    echo "📦 Using npm package manager"
fi

# Install dependencies
echo "📦 Installing dependencies..."
if [ "$PKG_MANAGER" = "yarn" ]; then
    yarn install
else
    npm ci
fi

# Build packages in correct order
echo "🔨 Building shared packages..."

# Build types package first
echo "  → Building @interview-me/types..."
if [ "$PKG_MANAGER" = "yarn" ]; then
    yarn workspace @interview-me/types build
else
    npm run build --workspace=@interview-me/types
fi

# Verify types package was built
if [ ! -d "packages/types/dist" ]; then
    echo "❌ Types package not built properly, trying alternative approach..."
    cd packages/types
    if [ "$PKG_MANAGER" = "yarn" ]; then
        yarn build
    else
        npm run build
    fi
    cd ../..
fi

# Build UI package second
echo "  → Building @interview-me/ui..."
if [ "$PKG_MANAGER" = "yarn" ]; then
    yarn workspace @interview-me/ui build
else
    npm run build --workspace=@interview-me/ui
fi

# Build API last
echo "  → Building @interview-me/api..."
if [ "$PKG_MANAGER" = "yarn" ]; then
    yarn workspace @interview-me/api build
else
    npm run build --workspace=@interview-me/api
fi

echo "✅ Build completed successfully!"
