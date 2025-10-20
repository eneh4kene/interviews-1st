#!/bin/bash

# n8n Workflow Import Script
# This script imports workflows from JSON files into n8n using the REST API
# It uses "hybrid" deployment - only imports if workflow doesn't exist

set -e

# Configuration
N8N_HOST="${N8N_HOST:-0.0.0.0}"
N8N_PORT="${N8N_PORT:-5678}"
N8N_PROTOCOL="${N8N_PROTOCOL:-http}"
N8N_USER="${N8N_BASIC_AUTH_USER:-admin@example.com}"
N8N_PASSWORD="${N8N_BASIC_AUTH_PASSWORD:-admin}"

# API endpoints
BASE_URL="${N8N_PROTOCOL}://${N8N_HOST}:${N8N_PORT}"
LOGIN_URL="${BASE_URL}/rest/login"
WORKFLOWS_URL="${BASE_URL}/rest/workflows"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Wait for n8n to be ready
wait_for_n8n() {
    log_info "Waiting for n8n to be ready..."
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        # Try multiple endpoints
        if curl -s -f "${BASE_URL}/healthz" > /dev/null 2>&1 || \
           curl -s -f "${BASE_URL}/" > /dev/null 2>&1 || \
           curl -s -f "${BASE_URL}/rest/login" > /dev/null 2>&1; then
            log_success "n8n is ready!"
            return 0
        fi
        
        log_info "Attempt $attempt/$max_attempts - n8n not ready yet, waiting 10 seconds..."
        sleep 10
        attempt=$((attempt + 1))
    done
    
    log_error "n8n failed to start within expected time"
    return 1
}

# Get authentication token
get_auth_token() {
    log_info "Authenticating with n8n..."
    
    local response=$(curl -s -X POST "${LOGIN_URL}" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"${N8N_USER}\",\"password\":\"${N8N_PASSWORD}\"}")
    
    if [ $? -ne 0 ]; then
        log_error "Failed to authenticate with n8n"
        return 1
    fi
    
    # Extract token from response
    local token=$(echo "$response" | jq -r '.data.token // empty')
    
    if [ -z "$token" ] || [ "$token" = "null" ]; then
        log_error "Failed to get authentication token"
        log_error "Response: $response"
        return 1
    fi
    
    echo "$token"
}

# Get existing workflows
get_existing_workflows() {
    local token="$1"
    
    curl -s -X GET "${WORKFLOWS_URL}" \
        -H "Authorization: Bearer ${token}" \
        -H "Content-Type: application/json" | \
    jq -r '.data[] | "\(.id):\(.name)"'
}

# Import a single workflow
import_workflow() {
    local file_path="$1"
    local token="$2"
    local existing_workflows="$3"
    
    local filename=$(basename "$file_path" .json)
    log_info "Processing workflow: $filename"
    
    # Check if workflow already exists
    local existing_id=$(echo "$existing_workflows" | grep ":$filename$" | cut -d: -f1)
    
    if [ -n "$existing_id" ]; then
        log_warning "Workflow '$filename' already exists (ID: $existing_id), skipping import"
        return 0
    fi
    
    # Read and validate workflow JSON
    if ! jq empty "$file_path" 2>/dev/null; then
        log_error "Invalid JSON in $file_path"
        return 1
    fi
    
    # Import workflow
    local response=$(curl -s -X POST "${WORKFLOWS_URL}" \
        -H "Authorization: Bearer ${token}" \
        -H "Content-Type: application/json" \
        -d @"$file_path")
    
    if [ $? -ne 0 ]; then
        log_error "Failed to import workflow $filename"
        return 1
    fi
    
    # Check if import was successful
    local workflow_id=$(echo "$response" | jq -r '.data.id // empty')
    
    if [ -n "$workflow_id" ] && [ "$workflow_id" != "null" ]; then
        log_success "Successfully imported workflow '$filename' (ID: $workflow_id)"
        return 0
    else
        log_error "Failed to import workflow $filename"
        log_error "Response: $response"
        return 1
    fi
}

# Main function
main() {
    log_info "Starting n8n workflow import process..."
    
    # Check if workflows directory exists
    if [ ! -d "/home/node/workflows" ]; then
        log_warning "Workflows directory not found, skipping import"
        return 0
    fi
    
    # Wait for n8n to be ready
    if ! wait_for_n8n; then
        log_error "n8n is not ready, aborting workflow import"
        return 1
    fi
    
    # Get authentication token
    local token
    token=$(get_auth_token)
    if [ $? -ne 0 ]; then
        log_error "Failed to authenticate, aborting workflow import"
        return 1
    fi
    
    # Get existing workflows
    log_info "Fetching existing workflows..."
    local existing_workflows
    existing_workflows=$(get_existing_workflows "$token")
    
    # Import workflows
    local imported_count=0
    local failed_count=0
    
    for workflow_file in /home/node/workflows/*.json; do
        if [ -f "$workflow_file" ]; then
            if import_workflow "$workflow_file" "$token" "$existing_workflows"; then
                imported_count=$((imported_count + 1))
            else
                failed_count=$((failed_count + 1))
            fi
        fi
    done
    
    # Summary
    log_info "Workflow import completed:"
    log_success "Imported: $imported_count workflows"
    if [ $failed_count -gt 0 ]; then
        log_error "Failed: $failed_count workflows"
        return 1
    fi
    
    log_success "All workflows processed successfully!"
    return 0
}

# Run main function
main "$@"
