#!/bin/bash

# Fix Permissions Script
# Sets correct ownership and permissions for storage and logs directories

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_FILE="${PROJECT_ROOT}/storage/logs/ops.log"

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Determine user (www-data for production, current user for dev)
if [ -n "$WWW_USER" ]; then
    CHOWN_USER="$WWW_USER"
elif id "www-data" &>/dev/null; then
    CHOWN_USER="www-data"
else
    CHOWN_USER=$(whoami)
fi

log "Fixing permissions for user: $CHOWN_USER"

# Storage directories
STORAGE_DIRS=(
    "$PROJECT_ROOT/storage"
    "$PROJECT_ROOT/storage/logs"
    "$PROJECT_ROOT/storage/uploads"
    "$PROJECT_ROOT/backend/storage"
    "$PROJECT_ROOT/backend/storage/logs"
    "$PROJECT_ROOT/backend/storage/uploads"
)

# Create directories if they don't exist
for DIR in "${STORAGE_DIRS[@]}"; do
    if [ ! -d "$DIR" ]; then
        log "Creating directory: $DIR"
        mkdir -p "$DIR"
    fi
done

# Set ownership
log "Setting ownership to $CHOWN_USER..."
for DIR in "${STORAGE_DIRS[@]}"; do
    if [ -d "$DIR" ]; then
        chown -R "$CHOWN_USER:$CHOWN_USER" "$DIR" || log "WARNING: Failed to chown $DIR (may need sudo)"
    fi
done

# Set permissions
log "Setting permissions..."
for DIR in "${STORAGE_DIRS[@]}"; do
    if [ -d "$DIR" ]; then
        chmod -R 755 "$DIR" || log "WARNING: Failed to chmod $DIR (may need sudo)"
    fi
done

# Make logs writable
log "Making log files writable..."
find "$PROJECT_ROOT" -type f -name "*.log" -exec chmod 644 {} \; 2>/dev/null || true

log "Permissions fixed successfully"

