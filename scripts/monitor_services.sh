#!/usr/bin/env bash

# Service Monitoring Script
# Monitors container health and restarts if unhealthy

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

APP_URL="${APP_URL:-http://localhost:3000}"
API_URL="${API_URL:-http://localhost:3000}"
ALERT_EMAIL="${ALERT_EMAIL:-}"
SMTP_FROM="${SMTP_FROM:-noreply@handmadeharmony.com}"

send_alert() {
    local subject="$1"
    local message="$2"
    
    alert "$subject: $message"
    
    if [ -n "$ALERT_EMAIL" ]; then
        # Try sendmail first
        if command -v sendmail &> /dev/null; then
            {
                echo "Subject: $subject"
                echo "From: $SMTP_FROM"
                echo "To: $ALERT_EMAIL"
                echo ""
                echo "$message"
            } | sendmail "$ALERT_EMAIL" 2>/dev/null || log "Failed to send email via sendmail"
        else
            # Fallback to mail command
            echo "$message" | mail -s "$subject" "$ALERT_EMAIL" 2>/dev/null || log "Failed to send email"
        fi
    fi
}

# Check if docker compose is available
if ! command -v docker &> /dev/null; then
    alert "Docker not found. Monitoring cannot proceed."
    exit 1
fi

cd "$PROJECT_ROOT"

# Check container statuses
log "Checking container statuses..."
CONTAINER_STATUS=$(docker compose ps --format json 2>/dev/null || echo "[]")

# Check each service
SERVICES=("api" "frontend" "mongo")

for service in "${SERVICES[@]}"; do
    SERVICE_STATUS=$(echo "$CONTAINER_STATUS" | jq -r ".[] | select(.Service==\"$service\") | .State" 2>/dev/null || echo "")
    
    if [ -z "$SERVICE_STATUS" ]; then
        alert "Service $service not found in docker compose"
        continue
    fi
    
    if [ "$SERVICE_STATUS" != "running" ]; then
        alert "Service $service is not running (status: $SERVICE_STATUS). Attempting restart..."
        send_alert "Service Down: $service" "Service $service is in state: $SERVICE_STATUS. Attempting automatic restart."
        
        if docker compose restart "$service"; then
            log "Service $service restarted successfully"
            send_alert "Service Restarted: $service" "Service $service has been restarted successfully."
        else
            alert "Failed to restart service $service"
            send_alert "Service Restart Failed: $service" "Failed to restart service $service. Manual intervention required."
        fi
    else
        log "Service $service is running"
    fi
done

# Check backend health endpoint
log "Checking backend health endpoint..."
if curl -f -s --max-time 5 "${API_URL}/api/health" > /dev/null 2>&1; then
    HEALTH_RESPONSE=$(curl -s --max-time 5 "${API_URL}/api/health")
    MONGO_CONNECTED=$(echo "$HEALTH_RESPONSE" | jq -r '.mongoConnected' 2>/dev/null || echo "unknown")
    
    if [ "$MONGO_CONNECTED" != "true" ]; then
        alert "Backend health check: MongoDB not connected"
        send_alert "MongoDB Connection Issue" "Backend reports MongoDB is not connected."
    else
        log "Backend health check: OK"
    fi
else
    alert "Backend health check failed"
    send_alert "Backend Health Check Failed" "Backend health endpoint is not responding. Service may be down."
    
    # Attempt restart
    log "Attempting to restart backend..."
    docker compose restart api || alert "Failed to restart backend"
fi

# Check frontend health endpoint
log "Checking frontend health endpoint..."
if curl -f -s --max-time 5 "${APP_URL}/health" > /dev/null 2>&1; then
    log "Frontend health check: OK"
else
    # Try root path as fallback
    if curl -f -s --max-time 5 "${APP_URL}/" > /dev/null 2>&1; then
        log "Frontend is accessible (root path)"
    else
        alert "Frontend health check failed"
        send_alert "Frontend Health Check Failed" "Frontend is not responding."
        
        # Attempt restart
        log "Attempting to restart frontend..."
        docker compose restart frontend || alert "Failed to restart frontend"
    fi
fi

# Check MongoDB connection
log "Checking MongoDB connection..."
if docker compose exec -T mongo mongosh --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
    log "MongoDB connection: OK"
else
    alert "MongoDB connection check failed"
    send_alert "MongoDB Connection Failed" "MongoDB is not responding to ping commands."
fi

log "Monitoring check completed"

