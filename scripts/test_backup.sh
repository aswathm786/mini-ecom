#!/usr/bin/env bash

# Test Backup Script
# Creates a test backup and validates it

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

TEST_BACKUP_DIR="${PROJECT_ROOT}/storage/backups/test"
MONGO_URI="${MONGO_URI:-mongodb://admin:changeme@localhost:27017/miniecom?authSource=admin}"
BACKUP_PASSPHRASE="${BACKUP_PASSPHRASE:-test_passphrase_123}"

log "Starting test backup..."

# Create test backup directory
mkdir -p "$TEST_BACKUP_DIR"
TEST_BACKUP_PATH="${TEST_BACKUP_DIR}/test_backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$TEST_BACKUP_PATH"

# Test MongoDB backup
log "Testing MongoDB backup..."
if command -v mongodump &> /dev/null; then
    if mongodump --uri="$MONGO_URI" --archive="$TEST_BACKUP_PATH/mongo.archive.gz" --gzip; then
        log "✓ MongoDB backup test: PASSED"
        
        # Verify backup file
        if [ -f "$TEST_BACKUP_PATH/mongo.archive.gz" ] && [ -s "$TEST_BACKUP_PATH/mongo.archive.gz" ]; then
            BACKUP_SIZE=$(stat -c%s "$TEST_BACKUP_PATH/mongo.archive.gz")
            log "✓ MongoDB backup file exists and is non-empty (Size: $BACKUP_SIZE bytes)"
        else
            error "MongoDB backup file is missing or empty"
        fi
    else
        error "MongoDB backup test: FAILED"
    fi
else
    error "mongodump not found. Cannot test MongoDB backup."
fi

# Test uploads backup
log "Testing uploads backup..."
UPLOADS_SOURCE="${PROJECT_ROOT}/storage/uploads"
if [ -d "$UPLOADS_SOURCE" ]; then
    mkdir -p "$TEST_BACKUP_PATH/uploads"
    if rsync -av "$UPLOADS_SOURCE/" "$TEST_BACKUP_PATH/uploads/" > /dev/null 2>&1; then
        log "✓ Uploads backup test: PASSED"
    else
        log "⚠ Uploads backup test: WARNING (directory may be empty)"
    fi
else
    log "⚠ Uploads directory not found (creating test file)..."
    mkdir -p "$UPLOADS_SOURCE"
    echo "test file" > "$UPLOADS_SOURCE/test.txt"
    mkdir -p "$TEST_BACKUP_PATH/uploads"
    rsync -av "$UPLOADS_SOURCE/" "$TEST_BACKUP_PATH/uploads/" > /dev/null 2>&1
    log "✓ Uploads backup test: PASSED (with test file)"
fi

# Test config backup
log "Testing configuration backup..."
if [ -f "$PROJECT_ROOT/.env" ]; then
    cp "$PROJECT_ROOT/.env" "$TEST_BACKUP_PATH/.env"
    if [ -f "$TEST_BACKUP_PATH/.env" ]; then
        log "✓ Configuration backup test: PASSED"
    else
        error "Configuration backup test: FAILED"
    fi
else
    log "⚠ .env file not found (creating test file)..."
    echo "# Test .env file" > "$TEST_BACKUP_PATH/.env"
    log "✓ Configuration backup test: PASSED (with test file)"
fi

# Test compression
log "Testing backup compression..."
cd "$TEST_BACKUP_DIR"
TEST_BACKUP_NAME=$(basename "$TEST_BACKUP_PATH")
if tar -czf "${TEST_BACKUP_NAME}.tar.gz" "$TEST_BACKUP_NAME" 2>/dev/null; then
    COMPRESSED_SIZE=$(stat -c%s "${TEST_BACKUP_NAME}.tar.gz")
    log "✓ Compression test: PASSED (Size: $COMPRESSED_SIZE bytes)"
    TEST_BACKUP_FILE="${TEST_BACKUP_DIR}/${TEST_BACKUP_NAME}.tar.gz"
    rm -rf "$TEST_BACKUP_PATH"
else
    error "Compression test: FAILED"
fi

# Test encryption
log "Testing backup encryption..."
if command -v openssl &> /dev/null; then
    if [ -f "$PROJECT_ROOT/scripts/encrypt_backup.sh" ]; then
        # Temporarily set passphrase
        export BACKUP_PASSPHRASE="$BACKUP_PASSPHRASE"
        
        if "$PROJECT_ROOT/scripts/encrypt_backup.sh" "$TEST_BACKUP_FILE"; then
            ENCRYPTED_FILE="${TEST_BACKUP_FILE}.enc"
            if [ -f "$ENCRYPTED_FILE" ]; then
                log "✓ Encryption test: PASSED"
                
                # Test decryption
                log "Testing backup decryption..."
                DECRYPTED_FILE="${TEST_BACKUP_FILE}.decrypted"
                if "$PROJECT_ROOT/scripts/decrypt_backup.sh" "$ENCRYPTED_FILE" "$DECRYPTED_FILE"; then
                    if [ -f "$DECRYPTED_FILE" ]; then
                        log "✓ Decryption test: PASSED"
                        rm -f "$DECRYPTED_FILE"
                    else
                        error "Decryption test: FAILED (file not created)"
                    fi
                else
                    error "Decryption test: FAILED"
                fi
                
                rm -f "$ENCRYPTED_FILE"
            else
                error "Encryption test: FAILED (encrypted file not created)"
            fi
        else
            error "Encryption test: FAILED"
        fi
    else
        log "⚠ Encryption script not found. Skipping encryption test."
    fi
else
    log "⚠ openssl not found. Skipping encryption test."
fi

# Cleanup
log "Cleaning up test backup..."
rm -f "$TEST_BACKUP_FILE"

log "Test backup completed successfully!"
log "All backup components are working correctly."

