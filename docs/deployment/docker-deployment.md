# Docker Deployment Guide

Complete guide for deploying Handmade Harmony using Docker on Windows and Linux servers.

## 📋 Table of Contents

- [Why Docker?](#why-docker)
- [Prerequisites](#prerequisites)
- [Installation on Windows Server](#installation-on-windows-server)
- [Installation on Linux](#installation-on-linux)
- [Production Deployment](#production-deployment)
- [Docker Compose Configuration](#docker-compose-configuration)
- [Container Management](#container-management)
- [Scaling and Load Balancing](#scaling-and-load-balancing)
- [Troubleshooting](#troubleshooting)

---

## Why Docker?

###Advantages

- ✅ **Consistency**: Same environment across dev/staging/prod
- ✅ **Isolation**: Services don't interfere with each other
- ✅ **Easy Updates**: Update by replacing containers
- ✅ **Scalability**: Easy to add more instances
- ✅ **Rollback**: Quick recovery from bad deploys
- ✅ **Resource Efficiency**: Better than VMs

### Docker vs Native

| Aspect | Docker | Native |
|--------|--------|--------|
| Setup Time | ⭐⭐⭐ Fast | ⭐⭐ Moderate |
| Consistency | ⭐⭐⭐ High | ⭐ Low |
| Performance | ⭐⭐ Good | ⭐⭐⭐ Best |
| Maintenance | ⭐⭐⭐ Easy | ⭐⭐ Moderate |
| Scaling | ⭐⭐⭐ Easy | ⭐ Hard |

---

## Prerequisites

### Required Software

- **Docker Engine** 20.10+
- **Docker Compose** 2.0+
- **Git**
- **Text Editor** (nano, vim, or notepad)

### Server Requirements

**Minimum:**
- 2 CPU cores
- 4 GB RAM
- 20 GB storage
- Ubuntu 20.04+, Windows Server 2019+, or CentOS 8+

**Recommended for Production:**
- 4+ CPU cores
- 8+ GB RAM
- 50+ GB SSD
- Ubuntu 22.04 LTS

### Network Requirements

**Ports to Open:**
- `80` - HTTP
- `443` - HTTPS
- `22` - SSH (for management)
- `3000` - Backend API (optional, if not using reverse proxy)

---

## Installation on Windows Server

### Step 1: Install Docker Desktop

#### Windows Server 2019/2022 with Desktop Experience

**Download Docker Desktop:**
1. Visit: https://www.docker.com/products/docker-desktop
2. Download Docker Desktop for Windows
3. Run installer

**Install:**
```powershell
# Run as Administrator
Start-Process 'Docker Desktop Installer.exe' -Wait -ArgumentList 'install'
```

**Enable WSL 2:**
```powershell
# Enable WSL
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart

# Enable Virtual Machine Platform
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart

# Restart
Restart-Computer

# After restart, set WSL 2 as default
wsl --set-default-version 2
```

#### Windows Server Core (No GUI)

**Install Docker Engine:**
```powershell
# Install Docker provider
Install-Module -Name DockerMsftProvider -Repository PSGallery -Force

# Install Docker
Install-Package -Name docker -ProviderName DockerMsftProvider

# Start Docker service
Start-Service Docker

# Set to start automatically
Set-Service Docker -StartupType Automatic
```

**Verify Installation:**
```powershell
docker --version
docker compose version
```

### Step 2: Clone Repository

```powershell
# Navigate to desired directory
cd C:\

# Clone repository
git clone https://github.com/aswathm786/mini-ecom.git
cd mini-ecom
```

### Step 3: Configure Environment

```powershell
# Copy example environment file
Copy-Item .env.example .env

# Edit configuration
notepad .env
```

**Key configurations for Windows:**

```bash
# Use Windows paths or container paths
UPLOAD_DIR=./uploads
LOG_DIR=./storage/logs
BACKUP_DIR=./storage/backups

# MongoDB connection (Docker)
MONGO_URI=mongodb://admin:changeme@mongo:27017/miniecom?authSource=admin

# Windows line endings (if needed)
# Git handles this automatically
```

### Step 4: Start Services

```powershell
# Start all services
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f
```

### Step 5: Initialize Database

```powershell
# Initialize schema
.\scripts\init_schema.ps1

# Run migrations (requires Git Bash or WSL)
bash scripts/migrate.sh
# OR if WSL installed:
wsl bash scripts/migrate.sh

# Create admin user
node scripts/seed_admin.js
```

### Step 6: Configure Windows Firewall

```powershell
# Allow HTTP
New-NetFirewallRule -DisplayName "HTTP" -Direction Inbound -LocalPort 80 -Protocol TCP -Action Allow

# Allow HTTPS
New-NetFirewallRule -DisplayName "HTTPS" -Direction Inbound -LocalPort 443 -Protocol TCP -Action Allow

# Allow backend API (if needed)
New-NetFirewallRule -DisplayName "Backend API" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
```

### Step 7: Create Windows Service (Optional)

Create a scheduled task to start Docker containers on boot:

```powershell
# Create startup script
@"
@echo off
cd C:\mini-ecom
docker compose up -d
"@ | Out-File -FilePath C:\mini-ecom\start.bat -Encoding ASCII

# Create scheduled task
$action = New-ScheduledTaskAction -Execute 'C:\mini-ecom\start.bat'
$trigger = New-ScheduledTaskTrigger -AtStartup
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount
Register-ScheduledTask -TaskName "MiniEcom" -Action $action -Trigger $trigger -Principal $principal
```

---

## Installation on Linux

### Step 1: Install Docker

#### Ubuntu 20.04/22.04

```bash
# Update package index
sudo apt-get update

# Install dependencies
sudo apt-get install -y ca-certificates curl gnupg lsb-release

# Add Docker's official GPG key
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Set up repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Verify installation
docker --version
docker compose version
```

#### CentOS 8/RHEL 8

```bash
# Install dependencies
sudo yum install -y yum-utils

# Add Docker repository
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo

# Install Docker
sudo yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Start Docker
sudo systemctl start docker
sudo systemctl enable docker

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Verify installation
docker --version
docker compose version
```

#### Debian 11

```bash
# Update and install dependencies
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg lsb-release

# Add Docker GPG key
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Add repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Configure user
sudo usermod -aG docker $USER
newgrp docker
```

### Step 2: Clone Repository

```bash
# Navigate to deployment directory
cd /opt

# Clone repository
sudo git clone https://github.com/aswathm786/mini-ecom.git
cd mini-ecom

# Set permissions
sudo chown -R $USER:$USER .
```

### Step 3: Configure Environment

```bash
# Copy example file
cp .env.example .env

# Edit configuration
nano .env
# OR
vim .env
```

**Production Configuration:**

```bash
# Application
APP_ENV=production
NODE_ENV=production
APP_URL=https://yourstore.com
API_URL=https://api.yourstore.com

# Security
JWT_SECRET=$(openssl rand -base64 32)
SESSION_SECRET=$(openssl rand -base64 32)
CSRF_SECRET=$(openssl rand -base64 32)

# Database
MONGO_URI=mongodb://admin:strongpassword@mongo:27017/miniecom?authSource=admin
MONGO_ROOT_PASSWORD=strongpassword

# Admin
ADMIN_EMAIL=admin@yourstore.com
ADMIN_PASSWORD=StrongPassword123!

# Enable security features
COOKIE_SECURE=true
ENABLE_RATE_LIMIT=true
REQUIRE_ADMIN_2FA=true
```

### Step 4: Configure Firewall

#### Ubuntu (UFW)

```bash
# Enable firewall
sudo ufw enable

# Allow SSH (important!)
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Verify rules
sudo ufw status
```

#### CentOS/RHEL (firewalld)

```bash
# Start firewall
sudo systemctl start firewalld
sudo systemctl enable firewalld

# Allow services
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --permanent --add-service=ssh

# Reload
sudo firewall-cmd --reload

# Verify
sudo firewall-cmd --list-all
```

### Step 5: Start Services

```bash
# Start services
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f
```

### Step 6: Initialize Database

```bash
# Make scripts executable
chmod +x scripts/*.sh

# Initialize MongoDB schema
bash scripts/init_schema.sh

# Run migrations
bash scripts/migrate.sh

# Create admin user
node scripts/seed_admin.js

# Optional: Seed sample data
bash scripts/seed_sample_data.sh
```

### Step 7: Create Systemd Service

```bash
# Create service file
sudo nano /etc/systemd/system/miniecom.service
```

**Service file content:**

```ini
[Unit]
Description=Handmade Harmony E-Commerce
Requires=docker.service
After=docker.service network-online.target
Wants=network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/mini-ecom
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
TimeoutStartSec=300

[Install]
WantedBy=multi-user.target
```

**Enable service:**

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable service
sudo systemctl enable miniecom.service

# Start service
sudo systemctl start miniecom.service

# Check status
sudo systemctl status miniecom.service
```

---

## Production Deployment

### Production Docker Compose

Create `docker-compose.prod.yml` or use the included one:

```yaml
version: '3.8'

services:
  mongo:
    restart: always
    volumes:
      - mongo_data:/data/db
      - mongo_config:/data/configdb
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  api:
    restart: always
    environment:
      - NODE_ENV=production
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  frontend:
    restart: always
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

volumes:
  mongo_data:
  mongo_config:
```

**Start production:**

```bash
# Build production images
docker compose -f docker-compose.yml -f docker-compose.prod.yml build

# Start services
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Resource Limits

Add resource constraints:

```yaml
services:
  api:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G

  mongo:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

---

## Docker Compose Configuration

### Service Definitions

The project includes multiple Docker Compose files:

#### docker-compose.yml (Base)

Core services definition:
- MongoDB database
- Backend API
- Frontend application

#### docker-compose.prod.yml (Production)

Production overrides:
- Restart policies
- Logging configuration
- Resource limits

#### docker-compose.dev.yml (Development)

Development features:
- Volume mounts for live reload
- Debug ports exposed
- Development environment variables

### Environment-Specific Deployment

**Development:**
```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
```

**Production:**
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

---

## Container Management

### Basic Operations

**Start services:**
```bash
docker compose up -d
```

**Stop services:**
```bash
docker compose down
```

**Restart a service:**
```bash
docker compose restart api
docker compose restart frontend
docker compose restart mongo
```

**View logs:**
```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f api
docker compose logs -f mongo

# Last 100 lines
docker compose logs --tail=100 api
```

**Check status:**
```bash
docker compose ps
```

**Execute commands in container:**
```bash
# Open shell in API container
docker compose exec api sh

# Run command
docker compose exec api npm run migrate

# Access MongoDB shell
docker compose exec mongo mongosh -u admin -p changeme
```

### Updating the Application

**Method 1: Pull and Rebuild**

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker compose build
docker compose up -d

# Run migrations if needed
docker compose exec api npm run migrate
```

**Method 2: Zero-Downtime Update**

```bash
# Pull new images
docker compose pull

# Restart services one by one
docker compose up -d --no-deps --build api
docker compose up -d --no-deps --build frontend
```

### Database Backup

```bash
# Backup MongoDB
docker compose exec mongo mongodump --out=/backup --authenticationDatabase=admin -u admin -p changeme

# Copy backup from container
docker compose cp mongo:/backup ./backup-$(date +%Y%m%d)

# OR use backup script
bash scripts/backup.sh
```

### Database Restore

```bash
# Copy backup to container
docker compose cp ./backup-20240101 mongo:/restore

# Restore
docker compose exec mongo mongorestore /restore --authenticationDatabase=admin -u admin -p changeme

# OR use restore script
bash scripts/restore.sh --backup storage/backups/20240101_120000.tar.gz --confirm
```

---

## Scaling and Load Balancing

### Scale Services

**Scale backend API:**
```bash
docker compose up -d --scale api=3
```

### Add Load Balancer

Create `docker-compose.lb.yml`:

```yaml
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
    depends_on:
      - api
      - frontend
```

**Nginx configuration for load balancing:**

```nginx
upstream api_backend {
    least_conn;
    server api:3000 weight=1 max_fails=3 fail_timeout=30s;
    # Add more API instances
    # server api-2:3000 weight=1;
    # server api-3:3000 weight=1;
}

server {
    listen 80;
    server_name yourstore.com;

    location /api {
        proxy_pass http://api_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location / {
        proxy_pass http://frontend;
        proxy_set_header Host $host;
    }
}
```

---

## Troubleshooting

### Common Issues

#### Containers Won't Start

**Check logs:**
```bash
docker compose logs
```

**Check specific service:**
```bash
docker compose logs mongo
docker compose logs api
```

**Verify configuration:**
```bash
docker compose config
```

#### Port Conflicts

**Find what's using the port:**

**Windows:**
```powershell
netstat -ano | findstr :80
netstat -ano | findstr :3000
```

**Linux:**
```bash
sudo lsof -i :80
sudo lsof -i :3000
```

**Change ports in docker-compose.yml:**
```yaml
services:
  frontend:
    ports:
      - "8080:80"  # Use port 8080 instead
```

#### MongoDB Connection Issues

**Test connection:**
```bash
docker compose exec mongo mongosh --eval "db.adminCommand('ping')"
```

**Check MongoDB logs:**
```bash
docker compose logs mongo
```

**Recreate MongoDB container:**
```bash
docker compose stop mongo
docker compose rm mongo
docker compose up -d mongo
```

#### Out of Disk Space

**Check disk usage:**
```bash
df -h
```

**Clean Docker resources:**
```bash
# Remove unused containers
docker container prune

# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune

# Remove everything unused
docker system prune -a --volumes
```

**Check Docker disk usage:**
```bash
docker system df
```

#### Performance Issues

**Check resource usage:**
```bash
docker stats
```

**Increase resource limits:**

Edit `docker-compose.yml`:
```yaml
services:
  api:
    deploy:
      resources:
        limits:
          memory: 4G
```

#### Container Keeps Restarting

**Check logs:**
```bash
docker compose logs --tail=50 api
```

**Inspect container:**
```bash
docker inspect mini-ecom-api-1
```

**Check health:**
```bash
docker compose ps
```

---

## Advanced Topics

### Using External MongoDB

If using MongoDB Atlas or external MongoDB:

```yaml
# docker-compose.yml
services:
  # Remove mongo service
  # mongo:
  #   ...

  api:
    environment:
      - MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/miniecom?retryWrites=true&w=majority
```

### SSL Termination

Handle SSL at Docker level:

```yaml
services:
  nginx:
    image: nginx:alpine
    ports:
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - /etc/letsencrypt:/etc/letsencrypt:ro
```

### Docker Swarm (Multi-Server)

```bash
# Initialize swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.yml miniecom

# Scale services
docker service scale miniecom_api=3
```

### Health Checks

Add health checks to services:

```yaml
services:
  api:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

---

## Next Steps

After deploying with Docker:

1. **Set up SSL/HTTPS**: [SSL Setup Guide](ssl-https-setup.md)
2. **Configure Backups**: [Backup Guide](../operations/backup-restore.md)
3. **Set up Monitoring**: [Monitoring Guide](../operations/monitoring.md)
4. **Review Security**: [Production Checklist](production-checklist.md)

---

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Docker Security Best Practices](https://docs.docker.com/engine/security/)
- [Production Checklist](production-checklist.md)

---

**Deployment complete!** Your store is now running with Docker. 🎉

