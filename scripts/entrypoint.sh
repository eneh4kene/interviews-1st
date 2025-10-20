#!/bin/bash

# Simple n8n Docker Entrypoint Script
# This script starts n8n and optionally imports workflows

set -e

echo "[ENTRYPOINT] Starting n8n..."

# Run workflow import in background (non-blocking)
if [ -f "/home/node/scripts/import-workflows.sh" ]; then
    echo "[ENTRYPOINT] Starting workflow import in background..."
    /home/node/scripts/import-workflows.sh &
fi

# Start n8n (this will be the main process)
echo "[ENTRYPOINT] Starting n8n..."
exec "$@"
