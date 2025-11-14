#!/usr/bin/env bash

# Restore Script
# Interactive restore from backup with confirmation and dry-run options

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
MONGO_URI="${MONGO_URI:-mongodb://admin:changeme@localhost:27017/miniecom?authSource=admin}"
DRY_RUN=false
CONFIRM=false
BACKUP_FILE=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --backup)
            BACKUP_FILE="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --confirm)
            CONFIRM=true
            shift
            ;;
        *)
            echo "Usage: $0 --backup <backup_file> [--dry-run] [--confirm]"
            exit 1
            ;;
    esac
done

if [ -z "$BACKUP_FILE" ]; then
    echo "Available backups:"
    ls -lh "$BACKUP_DIR"/*.tar.gz* 2>/dev/null | awk '{print $9, "(" $5 ")"}'
    echo ""
    read -p "Enter backup file path: " BACKUP_FILE
fi

if [ ! -f "$BACKUP_FILE" ]; then
    error "Backup file not found: $BACKUP_FILE"
fi

log "Starting restore from: $BACKUP_FILE"

# Check if encrypted
if [[ "$BACKUP_FILE" == *.enc ]]; then
    log "Backup is encrypted. Decrypting..."
    DECRYPTED_FILE="${BACKUP_FILE%.enc}"
    if [ -f "$PROJECT_ROOT/scripts/decrypt_backup.sh" ]; then
        "$PROJECT_ROOT/scripts/decrypt_backup.sh" "$BACKUP_FILE" "$DECRYPTED_FILE" || error "Decryption failed"
        BACKUP_FILE="$DECRYPTED_FILE"
    else
        error "decrypt_backup.sh not found"
    fi
fi

# Extract backup
RESTORE_TEMP="${PROJECT_ROOT}/storage/restore_temp_$$"
mkdir -p "$RESTORE_TEMP"

log "Extracting backup..."
if [[ "$BACKUP_FILE" == *.tar.gz ]]; then
    tar -xzf "$BACKUP_FILE" -C "$RESTORE_TEMP" || error "Failed to extract backup"
    BACKUP_CONTENT=$(find "$RESTORE_TEMP" -mindepth 1 -maxdepth 1 -type d | head -1)
else
    BACKUP_CONTENT="$RESTORE_TEMP"
    cp -r "$BACKUP_FILE" "$BACKUP_CONTENT" 2>/dev/null || error "Failed to copy backup"
fi

log "Backup extracted to: $BACKUP_CONTENT"

# Verify backup contents
if [ ! -f "$BACKUP_CONTENT/mongo.archive.gz" ] && [ ! -f "$BACKUP_CONTENT/mongo.archive" ]; then
    error "Invalid backup: MongoDB archive not found"
fi

# Show restore plan
echo ""
echo "=== RESTORE PLAN ==="
echo "Backup: $BACKUP_FILE"
echo "Components to restore:"
[ -f "$BACKUP_CONTENT/mongo.archive.gz" ] && echo "  - MongoDB database (compressed)"
[ -f "$BACKUP_CONTENT/mongo.archive" ] && echo "  - MongoDB database"
[ -d "$BACKUP_CONTENT/uploads" ] && echo "  - Uploads directory"
[ -f "$BACKUP_CONTENT/.env" ] && echo "  - Configuration (.env)"
echo ""

if [ "$DRY_RUN" = true ]; then
    log "DRY RUN: Would restore the above components"
    rm -rf "$RESTORE_TEMP"
    exit 0
fi

# Require confirmation
if [ "$CONFIRM" != true ]; then
    echo "WARNING: This will overwrite existing data!"
    read -p "Type 'RESTORE' to confirm: " confirmation
    if [ "$confirmation" != "RESTORE" ]; then
        log "Restore cancelled by user"
        rm -rf "$RESTORE_TEMP"
        exit 0
    fi
fi

log "Starting restore process..."

# Restore MongoDB
log "Restoring MongoDB..."
if [ -f "$BACKUP_CONTENT/mongo.archive.gz" ]; then
    if [ "$DRY_RUN" != true ]; then
        if mongorestore --uri="$MONGO_URI" --archive="$BACKUP_CONTENT/mongo.archive.gz" --gzip --drop; then
            log "MongoDB restore completed"
        else
            error "MongoDB restore failed"
        fi
    else
        log "DRY RUN: Would restore MongoDB from $BACKUP_CONTENT/mongo.archive.gz"
    fi
elif [ -f "$BACKUP_CONTENT/mongo.archive" ]; then
    if [ "$DRY_RUN" != true ]; then
        if mongorestore --uri="$MONGO_URI" --archive="$BACKUP_CONTENT/mongo.archive" --drop; then
            log "MongoDB restore completed"
        else
            error "MongoDB restore failed"
        fi
    else
        log "DRY RUN: Would restore MongoDB from $BACKUP_CONTENT/mongo.archive"
    fi
fi

# Restore uploads
if [ -d "$BACKUP_CONTENT/uploads" ]; then
    log "Restoring uploads..."
    UPLOADS_DEST="${PROJECT_ROOT}/storage/uploads"
    mkdir -p "$UPLOADS_DEST"
    
    if [ "$DRY_RUN" != true ]; then
        rsync -av --delete "$BACKUP_CONTENT/uploads/" "$UPLOADS_DEST/" || error "Failed to restore uploads"
        log "Uploads restore completed"
    else
        log "DRY RUN: Would restore uploads to $UPLOADS_DEST"
    fi
fi

# Restore configuration (with warning)
if [ -f "$BACKUP_CONTENT/.env" ]; then
    log "WARNING: Configuration file found in backup"
    read -p "Restore .env file? (y/N): " restore_env
    if [ "$restore_env" = "y" ] || [ "$restore_env" = "Y" ]; then
        if [ "$DRY_RUN" != true ]; then
            cp "$BACKUP_CONTENT/.env" "$PROJECT_ROOT/.env.backup.$(date +%Y%m%d_%H%M%S)"
            cp "$BACKUP_CONTENT/.env" "$PROJECT_ROOT/.env"
            log "Configuration restored (backup saved)"
        else
            log "DRY RUN: Would restore .env file"
        fi
    else
        log "Skipping .env restore"
    fi
fi

# Cleanup
rm -rf "$RESTORE_TEMP"

log "Restore completed successfully"

# Verification steps
echo ""
echo "=== VERIFICATION STEPS ==="
echo "1. Check MongoDB: mongosh \"$MONGO_URI\" --eval 'db.stats()'"
echo "2. Check uploads: ls -la $PROJECT_ROOT/storage/uploads"
echo "3. Restart services: docker compose restart"
echo "4. Health check: ./scripts/healthcheck.sh"

