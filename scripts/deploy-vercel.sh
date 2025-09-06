#!/bin/bash

# Vercel Deployment Script
# SAFE: Only adds deployment automation, doesn't modify existing functionality

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO:${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

# Check if Vercel CLI is installed
check_vercel_cli() {
    if ! command -v vercel &> /dev/null; then
        log "Installing Vercel CLI..."
        npm install -g vercel
    fi
}

# Deploy to Vercel
deploy_vercel() {
    log "Starting Vercel deployment..."
    
    cd apps/web
    
    # Check if already logged in
    if ! vercel whoami &> /dev/null; then
        log "Please log in to Vercel:"
        vercel login
    fi
    
    # Deploy
    log "Deploying to Vercel..."
    vercel --prod
    
    log "Vercel deployment completed!"
    info "Your frontend is now live on Vercel!"
}

# Main function
main() {
    log "🚀 Starting Vercel deployment process..."
    
    check_vercel_cli
    deploy_vercel
    
    log "✅ Deployment completed successfully!"
    info "Next steps:"
    echo "1. Deploy your API to Railway"
    echo "2. Update CORS_ORIGIN in Railway with your Vercel URL"
    echo "3. Update NEXT_PUBLIC_API_URL in Vercel with your Railway URL"
    echo "4. Test your deployment"
}

main "$@"
