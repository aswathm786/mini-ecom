# Deployment Guide

This guide covers deploying the MiniEcom application (React frontend + Node/Express backend + MongoDB) using Docker Compose.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Development Setup](#development-setup)
4. [Production Deployment](#production-deployment)
5. [Configuration](#configuration)
6. [Migrations & Seeding](#migrations--seeding)
7. [Nginx Configuration](#nginx-configuration)
8. [GitHub Integration](#github-integration)
9. [Troubleshooting](#troubleshooting)

## Prerequisites

### Install Docker & Docker Compose on Ubuntu

```bash
# Update package index
sudo apt-get update

# Install prerequisites
sudo apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Add Docker's official GPG key
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Set up Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Add user to docker group (optional, to run without sudo)
sudo usermod -aG docker $USER
newgrp docker

# Verify installation
docker --version
docker compose version
```

### Install MongoDB Shell (mongosh)

```bash
# Install mongosh
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt-get update
sudo apt-get install -y mongodb-mongosh
```

### Install Node.js (for local development)

```bash
# Using NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

## Installation

### 1. Clone Repository

```bash
git clone <repository-url>
cd E-COM-REACT
```

### 2. Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your configuration
nano .env
```

**Important variables to set:**
- `JWT_SECRET`: Generate a strong random string
- `SESSION_SECRET`: Generate a strong random string
- `CSRF_SECRET`: Generate a strong random string
- `MONGO_ROOT_PASSWORD`: Strong password for MongoDB root user
- `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`: Your Razorpay credentials
- `SMTP_*`: Your email service credentials
- `ADMIN_EMAIL` and `ADMIN_PASSWORD`: Admin user credentials

### 3. Install Dependencies

```bash
# Frontend
cd frontend
npm install
cd ..

# Backend
cd backend
npm install
cd ..
```

### 4. Optional: Install PDF Generation Library

For invoice generation, install one of:

```bash
# Option 1: PDFKit (pure Node.js)
cd backend
npm install pdfkit
# Download fonts and place in backend/fonts/

# Option 2: html-pdf (requires Puppeteer)
npm install html-pdf puppeteer
```

## Development Setup

### Start Development Environment

```bash
# Set development mode with bind mounts
export USE_BIND_MOUNTS=1

# Start services
docker compose up -d

# View logs
docker compose logs -f
```

### Access Services

- **Frontend**: http://localhost:80 (or port specified in `.env`)
- **Backend API**: http://localhost:3000
- **MongoDB**: localhost:27017
- **Mongo Express** (if enabled): http://localhost:8081

### Stop Services

```bash
docker compose down
```

## Production Deployment

### 1. Build Production Images

```bash
# Build without bind mounts
export USE_BIND_MOUNTS=0
docker compose build --no-cache
```

### 2. Start Production Services

```bash
docker compose up -d
```

### 3. Run Migrations

```bash
# Make script executable
chmod +x scripts/migrate.sh

# Run migrations
./scripts/migrate.sh
```

### 4. Seed Admin User

```bash
# Make script executable
chmod +x scripts/seed_admin.js

# Run seed script
node scripts/seed_admin.js
```

### 5. Seed Sample Data (Optional)

```bash
chmod +x scripts/seed_sample_data.sh
./scripts/seed_sample_data.sh
```

### 6. Fix Permissions

```bash
chmod +x scripts/fix-perms.sh
sudo ./scripts/fix-perms.sh
```

### 7. Health Check

```bash
chmod +x scripts/healthcheck.sh
./scripts/healthcheck.sh
```

## Configuration

### Environment Variables

All configuration is done via `.env` file. Key variables:

- **Application**: `APP_ENV`, `APP_URL`, `APP_NAME`
- **Database**: `MONGO_URI`, `MONGO_ROOT_USERNAME`, `MONGO_ROOT_PASSWORD`
- **Security**: `JWT_SECRET`, `SESSION_SECRET`, `CSRF_SECRET`
- **Payment**: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`
- **Shipping**: `DELHIVERY_TOKEN`, `DELHIVERY_CLIENT_ID`
- **Email**: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- **Admin**: `ADMIN_EMAIL`, `ADMIN_PASSWORD`

### Docker Compose Profiles

- **Default**: Runs core services (mongo, api, frontend)
- **tools**: Includes mongo-express (add `--profile tools`)
- **worker**: Includes background worker (add `--profile worker`)
- **nginx**: Includes nginx reverse proxy (add `--profile nginx`)

## Migrations & Seeding

### Migration System

Migrations are JavaScript files in `backend/migrations/` with timestamp prefix:

```
backend/migrations/
  20240101000000_create_users.js
  20240102000000_create_products.js
  20240103000000_create_orders.js
```

Each migration file should export a function that receives `MONGO_URI`:

```javascript
// Example migration
module.exports = async function(mongoUri) {
  const { MongoClient } = require('mongodb');
  const client = new MongoClient(mongoUri);
  await client.connect();
  const db = client.db();
  
  // Migration logic here
  await db.collection('users').createIndex({ email: 1 }, { unique: true });
  
  await client.close();
};
```

Run migrations:
```bash
./scripts/migrate.sh
```

### Seeding

**Admin User:**
```bash
node scripts/seed_admin.js
```

**Sample Data:**
```bash
./scripts/seed_sample_data.sh
```

Both scripts are idempotent (safe to run multiple times).

## Nginx Configuration

### Option 1: Using Nginx Container

```bash
# Start with nginx profile
docker compose --profile nginx up -d
```

### Option 2: System Nginx

1. Copy nginx config:
```bash
sudo cp nginx/miniecom.conf /etc/nginx/sites-available/miniecom
sudo ln -s /etc/nginx/sites-available/miniecom /etc/nginx/sites-enabled/
```

2. Update paths in config:
```nginx
# Point to built frontend
root /path/to/project/frontend/dist;
```

3. Test and reload:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Nginx Config Features

- Serves frontend static files from `/usr/share/nginx/html`
- Reverse proxies `/api/*` to backend
- Single-page app fallback (`try_files`)
- Gzip compression
- Security headers
- Static asset caching

## GitHub Integration

### 1. Setup SSH Key

```bash
chmod +x scripts/setup_github.sh
./scripts/setup_github.sh
```

### 2. Enable GitHub Actions

1. Go to repository Settings → Secrets and variables → Actions
2. Add secrets:
   - `SSH_PRIVATE_KEY`: Your SSH private key for deployment
   - `DEPLOY_HOST`: Production server hostname/IP
   - `DEPLOY_USER`: SSH user for deployment

### 3. Push Code

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

CI/CD pipeline will:
- Build frontend and backend
- Run tests
- Build Docker images
- Deploy to production (on push to main)

## Performance Tips

### Setup Swap (for older PCs)

```bash
# Create 2GB swap file
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make permanent
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### Systemd Service (Optional)

Create `/etc/systemd/system/miniecom.service`:

```ini
[Unit]
Description=MiniEcom Docker Compose
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/miniecom
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable miniecom
sudo systemctl start miniecom
```

## Troubleshooting

### Services Not Starting

```bash
# Check logs
docker compose logs

# Check specific service
docker compose logs api
docker compose logs frontend
docker compose logs mongo

# Restart services
docker compose restart
```

### MongoDB Connection Issues

```bash
# Check MongoDB is running
docker compose ps mongo

# Test connection
mongosh "mongodb://admin:changeme@localhost:27017/miniecom?authSource=admin"
```

### Permission Issues

```bash
# Fix permissions
sudo ./scripts/fix-perms.sh

# Check storage directories
ls -la storage/
```

### Health Check Fails

```bash
# Run health check script
./scripts/healthcheck.sh

# Manual check
curl http://localhost:3000/api/health
curl http://localhost:80/health
```

### Build Failures

```bash
# Clean build
docker compose down -v
docker system prune -a
docker compose build --no-cache
```

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Nginx Documentation](https://nginx.org/en/docs/)

