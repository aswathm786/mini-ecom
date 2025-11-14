#!/usr/bin/env bash

# Backup Script
# Creates backups of MongoDB, uploads, and configuration files

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_FILE="${PROJECT_ROOT}/storage/logs/backups.log"

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

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
BACKUP_PASSPHRASE="${BACKUP_PASSPHRASE:-}"
ENCRYPT_BACKUP="${ENCRYPT_BACKUP:-false}"
COMPRESS_BACKUP="${COMPRESS_BACKUP:-true}"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Create dated backup folder
BACKUP_TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_TIMESTAMP}"
mkdir -p "$BACKUP_PATH"

log "Starting backup: $BACKUP_TIMESTAMP"

# Check if mongodump is available
if ! command -v mongodump &> /dev/null; then
    error "mongodump not found. Please install MongoDB database tools."
fi

# Backup MongoDB
log "Backing up MongoDB..."
if mongodump --uri="$MONGO_URI" --archive="$BACKUP_PATH/mongo.archive.gz" --gzip; then
    log "MongoDB backup completed: $BACKUP_PATH/mongo.archive.gz"
else
    error "MongoDB backup failed"
fi

# Backup uploads/storage
log "Backing up uploads..."
UPLOADS_SOURCE="${PROJECT_ROOT}/storage/uploads"
if [ -d "$UPLOADS_SOURCE" ]; then
    rsync -av --delete "$UPLOADS_SOURCE/" "$BACKUP_PATH/uploads/" || error "Failed to backup uploads"
    log "Uploads backup completed: $BACKUP_PATH/uploads/"
else
    log "WARNING: Uploads directory not found: $UPLOADS_SOURCE"
fi

# Backup configuration
log "Backing up configuration..."
if [ -f "$PROJECT_ROOT/.env" ]; then
    cp "$PROJECT_ROOT/.env" "$BACKUP_PATH/.env" || error "Failed to backup .env"
    log "Configuration backup completed: $BACKUP_PATH/.env"
else
    log "WARNING: .env file not found"
fi

# Backup docker-compose.yml
if [ -f "$PROJECT_ROOT/docker-compose.yml" ]; then
    cp "$PROJECT_ROOT/docker-compose.yml" "$BACKUP_PATH/docker-compose.yml" || log "WARNING: Failed to backup docker-compose.yml"
fi

# Create backup manifest
cat > "$BACKUP_PATH/manifest.json" << EOF
{
  "timestamp": "$BACKUP_TIMESTAMP",
  "date": "$(date -Iseconds)",
  "version": "1.0",
  "components": {
    "mongodb": "$(stat -c%s "$BACKUP_PATH/mongo.archive.gz" 2>/dev/null || echo 0)",
    "uploads": "$(du -sb "$BACKUP_PATH/uploads" 2>/dev/null | cut -f1 || echo 0)",
    "config": "$(stat -c%s "$BACKUP_PATH/.env" 2>/dev/null || echo 0)"
  }
}
EOF

log "Backup manifest created: $BACKUP_PATH/manifest.json"

# Compress backup
if [ "$COMPRESS_BACKUP" = "true" ]; then
    log "Compressing backup..."
    cd "$BACKUP_DIR"
    tar -czf "${BACKUP_TIMESTAMP}.tar.gz" "$BACKUP_TIMESTAMP" || error "Failed to compress backup"
    BACKUP_ARCHIVE="${BACKUP_DIR}/${BACKUP_TIMESTAMP}.tar.gz"
    log "Backup compressed: $BACKUP_ARCHIVE"
    
    # Remove uncompressed folder
    rm -rf "$BACKUP_PATH"
    BACKUP_PATH="$BACKUP_ARCHIVE"
fi

# Encrypt backup if requested
if [ "$ENCRYPT_BACKUP" = "true" ] && [ -n "$BACKUP_PASSPHRASE" ]; then
    log "Encrypting backup..."
    if [ -f "$PROJECT_ROOT/scripts/encrypt_backup.sh" ]; then
        "$PROJECT_ROOT/scripts/encrypt_backup.sh" "$BACKUP_PATH" || error "Failed to encrypt backup"
        log "Backup encrypted: ${BACKUP_PATH}.enc"
    else
        error "encrypt_backup.sh not found"
    fi
fi

# Calculate backup size
BACKUP_SIZE=$(du -sh "$BACKUP_PATH" 2>/dev/null | cut -f1 || echo "unknown")
log "Backup completed successfully: $BACKUP_PATH (Size: $BACKUP_SIZE)"

# Run rotation
if [ -f "$PROJECT_ROOT/scripts/rotate_backups.sh" ]; then
    log "Running backup rotation..."
    "$PROJECT_ROOT/scripts/rotate_backups.sh" || log "WARNING: Backup rotation failed"
fi

log "Backup process completed: $BACKUP_TIMESTAMP"

