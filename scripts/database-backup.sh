#!/bin/bash

# InterviewsFirst Database Backup Script
# This script creates automated backups of the PostgreSQL database

set -e

# Configuration
DB_URL="${DATABASE_URL:-postgresql://user:password@localhost:5432/interviewsfirst}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="interviewsfirst_backup_${TIMESTAMP}.sql"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILE}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

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

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

log "Starting database backup..."

# Check if database URL is set
if [ -z "$DATABASE_URL" ]; then
    error "DATABASE_URL environment variable is not set"
    exit 1
fi

# Create backup
log "Creating backup: $BACKUP_FILE"
if pg_dump "$DB_URL" > "$BACKUP_PATH"; then
    log "Backup created successfully: $BACKUP_PATH"
    
    # Compress backup
    log "Compressing backup..."
    gzip "$BACKUP_PATH"
    BACKUP_PATH="${BACKUP_PATH}.gz"
    log "Backup compressed: $BACKUP_PATH"
    
    # Get backup size
    BACKUP_SIZE=$(du -h "$BACKUP_PATH" | cut -f1)
    log "Backup size: $BACKUP_SIZE"
    
else
    error "Backup failed"
    exit 1
fi

# Clean up old backups
log "Cleaning up backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "interviewsfirst_backup_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete

# List current backups
log "Current backups:"
ls -lah "$BACKUP_DIR"/interviewsfirst_backup_*.sql.gz 2>/dev/null || log "No backups found"

log "Backup process completed successfully"

# Optional: Upload to cloud storage
if [ -n "$AWS_S3_BUCKET" ]; then
    log "Uploading backup to S3..."
    aws s3 cp "$BACKUP_PATH" "s3://$AWS_S3_BUCKET/database-backups/"
    log "Backup uploaded to S3"
fi

# Optional: Send notification
if [ -n "$SLACK_WEBHOOK" ]; then
    curl -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"✅ Database backup completed: $BACKUP_FILE ($BACKUP_SIZE)\"}" \
        "$SLACK_WEBHOOK"
fi
