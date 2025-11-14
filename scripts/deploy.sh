#!/bin/bash

# Deployment Script
# Builds production images, deploys to remote server via SSH

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_FILE="${PROJECT_ROOT}/storage/logs/deploy.log"

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" | tee -a "$LOG_FILE" >&2
    exit 1
}

# Parse arguments
HOST=""
SSH_USER=""
SKIP_BUILD=false
SKIP_PUSH=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --host)
            HOST="$2"
            shift 2
            ;;
        --ssh-user)
            SSH_USER="$2"
            shift 2
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --skip-push)
            SKIP_PUSH=true
            shift
            ;;
        *)
            error "Unknown option: $1"
            ;;
    esac
done

if [ -z "$HOST" ]; then
    error "Host is required. Use --host <hostname>"
fi

if [ -z "$SSH_USER" ]; then
    SSH_USER="root"
    log "Using default SSH user: $SSH_USER"
fi

REMOTE_DIR="/opt/miniecom"
REMOTE_ENV="$REMOTE_DIR/.env"

log "Starting deployment to $SSH_USER@$HOST"

# Check if .env exists locally
if [ ! -f "$PROJECT_ROOT/.env" ]; then
    error ".env file not found. Please create it from .env.example"
fi

# Build Docker images
if [ "$SKIP_BUILD" = false ]; then
    log "Building Docker images..."
    cd "$PROJECT_ROOT"
    
    docker compose build --no-cache || error "Docker build failed"
    log "Docker images built successfully"
fi

# Save images to tar files (optional - for transfer)
if [ "$SKIP_PUSH" = false ]; then
    log "Saving Docker images..."
    docker save miniecom-api:latest -o /tmp/miniecom-api.tar || error "Failed to save API image"
    docker save miniecom-frontend:latest -o /tmp/miniecom-frontend.tar || error "Failed to save frontend image"
    log "Images saved to /tmp/"
fi

# Create remote directory
log "Creating remote directory..."
ssh "$SSH_USER@$HOST" "mkdir -p $REMOTE_DIR/{backend,frontend,nginx,scripts,storage/logs}" || error "Failed to create remote directory"

# Copy project files (excluding node_modules, .git, etc.)
log "Copying project files..."
rsync -avz --exclude 'node_modules' \
    --exclude '.git' \
    --exclude 'dist' \
    --exclude 'build' \
    --exclude '.env' \
    --exclude 'storage/logs/*.log' \
    "$PROJECT_ROOT/" "$SSH_USER@$HOST:$REMOTE_DIR/" || error "Failed to copy files"

# Handle .env file
if ssh "$SSH_USER@$HOST" "[ -f $REMOTE_ENV ]"; then
    log "Remote .env file exists"
    read -p "Overwrite remote .env file? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        scp "$PROJECT_ROOT/.env" "$SSH_USER@$HOST:$REMOTE_ENV" || error "Failed to copy .env"
        log ".env file copied"
    else
        log "Skipping .env copy"
    fi
else
    log "Copying .env file (first deployment)"
    scp "$PROJECT_ROOT/.env" "$SSH_USER@$HOST:$REMOTE_ENV" || error "Failed to copy .env"
fi

# Copy Docker images (if not skipping push)
if [ "$SKIP_PUSH" = false ]; then
    log "Copying Docker images..."
    scp /tmp/miniecom-*.tar "$SSH_USER@$HOST:/tmp/" || error "Failed to copy images"
    
    log "Loading Docker images on remote server..."
    ssh "$SSH_USER@$HOST" "docker load -i /tmp/miniecom-api.tar && docker load -i /tmp/miniecom-frontend.tar" || error "Failed to load images"
    
    log "Cleaning up temporary files..."
    ssh "$SSH_USER@$HOST" "rm -f /tmp/miniecom-*.tar"
    rm -f /tmp/miniecom-*.tar
fi

# Fix permissions
log "Fixing file permissions..."
ssh "$SSH_USER@$HOST" "cd $REMOTE_DIR && chmod +x scripts/*.sh scripts/*.js" || error "Failed to fix permissions"

# Run docker compose on remote server
log "Starting services on remote server..."
ssh "$SSH_USER@$HOST" "cd $REMOTE_DIR && USE_BIND_MOUNTS=0 docker compose up -d --remove-orphans" || error "Failed to start services"

# Wait for services to be healthy
log "Waiting for services to be healthy..."
sleep 10

# Run migrations
log "Running migrations..."
ssh "$SSH_USER@$HOST" "cd $REMOTE_DIR && docker compose exec -T api sh -c 'cd /app && node scripts/migrate.sh'" || log "WARNING: Migration failed or not available"

# Run seed scripts
log "Running seed scripts..."
ssh "$SSH_USER@$HOST" "cd $REMOTE_DIR && docker compose exec -T api sh -c 'cd /app && node scripts/seed_admin.js'" || log "WARNING: Seed script failed or not available"

# Fix storage permissions
log "Fixing storage permissions..."
ssh "$SSH_USER@$HOST" "cd $REMOTE_DIR && docker compose exec -T api sh -c 'chown -R nodejs:nodejs /app/storage && chmod -R 755 /app/storage'" || log "WARNING: Permission fix failed"

# Health check
log "Running health check..."
ssh "$SSH_USER@$HOST" "cd $REMOTE_DIR && curl -f http://localhost:3000/api/health || exit 1" || error "Health check failed"

log "Deployment completed successfully!"
log "Services are running on $HOST"
log "API: http://$HOST:3000"
log "Frontend: http://$HOST:80"

