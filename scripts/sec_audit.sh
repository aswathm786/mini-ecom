#!/usr/bin/env bash

# Security Audit Script
# Checks file permissions and security settings

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_FILE="${PROJECT_ROOT}/storage/logs/ops.log"
AUDIT_LOG="${PROJECT_ROOT}/storage/logs/security_audit.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE" | tee -a "$AUDIT_LOG"
}

warn() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: $1" | tee -a "$LOG_FILE" | tee -a "$AUDIT_LOG"
}

error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" | tee -a "$LOG_FILE" | tee -a "$AUDIT_LOG"
}

log "Starting security audit..."

ISSUES=0

# Check .env file permissions
log "Checking .env file permissions..."
if [ -f "$PROJECT_ROOT/.env" ]; then
    ENV_PERMS=$(stat -c "%a" "$PROJECT_ROOT/.env" 2>/dev/null || echo "unknown")
    if [ "$ENV_PERMS" != "600" ] && [ "$ENV_PERMS" != "400" ]; then
        warn ".env file has insecure permissions: $ENV_PERMS (should be 600 or 400)"
        ISSUES=$((ISSUES + 1))
    else
        log ".env file permissions: OK ($ENV_PERMS)"
    fi
else
    warn ".env file not found"
fi

# Check for world-writable directories
log "Checking for world-writable directories..."
WORLD_WRITABLE=$(find "$PROJECT_ROOT" -type d -perm -002 ! -path "*/node_modules/*" ! -path "*/.git/*" 2>/dev/null || echo "")

if [ -n "$WORLD_WRITABLE" ]; then
    warn "Found world-writable directories:"
    echo "$WORLD_WRITABLE" | while read -r dir; do
        warn "  - $dir"
        ISSUES=$((ISSUES + 1))
    done
else
    log "No world-writable directories found"
fi

# Check for world-readable sensitive files
log "Checking for world-readable sensitive files..."
SENSITIVE_FILES=$(find "$PROJECT_ROOT" -type f \( -name "*.env*" -o -name "*secret*" -o -name "*key*" \) ! -path "*/node_modules/*" ! -path "*/.git/*" 2>/dev/null || echo "")

if [ -n "$SENSITIVE_FILES" ]; then
    echo "$SENSITIVE_FILES" | while read -r file; do
        FILE_PERMS=$(stat -c "%a" "$file" 2>/dev/null || echo "unknown")
        if [ "${FILE_PERMS:2:1}" = "4" ] || [ "${FILE_PERMS:2:1}" = "6" ] || [ "${FILE_PERMS:2:1}" = "7" ]; then
            warn "Sensitive file is world-readable: $file (perms: $FILE_PERMS)"
            ISSUES=$((ISSUES + 1))
        fi
    done
fi

# Check for exposed secrets in code (basic check)
log "Checking for hardcoded secrets..."
if grep -r "password.*=.*['\"].*[a-zA-Z0-9]\{8,\}" "$PROJECT_ROOT/backend/src" "$PROJECT_ROOT/frontend/src" 2>/dev/null | grep -v "//.*password" | grep -v "test" | grep -v "example"; then
    warn "Potential hardcoded passwords found in source code"
    ISSUES=$((ISSUES + 1))
else
    log "No obvious hardcoded passwords found"
fi

# Check Docker socket permissions
log "Checking Docker socket permissions..."
if [ -S /var/run/docker.sock ]; then
    DOCKER_SOCK_PERMS=$(stat -c "%a" /var/run/docker.sock 2>/dev/null || echo "unknown")
    if [ "$DOCKER_SOCK_PERMS" != "660" ] && [ "$DOCKER_SOCK_PERMS" != "600" ]; then
        warn "Docker socket has unusual permissions: $DOCKER_SOCK_PERMS"
        ISSUES=$((ISSUES + 1))
    fi
fi

# Check for exposed ports
log "Checking for exposed ports..."
EXPOSED_PORTS=$(docker compose ps --format json 2>/dev/null | jq -r '.[] | select(.Publishers != null) | .Publishers[] | "\(.PublishedPort):\(.TargetPort)"' | sort -u || echo "")

if [ -n "$EXPOSED_PORTS" ]; then
    log "Exposed ports:"
    echo "$EXPOSED_PORTS" | while read -r port; do
        log "  - $port"
    done
fi

# Summary
log "Security audit completed. Issues found: $ISSUES"

if [ $ISSUES -gt 0 ]; then
    error "Security audit found $ISSUES issue(s). Please review and fix."
    exit 1
else
    log "Security audit passed. No issues found."
    exit 0
fi

