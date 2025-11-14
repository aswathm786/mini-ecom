#!/usr/bin/env bash

# Exit Maintenance Mode Script
# Removes application from maintenance mode

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_FILE="${PROJECT_ROOT}/storage/logs/ops.log"
MAINTENANCE_FLAG="${PROJECT_ROOT}/storage/.maintenance"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "Exiting maintenance mode..."

# Remove maintenance flag
if [ -f "$MAINTENANCE_FLAG" ]; then
    MAINTENANCE_INFO=$(cat "$MAINTENANCE_FLAG")
    rm -f "$MAINTENANCE_FLAG"
    log "Maintenance flag removed. Was active since: $MAINTENANCE_INFO"
else
    log "Maintenance flag not found. Application was not in maintenance mode."
fi

# Restart services
cd "$PROJECT_ROOT"
log "Restarting services..."
docker compose restart api frontend || log "WARNING: Failed to restart services"

# Health check
sleep 5
log "Running health check..."
if [ -f "$PROJECT_ROOT/scripts/healthcheck.sh" ]; then
    "$PROJECT_ROOT/scripts/healthcheck.sh" || log "WARNING: Health check failed"
fi

log "Maintenance mode exited. Services should be operational."

