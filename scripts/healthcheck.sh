#!/bin/bash

# Health Check Script
# Checks backend and frontend health endpoints

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

API_URL="${API_URL:-http://localhost:3000}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:80}"
HEALTH_CHECK_TIMEOUT=5

check_backend() {
    log "Checking backend health: $API_URL/api/health"
    
    if curl -f -s --max-time "$HEALTH_CHECK_TIMEOUT" "$API_URL/api/health" > /dev/null; then
        RESPONSE=$(curl -s --max-time "$HEALTH_CHECK_TIMEOUT" "$API_URL/api/health")
        log "✓ Backend is healthy"
        echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
        return 0
    else
        log "✗ Backend health check failed"
        return 1
    fi
}

check_frontend() {
    log "Checking frontend health: $FRONTEND_URL/health"
    
    if curl -f -s --max-time "$HEALTH_CHECK_TIMEOUT" "$FRONTEND_URL/health" > /dev/null; then
        log "✓ Frontend is healthy"
        return 0
    else
        # Try root path as fallback
        if curl -f -s --max-time "$HEALTH_CHECK_TIMEOUT" "$FRONTEND_URL/" > /dev/null; then
            log "✓ Frontend is accessible (root path)"
            return 0
        else
            log "✗ Frontend health check failed"
            return 1
        fi
    fi
}

check_mongo() {
    log "Checking MongoDB connection..."
    
    if command -v mongosh &> /dev/null; then
        MONGO_URI="${MONGO_URI:-mongodb://admin:changeme@localhost:27017/miniecom?authSource=admin}"
        if mongosh "$MONGO_URI" --quiet --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
            log "✓ MongoDB is accessible"
            return 0
        else
            log "✗ MongoDB connection failed"
            return 1
        fi
    else
        log "⚠ mongosh not available, skipping MongoDB check"
        return 0
    fi
}

# Run health checks
BACKEND_OK=false
FRONTEND_OK=false
MONGO_OK=false

if check_backend; then
    BACKEND_OK=true
fi

if check_frontend; then
    FRONTEND_OK=true
fi

if check_mongo; then
    MONGO_OK=true
fi

# Summary
log "Health Check Summary:"
log "  Backend:  $([ "$BACKEND_OK" = true ] && echo '✓ OK' || echo '✗ FAILED')"
log "  Frontend: $([ "$FRONTEND_OK" = true ] && echo '✓ OK' || echo '✗ FAILED')"
log "  MongoDB:  $([ "$MONGO_OK" = true ] && echo '✓ OK' || echo '✗ FAILED')"

# Exit with error if any check failed
if [ "$BACKEND_OK" = false ] || [ "$FRONTEND_OK" = false ]; then
    exit 1
fi

exit 0

