#!/usr/bin/env bash

# Backup Rotation Script
# Implements retention policy: daily 14d, weekly 12w, monthly 12m

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_FILE="${PROJECT_ROOT}/storage/logs/backups.log"

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Load environment variables
if [ -f "$PROJECT_ROOT/.env" ]; then
    export $(cat "$PROJECT_ROOT/.env" | grep -v '^#' | xargs)
fi

BACKUP_DIR="${BACKUP_DIR:-${PROJECT_ROOT}/storage/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
RETENTION_WEEKS="${BACKUP_RETENTION_WEEKS:-12}"
RETENTION_MONTHS="${BACKUP_RETENTION_MONTHS:-12}"

if [ ! -d "$BACKUP_DIR" ]; then
    log "Backup directory not found: $BACKUP_DIR"
    exit 0
fi

log "Starting backup rotation..."

# Remove daily backups older than retention period
log "Removing daily backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -type f -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -type f -name "*.tar.gz.enc" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -type d -name "20*" -mtime +$RETENTION_DAYS -exec rm -rf {} + 2>/dev/null || true

# Keep weekly backups (first backup of each week) for RETENTION_WEEKS weeks
log "Keeping weekly backups for $RETENTION_WEEKS weeks..."
WEEKS_AGO=$((RETENTION_WEEKS * 7))
find "$BACKUP_DIR" -type f \( -name "*.tar.gz" -o -name "*.tar.gz.enc" \) -mtime +$WEEKS_AGO | while read -r backup; do
    BACKUP_DATE=$(basename "$backup" | cut -d'_' -f1)
    BACKUP_WEEK=$(date -d "$BACKUP_DATE" +%Y-W%V 2>/dev/null || echo "")
    
    # Check if this is the first backup of the week
    FIRST_OF_WEEK=$(find "$BACKUP_DIR" -type f \( -name "*.tar.gz" -o -name "*.tar.gz.enc" \) -name "${BACKUP_DATE}*" | head -1)
    
    if [ "$backup" != "$FIRST_OF_WEEK" ]; then
        log "Removing non-weekly backup: $(basename "$backup")"
        rm -f "$backup"
    fi
done

# Keep monthly backups (first backup of each month) for RETENTION_MONTHS months
log "Keeping monthly backups for $RETENTION_MONTHS months..."
MONTHS_AGO=$((RETENTION_MONTHS * 30))
find "$BACKUP_DIR" -type f \( -name "*.tar.gz" -o -name "*.tar.gz.enc" \) -mtime +$MONTHS_AGO | while read -r backup; do
    BACKUP_DATE=$(basename "$backup" | cut -d'_' -f1)
    BACKUP_MONTH=$(date -d "$BACKUP_DATE" +%Y-%m 2>/dev/null || echo "")
    
    # Check if this is the first backup of the month
    FIRST_OF_MONTH=$(find "$BACKUP_DIR" -type f \( -name "*.tar.gz" -o -name "*.tar.gz.enc" \) -name "${BACKUP_DATE:0:6}*" | head -1)
    
    if [ "$backup" != "$FIRST_OF_MONTH" ]; then
        log "Removing non-monthly backup: $(basename "$backup")"
        rm -f "$backup"
    fi
done

# Clean up empty directories
find "$BACKUP_DIR" -type d -empty -delete 2>/dev/null || true

# Report backup directory size
BACKUP_SIZE=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1 || echo "0")
BACKUP_COUNT=$(find "$BACKUP_DIR" -type f \( -name "*.tar.gz" -o -name "*.tar.gz.enc" \) | wc -l)

log "Backup rotation completed. Total backups: $BACKUP_COUNT, Total size: $BACKUP_SIZE"

