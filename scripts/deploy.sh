#!/bin/bash

# InterviewsFirst Deployment Script
# SAFE: Only adds new deployment script, doesn't modify existing functionality

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-staging}
DOCKER_REGISTRY=${DOCKER_REGISTRY:-ghcr.io}
IMAGE_TAG=${IMAGE_TAG:-latest}
NAMESPACE=${NAMESPACE:-interviewsfirst-${ENVIRONMENT}}

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO:${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if kubectl is installed
    if ! command -v kubectl &> /dev/null; then
        error "kubectl is not installed or not in PATH"
        exit 1
    fi
    
    # Check if docker is installed
    if ! command -v docker &> /dev/null; then
        error "docker is not installed or not in PATH"
        exit 1
    fi
    
    # Check if we're connected to a cluster
    if ! kubectl cluster-info &> /dev/null; then
        error "Not connected to a Kubernetes cluster"
        exit 1
    fi
    
    log "Prerequisites check passed"
}

# Build Docker images
build_images() {
    log "Building Docker images..."
    
    # Build API image
    log "Building API image..."
    docker build -t ${DOCKER_REGISTRY}/interviewsfirst/api:${IMAGE_TAG} -f apps/api/Dockerfile .
    
    # Build Web image
    log "Building Web image..."
    docker build -t ${DOCKER_REGISTRY}/interviewsfirst/web:${IMAGE_TAG} -f apps/web/Dockerfile .
    
    log "Docker images built successfully"
}

# Push Docker images
push_images() {
    log "Pushing Docker images to registry..."
    
    # Push API image
    docker push ${DOCKER_REGISTRY}/interviewsfirst/api:${IMAGE_TAG}
    
    # Push Web image
    docker push ${DOCKER_REGISTRY}/interviewsfirst/web:${IMAGE_TAG}
    
    log "Docker images pushed successfully"
}

# Deploy to Kubernetes
deploy_k8s() {
    log "Deploying to Kubernetes (${ENVIRONMENT})..."
    
    # Create namespace if it doesn't exist
    kubectl create namespace ${NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -
    
    # Apply API deployment
    log "Deploying API..."
    kubectl apply -f k8s/${ENVIRONMENT}/api-deployment.yaml -n ${NAMESPACE}
    
    # Apply Web deployment
    log "Deploying Web..."
    kubectl apply -f k8s/${ENVIRONMENT}/web-deployment.yaml -n ${NAMESPACE}
    
    # Wait for deployments to be ready
    log "Waiting for deployments to be ready..."
    kubectl wait --for=condition=available --timeout=300s deployment/interviewsfirst-api -n ${NAMESPACE}
    kubectl wait --for=condition=available --timeout=300s deployment/interviewsfirst-web -n ${NAMESPACE}
    
    log "Kubernetes deployment completed"
}

# Run database migrations
run_migrations() {
    log "Running database migrations..."
    
    # Get API pod name
    API_POD=$(kubectl get pods -n ${NAMESPACE} -l app=interviewsfirst-api -o jsonpath='{.items[0].metadata.name}')
    
    if [ -z "$API_POD" ]; then
        error "API pod not found"
        exit 1
    fi
    
    # Run migrations
    kubectl exec -it ${API_POD} -n ${NAMESPACE} -- npm run migrate
    
    log "Database migrations completed"
}

# Run health checks
health_check() {
    log "Running health checks..."
    
    # Get service URLs
    API_SERVICE=$(kubectl get service interviewsfirst-api-service -n ${NAMESPACE} -o jsonpath='{.spec.clusterIP}')
    WEB_SERVICE=$(kubectl get service interviewsfirst-web-service -n ${NAMESPACE} -o jsonpath='{.spec.clusterIP}')
    
    # Check API health
    log "Checking API health..."
    kubectl run health-check --image=curlimages/curl --rm -i --restart=Never -- \
        curl -f http://${API_SERVICE}/health || {
        error "API health check failed"
        exit 1
    }
    
    # Check Web health
    log "Checking Web health..."
    kubectl run health-check --image=curlimages/curl --rm -i --restart=Never -- \
        curl -f http://${WEB_SERVICE}/ || {
        error "Web health check failed"
        exit 1
    }
    
    log "Health checks passed"
}

# Rollback deployment
rollback() {
    log "Rolling back deployment..."
    
    # Rollback API deployment
    kubectl rollout undo deployment/interviewsfirst-api -n ${NAMESPACE}
    
    # Rollback Web deployment
    kubectl rollout undo deployment/interviewsfirst-web -n ${NAMESPACE}
    
    # Wait for rollback to complete
    kubectl rollout status deployment/interviewsfirst-api -n ${NAMESPACE}
    kubectl rollout status deployment/interviewsfirst-web -n ${NAMESPACE}
    
    log "Rollback completed"
}

# Main deployment function
deploy() {
    log "Starting deployment to ${ENVIRONMENT} environment..."
    
    check_prerequisites
    build_images
    push_images
    deploy_k8s
    run_migrations
    health_check
    
    log "Deployment completed successfully!"
    info "Environment: ${ENVIRONMENT}"
    info "Namespace: ${NAMESPACE}"
    info "Image Tag: ${IMAGE_TAG}"
}

# CLI interface
case "${1:-deploy}" in
    deploy)
        deploy
        ;;
    rollback)
        rollback
        ;;
    health-check)
        health_check
        ;;
    *)
        echo "Usage: $0 {deploy|rollback|health-check} [environment]"
        echo "  deploy       - Deploy the application"
        echo "  rollback     - Rollback the last deployment"
        echo "  health-check - Run health checks"
        echo "  environment  - Target environment (staging|production)"
        exit 1
        ;;
esac
