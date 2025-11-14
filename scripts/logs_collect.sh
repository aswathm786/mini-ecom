#!/usr/bin/env bash

# Logs Collection Script
# Collects and rotates application logs

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

LOGS_DIR="${PROJECT_ROOT}/storage/logs"
RETENTION_DAYS="${LOG_RETENTION_DAYS:-30}"
MAX_LOG_SIZE="${MAX_LOG_SIZE:-100M}"

log "Starting log collection and rotation..."

# Collect Docker logs
log "Collecting Docker container logs..."
cd "$PROJECT_ROOT"

CONTAINERS=$(docker compose ps -q 2>/dev/null || echo "")

for container in $CONTAINERS; do
    CONTAINER_NAME=$(docker ps --format "{{.Names}}" --filter "id=$container" 2>/dev/null || echo "")
    if [ -n "$CONTAINER_NAME" ]; then
        LOG_OUTPUT="${LOGS_DIR}/docker_${CONTAINER_NAME}_$(date +%Y%m%d).log"
        docker logs "$container" --since 24h > "$LOG_OUTPUT" 2>&1 || log "WARNING: Failed to collect logs from $CONTAINER_NAME"
        log "Collected logs from $CONTAINER_NAME"
    fi
done

# Rotate application logs
log "Rotating application logs..."
find "$LOGS_DIR" -name "*.log" -type f | while read -r logfile; do
    # Check file size
    FILE_SIZE=$(stat -c%s "$logfile" 2>/dev/null || echo "0")
    MAX_SIZE_BYTES=$(numfmt --from=iec "$MAX_LOG_SIZE" 2>/dev/null || echo "104857600") # Default 100MB
    
    if [ "$FILE_SIZE" -gt "$MAX_SIZE_BYTES" ]; then
        # Rotate log file
        ROTATED_FILE="${logfile}.$(date +%Y%m%d_%H%M%S)"
        mv "$logfile" "$ROTATED_FILE"
        touch "$logfile"
        gzip "$ROTATED_FILE" 2>/dev/null || true
        log "Rotated log file: $(basename "$logfile")"
    fi
done

# Remove old logs
log "Removing logs older than $RETENTION_DAYS days..."
find "$LOGS_DIR" -name "*.log.*" -type f -mtime +$RETENTION_DAYS -delete
find "$LOGS_DIR" -name "*.log.gz" -type f -mtime +$RETENTION_DAYS -delete

# Create log summary
LOG_SUMMARY="${LOGS_DIR}/log_summary_$(date +%Y%m%d).txt"
{
    echo "Log Collection Summary - $(date)"
    echo "================================"
    echo ""
    echo "Log Directory: $LOGS_DIR"
    echo "Total Size: $(du -sh "$LOGS_DIR" | cut -f1)"
    echo "Log Files:"
    ls -lh "$LOGS_DIR"/*.log 2>/dev/null | awk '{print $9, "(" $5 ")"}'
    echo ""
    echo "Recent Errors:"
    grep -i error "$LOGS_DIR"/*.log 2>/dev/null | tail -20 || echo "No errors found"
} > "$LOG_SUMMARY"

log "Log collection completed. Summary: $LOG_SUMMARY"

