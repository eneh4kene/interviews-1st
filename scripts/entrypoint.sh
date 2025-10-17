#!/bin/bash

# n8n Docker Entrypoint Script
# This script handles the startup sequence for n8n with workflow import

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[ENTRYPOINT]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[ENTRYPOINT]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[ENTRYPOINT]${NC} $1"
}

log_error() {
    echo -e "${RED}[ENTRYPOINT]${NC} $1"
}

# Function to start n8n in background
start_n8n_background() {
    log_info "Starting n8n in background..."
    
    # Start n8n in background
    n8n start &
    local n8n_pid=$!
    
    # Store PID for cleanup
    echo $n8n_pid > /tmp/n8n.pid
    
    log_success "n8n started with PID: $n8n_pid"
    return 0
}

# Function to stop n8n
stop_n8n() {
    log_info "Stopping n8n..."
    
    if [ -f /tmp/n8n.pid ]; then
        local n8n_pid=$(cat /tmp/n8n.pid)
        if kill -0 $n8n_pid 2>/dev/null; then
            kill $n8n_pid
            log_success "n8n stopped"
        fi
        rm -f /tmp/n8n.pid
    fi
}

# Function to handle cleanup on exit
cleanup() {
    log_info "Received shutdown signal, cleaning up..."
    stop_n8n
    exit 0
}

# Set up signal handlers
trap cleanup SIGTERM SIGINT

# Main execution
main() {
    log_info "Starting n8n with workflow auto-import..."
    
    # Start n8n in background
    start_n8n_background
    
    # Wait a bit for n8n to initialize
    log_info "Waiting for n8n to initialize..."
    sleep 15
    
    # Import workflows
    log_info "Starting workflow import process..."
    if /home/node/scripts/import-workflows.sh; then
        log_success "Workflow import completed successfully"
    else
        log_warning "Workflow import had issues, but continuing..."
    fi
    
    # Wait for n8n process
    log_info "n8n is running. Waiting for process..."
    wait $(cat /tmp/n8n.pid)
}

# Run main function
main "$@"
