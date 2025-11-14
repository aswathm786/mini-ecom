#!/usr/bin/env bash

# Enter Maintenance Mode Script
# Places application in maintenance mode

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_FILE="${PROJECT_ROOT}/storage/logs/ops.log"
MAINTENANCE_FLAG="${PROJECT_ROOT}/storage/.maintenance"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Load environment variables
if [ -f "$PROJECT_ROOT/.env" ]; then
    export $(cat "$PROJECT_ROOT/.env" | grep -v '^#' | xargs)
fi

REASON="${1:-Scheduled maintenance}"

log "Entering maintenance mode: $REASON"

# Create maintenance flag
echo "$(date -Iseconds)|$REASON" > "$MAINTENANCE_FLAG"
log "Maintenance flag created: $MAINTENANCE_FLAG"

# Update nginx to show maintenance page (if nginx container exists)
cd "$PROJECT_ROOT"
if docker compose ps nginx 2>/dev/null | grep -q "running"; then
    log "Nginx container detected. Consider updating nginx config to show maintenance page."
    # TODO: Update nginx config or create maintenance page
fi

# Optionally stop services (commented out by default)
# log "Stopping services..."
# docker compose stop api frontend || log "WARNING: Failed to stop services"

log "Maintenance mode enabled. Reason: $REASON"
log "To exit maintenance mode, run: ./scripts/exit_maintenance.sh"

