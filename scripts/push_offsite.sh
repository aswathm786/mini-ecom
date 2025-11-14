#!/usr/bin/env bash

# Push Offsite Backup Script
# Pushes encrypted backups to remote server via rsync/SCP

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_FILE="${PROJECT_ROOT}/storage/logs/backups.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" | tee -a "$LOG_FILE" >&2
    exit 1
}

# Load environment variables
if [ -f "$PROJECT_ROOT/.env" ]; then
    export $(cat "$PROJECT_ROOT/.env" | grep -v '^#' | xargs)
fi

BACKUP_DIR="${BACKUP_DIR:-${PROJECT_ROOT}/storage/backups}"
OFFSITE_HOST="${OFFSITE_HOST:-}"
OFFSITE_USER="${OFFSITE_USER:-root}"
OFFSITE_PATH="${OFFSITE_PATH:-/backups/miniecom}"
OFFSITE_SSH_KEY="${OFFSITE_SSH_KEY:-$HOME/.ssh/id_rsa}"

if [ -z "$OFFSITE_HOST" ]; then
    error "OFFSITE_HOST not set in .env. Please configure offsite backup destination."
fi

log "Starting offsite backup push to $OFFSITE_USER@$OFFSITE_HOST:$OFFSITE_PATH"

# Check if rsync is available
if ! command -v rsync &> /dev/null; then
    error "rsync not found. Please install rsync."
fi

# Check SSH key
if [ ! -f "$OFFSITE_SSH_KEY" ]; then
    log "WARNING: SSH key not found: $OFFSITE_SSH_KEY"
    log "Attempting to use default SSH key..."
fi

# Test SSH connection
log "Testing SSH connection..."
if ssh -i "$OFFSITE_SSH_KEY" -o ConnectTimeout=10 -o BatchMode=yes "$OFFSITE_USER@$OFFSITE_HOST" "echo 'Connection successful'" &>/dev/null; then
    log "SSH connection successful"
else
    error "SSH connection failed. Please check credentials and network connectivity."
fi

# Create remote directory
log "Creating remote backup directory..."
ssh -i "$OFFSITE_SSH_KEY" "$OFFSITE_USER@$OFFSITE_HOST" "mkdir -p $OFFSITE_PATH" || error "Failed to create remote directory"

# Push encrypted backups only
log "Pushing encrypted backups..."
ENCRYPTED_BACKUPS=$(find "$BACKUP_DIR" -type f -name "*.tar.gz.enc" -mtime -1)

if [ -z "$ENCRYPTED_BACKUPS" ]; then
    log "No recent encrypted backups found. Skipping offsite push."
    exit 0
fi

PUSHED_COUNT=0
for backup in $ENCRYPTED_BACKUPS; do
    BACKUP_NAME=$(basename "$backup")
    log "Pushing: $BACKUP_NAME"
    
    if rsync -avz -e "ssh -i $OFFSITE_SSH_KEY" "$backup" "$OFFSITE_USER@$OFFSITE_HOST:$OFFSITE_PATH/"; then
        log "Successfully pushed: $BACKUP_NAME"
        PUSHED_COUNT=$((PUSHED_COUNT + 1))
    else
        log "WARNING: Failed to push: $BACKUP_NAME"
    fi
done

log "Offsite backup push completed. Pushed $PUSHED_COUNT backup(s) to $OFFSITE_HOST"

# Verify remote backups
log "Verifying remote backups..."
REMOTE_BACKUPS=$(ssh -i "$OFFSITE_SSH_KEY" "$OFFSITE_USER@$OFFSITE_HOST" "ls -1 $OFFSITE_PATH/*.enc 2>/dev/null | wc -l" || echo "0")
log "Remote backup count: $REMOTE_BACKUPS"

