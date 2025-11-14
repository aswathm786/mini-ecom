#!/bin/bash

# Migration Script
# Runs MongoDB migrations in order and records applied migrations

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_FILE="${PROJECT_ROOT}/storage/logs/ops.log"

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Load environment variables
if [ -f "$PROJECT_ROOT/.env" ]; then
    export $(cat "$PROJECT_ROOT/.env" | grep -v '^#' | xargs)
fi

MONGO_URI="${MONGO_URI:-mongodb://admin:changeme@localhost:27017/miniecom?authSource=admin}"
MIGRATIONS_DIR="${PROJECT_ROOT}/backend/migrations"

if [ ! -d "$MIGRATIONS_DIR" ]; then
    log "ERROR: Migrations directory not found: $MIGRATIONS_DIR"
    exit 1
fi

# Check if mongosh is available
if ! command -v mongosh &> /dev/null; then
    log "ERROR: mongosh not found. Please install MongoDB shell tools."
    log "On Ubuntu: sudo apt-get install -y mongodb-mongosh"
    exit 1
fi

log "Starting migration process..."

# Extract connection details from MONGO_URI
# Format: mongodb://[username:password@]host:port/database[?options]
MONGO_HOST=$(echo "$MONGO_URI" | sed -n 's|.*@\([^:]*\):.*|\1|p')
MONGO_PORT=$(echo "$MONGO_URI" | sed -n 's|.*:\([0-9]*\)/.*|\1|p')
MONGO_DB=$(echo "$MONGO_URI" | sed -n 's|.*/\([^?]*\).*|\1|p')
MONGO_USER=$(echo "$MONGO_URI" | sed -n 's|mongodb://\([^:]*\):.*|\1|p')
MONGO_PASS=$(echo "$MONGO_URI" | sed -n 's|mongodb://[^:]*:\([^@]*\)@.*|\1|p')

if [ -z "$MONGO_HOST" ]; then
    MONGO_HOST="localhost"
fi

if [ -z "$MONGO_PORT" ]; then
    MONGO_PORT="27017"
fi

if [ -z "$MONGO_DB" ]; then
    MONGO_DB="miniecom"
fi

# Get list of migration files sorted by timestamp
MIGRATION_FILES=$(find "$MIGRATIONS_DIR" -name "*.js" -type f | sort)

if [ -z "$MIGRATION_FILES" ]; then
    log "No migration files found in $MIGRATIONS_DIR"
    exit 0
fi

# Connect to MongoDB and get applied migrations
log "Connecting to MongoDB: $MONGO_HOST:$MONGO_PORT/$MONGO_DB"

APPLIED_MIGRATIONS=$(mongosh "$MONGO_URI" --quiet --eval "
    db.migrations.find({}, { _id: 1 }).toArray().map(m => m._id)
" 2>/dev/null | grep -v "^$" | tr -d '[]," ' || echo "")

log "Applied migrations: ${APPLIED_MIGRATIONS:-none}"

# Process each migration file
for MIGRATION_FILE in $MIGRATION_FILES; do
    MIGRATION_NAME=$(basename "$MIGRATION_FILE")
    MIGRATION_ID="${MIGRATION_NAME%.js}"
    
    # Check if migration already applied
    if echo "$APPLIED_MIGRATIONS" | grep -q "$MIGRATION_ID"; then
        log "Skipping already applied migration: $MIGRATION_ID"
        continue
    fi
    
    log "Running migration: $MIGRATION_ID"
    
    # Run migration using Node.js
    if node "$MIGRATION_FILE" "$MONGO_URI"; then
        # Record migration as applied
        mongosh "$MONGO_URI" --quiet --eval "
            db.migrations.insertOne({
                _id: '$MIGRATION_ID',
                appliedAt: new Date(),
                filename: '$MIGRATION_NAME'
            })
        " > /dev/null 2>&1
        
        log "Migration applied successfully: $MIGRATION_ID"
    else
        log "ERROR: Migration failed: $MIGRATION_ID"
        exit 1
    fi
done

log "Migration process completed successfully"
