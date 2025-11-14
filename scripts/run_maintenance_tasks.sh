#!/usr/bin/env bash

# Maintenance Tasks Script
# Runs routine maintenance tasks

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_FILE="${PROJECT_ROOT}/storage/logs/ops.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Load environment variables
if [ -f "$PROJECT_ROOT/.env" ]; then
    export $(cat "$PROJECT_ROOT/.env" | grep -v '^#' | xargs)
fi

log "Starting maintenance tasks..."

cd "$PROJECT_ROOT"

# 1. Clean Docker system
log "Cleaning Docker system..."
docker system prune -f --volumes 2>/dev/null || log "WARNING: Docker cleanup failed"

# 2. Rotate logs
if [ -f "$PROJECT_ROOT/scripts/logs_collect.sh" ]; then
    log "Rotating logs..."
    "$PROJECT_ROOT/scripts/logs_collect.sh" || log "WARNING: Log rotation failed"
fi

# 3. Rotate backups
if [ -f "$PROJECT_ROOT/scripts/rotate_backups.sh" ]; then
    log "Rotating backups..."
    "$PROJECT_ROOT/scripts/rotate_backups.sh" || log "WARNING: Backup rotation failed"
fi

# 4. Check disk space
if [ -f "$PROJECT_ROOT/scripts/disk_alert.sh" ]; then
    log "Checking disk space..."
    "$PROJECT_ROOT/scripts/disk_alert.sh" || log "WARNING: Disk check failed"
fi

# 5. Update Docker images (optional)
if [ "${UPDATE_IMAGES:-false}" = "true" ]; then
    log "Updating Docker images..."
    docker compose pull || log "WARNING: Failed to update images"
fi

# 6. Run database maintenance (vacuum, optimize)
log "Running database maintenance..."
if docker compose exec -T mongo mongosh "$MONGO_URI" --eval "db.runCommand({compact: 'users'})" > /dev/null 2>&1; then
    log "Database maintenance completed"
else
    log "WARNING: Database maintenance failed or not needed"
fi

# 7. Security audit
if [ -f "$PROJECT_ROOT/scripts/sec_audit.sh" ]; then
    log "Running security audit..."
    "$PROJECT_ROOT/scripts/sec_audit.sh" || log "WARNING: Security audit failed"
fi

log "Maintenance tasks completed"

