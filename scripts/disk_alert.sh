#!/usr/bin/env bash

# Disk Space Alert Script
# Monitors disk usage and sends alerts when threshold is exceeded

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_FILE="${PROJECT_ROOT}/storage/logs/ops.log"
ALERT_LOG="${PROJECT_ROOT}/storage/logs/alerts.log"

# Ensure log directories exist
mkdir -p "$(dirname "$LOG_FILE")"
mkdir -p "$(dirname "$ALERT_LOG")"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

alert() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ALERT: $1" | tee -a "$ALERT_LOG" | tee -a "$LOG_FILE"
}

# Load environment variables
if [ -f "$PROJECT_ROOT/.env" ]; then
    export $(cat "$PROJECT_ROOT/.env" | grep -v '^#' | xargs)
fi

DISK_WARN_PCT="${DISK_WARN_PCT:-80}"
DISK_CRITICAL_PCT="${DISK_CRITICAL_PCT:-90}"
ALERT_EMAIL="${ALERT_EMAIL:-}"
SMTP_FROM="${SMTP_FROM:-noreply@handmadeharmony.com}"
CLEANUP_TEMP="${CLEANUP_TEMP:-true}"

send_alert() {
    local subject="$1"
    local message="$2"
    
    alert "$subject: $message"
    
    if [ -n "$ALERT_EMAIL" ]; then
        if command -v sendmail &> /dev/null; then
            {
                echo "Subject: $subject"
                echo "From: $SMTP_FROM"
                echo "To: $ALERT_EMAIL"
                echo ""
                echo "$message"
            } | sendmail "$ALERT_EMAIL" 2>/dev/null || log "Failed to send email"
        else
            echo "$message" | mail -s "$subject" "$ALERT_EMAIL" 2>/dev/null || log "Failed to send email"
        fi
    fi
}

# Get disk usage percentage
DISK_USAGE=$(df -h "$PROJECT_ROOT" | awk 'NR==2 {print $5}' | sed 's/%//')

log "Checking disk usage: ${DISK_USAGE}%"

if [ "$DISK_USAGE" -ge "$DISK_CRITICAL_PCT" ]; then
    alert "CRITICAL: Disk usage is ${DISK_USAGE}% (threshold: ${DISK_CRITICAL_PCT}%)"
    send_alert "CRITICAL: Disk Space Alert" "Disk usage is at ${DISK_USAGE}%. Immediate action required."
    
    # Attempt cleanup if enabled
    if [ "$CLEANUP_TEMP" = "true" ]; then
        log "Attempting to clean temporary files..."
        
        # Clean Docker system
        docker system prune -f --volumes 2>/dev/null || true
        
        # Clean old logs
        find "$PROJECT_ROOT/storage/logs" -name "*.log" -mtime +30 -delete 2>/dev/null || true
        
        # Clean old backups (keep only recent)
        if [ -d "$PROJECT_ROOT/storage/backups" ]; then
            find "$PROJECT_ROOT/storage/backups" -type f -mtime +7 -delete 2>/dev/null || true
        fi
        
        log "Cleanup completed"
    fi
    
    exit 1
elif [ "$DISK_USAGE" -ge "$DISK_WARN_PCT" ]; then
    alert "WARNING: Disk usage is ${DISK_USAGE}% (threshold: ${DISK_WARN_PCT}%)"
    send_alert "WARNING: Disk Space Alert" "Disk usage is at ${DISK_USAGE}%. Consider cleaning up old files."
    exit 0
else
    log "Disk usage is within acceptable limits: ${DISK_USAGE}%"
    exit 0
fi

