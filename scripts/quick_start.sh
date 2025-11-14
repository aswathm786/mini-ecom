#!/usr/bin/env bash

# Quick Start Script for Handmade Harmony
# This script automates the initial setup process

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

# Check if Docker is installed
check_docker() {
    log "Checking Docker installation..."
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed. Please install Docker first.\nSee: https://www.docker.com/products/docker-desktop"
    fi
    
    if ! docker ps &> /dev/null; then
        error "Docker is not running. Please start Docker Desktop and try again."
    fi
    
    log "✓ Docker is installed and running"
}

# Check if Docker Compose is available
check_docker_compose() {
    log "Checking Docker Compose..."
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        error "Docker Compose is not installed. Please install Docker Compose."
    fi
    log "✓ Docker Compose is available"
}

# Create .env from .env.example if it doesn't exist
setup_env() {
    log "Setting up environment configuration..."
    
    if [ ! -f "$PROJECT_ROOT/.env" ]; then
        if [ -f "$PROJECT_ROOT/.env.example" ]; then
            log "Creating .env from .env.example..."
            cp "$PROJECT_ROOT/.env.example" "$PROJECT_ROOT/.env"
            warn "Please edit .env and update ADMIN_EMAIL, ADMIN_PASSWORD, and other settings"
            warn "Press Enter to continue after updating .env (or Ctrl+C to exit)..."
            read
        else
            error ".env.example not found. Cannot create .env file."
        fi
    else
        log "✓ .env file already exists"
    fi
    
    # Load .env variables
    if [ -f "$PROJECT_ROOT/.env" ]; then
        export $(cat "$PROJECT_ROOT/.env" | grep -v '^#' | xargs)
    fi
}

# Start Docker Compose services
start_services() {
    log "Starting Docker Compose services..."
    cd "$PROJECT_ROOT"
    
    # Set USE_BIND_MOUNTS=1 for development by default
    if ! grep -q "USE_BIND_MOUNTS" "$PROJECT_ROOT/.env" 2>/dev/null; then
        echo "USE_BIND_MOUNTS=1" >> "$PROJECT_ROOT/.env"
    fi
    
    # Start services
    if docker compose up -d --build; then
        log "✓ Services started successfully"
    else
        error "Failed to start services. Check docker compose logs."
    fi
    
    # Wait for services to be ready
    log "Waiting for services to be ready..."
    sleep 10
    
    # Check service status
    log "Checking service status..."
    docker compose ps
}

# Run database migrations
run_migrations() {
    log "Running database migrations..."
    cd "$PROJECT_ROOT"
    
    # Wait for MongoDB to be ready
    log "Waiting for MongoDB to be ready..."
    max_attempts=30
    attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if docker compose exec -T mongo mongosh --eval "db.adminCommand('ping')" &> /dev/null; then
            log "✓ MongoDB is ready"
            break
        fi
        attempt=$((attempt + 1))
        sleep 2
    done
    
    if [ $attempt -eq $max_attempts ]; then
        warn "MongoDB may not be ready. Migrations may fail. Continuing anyway..."
    fi
    
    # Run migrations
    if [ -f "$PROJECT_ROOT/scripts/migrate.sh" ]; then
        chmod +x "$PROJECT_ROOT/scripts/migrate.sh"
        if "$PROJECT_ROOT/scripts/migrate.sh"; then
            log "✓ Migrations completed"
        else
            warn "Migrations may have failed. Check logs."
        fi
    else
        warn "migrate.sh not found. Skipping migrations."
    fi
}

# Seed admin user
seed_admin() {
    log "Creating admin user..."
    cd "$PROJECT_ROOT"
    
    if [ -f "$PROJECT_ROOT/scripts/seed_admin.js" ]; then
        if node "$PROJECT_ROOT/scripts/seed_admin.js"; then
            log "✓ Admin user created"
        else
            warn "Admin user creation may have failed. Check logs."
        fi
    else
        warn "seed_admin.js not found. Skipping admin creation."
    fi
}

# Seed sample data
seed_sample_data() {
    log "Seeding sample data..."
    cd "$PROJECT_ROOT"
    
    if [ -f "$PROJECT_ROOT/scripts/seed_sample_data.sh" ]; then
        chmod +x "$PROJECT_ROOT/scripts/seed_sample_data.sh"
        if "$PROJECT_ROOT/scripts/seed_sample_data.sh"; then
            log "✓ Sample data seeded"
        else
            warn "Sample data seeding may have failed. Check logs."
        fi
    else
        warn "seed_sample_data.sh not found. Skipping sample data."
    fi
}

# Print summary
print_summary() {
    log "=========================================="
    log "✅ Setup Complete!"
    log "=========================================="
    echo ""
    echo "Your Handmade Harmony store is now running!"
    echo ""
    echo "📍 Access your store:"
    echo "   Frontend: http://localhost:${FRONTEND_PORT:-80}"
    echo "   Admin:    http://localhost:${FRONTEND_PORT:-80}/admin"
    echo "   API:      http://localhost:${API_PORT:-3000}/api/health"
    echo ""
    echo "👤 Admin Credentials:"
    echo "   Email:    ${ADMIN_EMAIL:-admin@example.com}"
    echo "   Password: ${ADMIN_PASSWORD:-password123}"
    echo ""
    echo "📝 Next Steps:"
    echo "   1. Log in to admin panel"
    echo "   2. Change your admin password"
    echo "   3. Configure payment gateway (Razorpay)"
    echo "   4. Configure shipping (Delhivery)"
    echo "   5. Add your products"
    echo ""
    echo "📚 Documentation:"
    echo "   - Quick Start: docs/setup_quickstart.md"
    echo "   - Admin Guide: docs/admin_quickguide.md"
    echo "   - Troubleshooting: docs/troubleshooting.md"
    echo ""
    log "=========================================="
}

# Main execution
main() {
    log "=========================================="
    log "Handmade Harmony - Quick Start"
    log "=========================================="
    echo ""
    
    check_docker
    check_docker_compose
    setup_env
    start_services
    run_migrations
    seed_admin
    seed_sample_data
    print_summary
}

# Run main function
main

