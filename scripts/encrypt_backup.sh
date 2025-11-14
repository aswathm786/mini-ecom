#!/usr/bin/env bash

# Encrypt Backup Script
# Encrypts backup files using OpenSSL AES-256-CBC

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

BACKUP_PASSPHRASE="${BACKUP_PASSPHRASE:-}"

if [ $# -lt 1 ]; then
    error "Usage: $0 <backup_file>"
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
    error "Backup file not found: $BACKUP_FILE"
fi

if [ -z "$BACKUP_PASSPHRASE" ]; then
    error "BACKUP_PASSPHRASE not set in .env"
fi

# Check if openssl is available
if ! command -v openssl &> /dev/null; then
    error "openssl not found. Please install OpenSSL."
fi

log "Encrypting backup: $BACKUP_FILE"

# Encrypt using AES-256-CBC with PBKDF2
if openssl enc -aes-256-cbc -salt -pbkdf2 -in "$BACKUP_FILE" -out "${BACKUP_FILE}.enc" -pass "pass:$BACKUP_PASSPHRASE"; then
    # Remove original file after successful encryption
    rm -f "$BACKUP_FILE"
    log "Backup encrypted successfully: ${BACKUP_FILE}.enc"
else
    error "Encryption failed"
fi

