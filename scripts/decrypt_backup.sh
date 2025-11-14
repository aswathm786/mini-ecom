#!/usr/bin/env bash

# Decrypt Backup Script
# Decrypts encrypted backup files using OpenSSL AES-256-CBC

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
    error "Usage: $0 <encrypted_backup_file> [output_file]"
fi

ENCRYPTED_FILE="$1"
OUTPUT_FILE="${2:-${ENCRYPTED_FILE%.enc}}"

if [ ! -f "$ENCRYPTED_FILE" ]; then
    error "Encrypted backup file not found: $ENCRYPTED_FILE"
fi

if [ -z "$BACKUP_PASSPHRASE" ]; then
    # Prompt for passphrase if not in env
    read -sp "Enter backup passphrase: " BACKUP_PASSPHRASE
    echo
fi

if [ -z "$BACKUP_PASSPHRASE" ]; then
    error "Backup passphrase required"
fi

# Check if openssl is available
if ! command -v openssl &> /dev/null; then
    error "openssl not found. Please install OpenSSL."
fi

log "Decrypting backup: $ENCRYPTED_FILE"

# Decrypt using AES-256-CBC with PBKDF2
if openssl enc -aes-256-cbc -d -salt -pbkdf2 -in "$ENCRYPTED_FILE" -out "$OUTPUT_FILE" -pass "pass:$BACKUP_PASSPHRASE"; then
    log "Backup decrypted successfully: $OUTPUT_FILE"
else
    error "Decryption failed. Check passphrase and file integrity."
fi

