# Native Host Deployment Guide

Complete guide for deploying Handmade Harmony directly on Windows and Linux servers without Docker.

## 📋 Table of Contents

- [When to Use Native Deployment](#when-to-use-native-deployment)
- [Prerequisites](#prerequisites)
- [Windows Server Deployment](#windows-server-deployment)
- [Linux Deployment](#linux-deployment)
- [Process Management](#process-management)
- [Nginx Configuration](#nginx-configuration)
- [SSL/HTTPS Setup](#sslhttps-setup)
- [Troubleshooting](#troubleshooting)

---

## When to Use Native Deployment

### Advantages

- ⚡ **Maximum Performance**: No container overhead
- 🎯 **Full Control**: Direct access to all system resources
- 🔧 **Custom Configuration**: Fine-tune every aspect
- 💾 **Lower Resource Usage**: Less memory overhead

### Disadvantages

- ⏱️ **Setup Complexity**: More manual configuration
- 🔄 **Consistency**: Environment differences across systems
- 📦 **Updates**: Manual dependency management
- 🔀 **Portability**: Harder to move between servers

### Best Use Cases

- Maximum performance requirements
- Specific OS/hardware optimization needed
- Existing infrastructure integration
- Development environments

---

## Prerequisites

### Required Software

**All Platforms:**
- Node.js 18.x or higher
- npm 9.x or higher
- MongoDB 7.x or higher
- Git

**Windows Specific:**
- Windows Server 2019+ or Windows 10/11
- PowerShell 5.1+
- Visual C++ Build Tools (for native modules)

**Linux Specific:**
- Ubuntu 20.04+, CentOS 8+, or Debian 11+
- systemd (for service management)
- Nginx or Apache (for reverse proxy)
- build-essential package

### Server Requirements

**Minimum:**
- 2 CPU cores @ 2.0 GHz
- 4 GB RAM
- 20 GB storage

**Recommended:**
- 4+ CPU cores @ 2.5 GHz
- 8+ GB RAM
- 50+ GB SSD

---

## Windows Server Deployment

### Step 1: Install Node.js

**Download and Install:**

1. Visit [nodejs.org](https://nodejs.org)
2. Download LTS version (18.x)
3. Run installer

**Or using Chocolatey:**
```powershell
# Install Chocolatey if not installed
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Install Node.js
choco install nodejs-lts -y
```

**Verify Installation:**
```powershell
node --version
npm --version
```

### Step 2: Install MongoDB

**Using MSI Installer:**

1. Download from [mongodb.com/try/download/community](https://www.mongodb.com/try/download/community)
2. Run MSI installer
3. Choose "Complete" installation
4. Install as Windows Service
5. Install MongoDB Compass (optional)

**Or using Chocolatey:**
```powershell
choco install mongodb -y
```

**Start MongoDB:**
```powershell
# Start service
Start-Service MongoDB

# Set to start automatically
Set-Service MongoDB -StartupType Automatic

# Verify
Get-Service MongoDB
```

**Create Database and User:**
```powershell
# Connect to MongoDB
mongosh

# In MongoDB shell:
use admin
db.createUser({
  user: "admin",
  pwd: "strongpassword",
  roles: ["root"]
})

use miniecom
db.createUser({
  user: "miniecom",
  pwd: "dbpassword",
  roles: ["readWrite", "dbAdmin"]
})
exit
```

### Step 3: Install Git

**Download and Install:**
1. Visit [git-scm.com](https://git-scm.com/download/win)
2. Download installer
3. Run with default options

**Or using Chocolatey:**
```powershell
choco install git -y
```

### Step 4: Clone and Setup Application

```powershell
# Create application directory
New-Item -ItemType Directory -Path C:\inetpub\miniecom -Force
cd C:\inetpub\miniecom

# Clone repository
git clone https://github.com/aswathm786/mini-ecom.git .

# Install backend dependencies
cd backend
npm install
npm run build
cd ..

# Install frontend dependencies
cd frontend
npm install
npm run build
cd ..
```

### Step 5: Configure Application

```powershell
# Copy environment file
Copy-Item .env.example .env

# Edit configuration
notepad .env
```

**Windows Production Configuration:**

```bash
# Application
APP_ENV=production
NODE_ENV=production
APP_URL=https://yourstore.com
API_URL=https://api.yourstore.com

# Database (Native MongoDB)
MONGO_URI=mongodb://miniecom:dbpassword@localhost:27017/miniecom?authSource=miniecom

# Security Secrets
JWT_SECRET=generate_strong_32_char_secret
SESSION_SECRET=generate_strong_32_char_secret
CSRF_SECRET=generate_strong_32_char_secret

# Server Ports
PORT=3000
FRONTEND_PORT=5173

# Admin Credentials
ADMIN_EMAIL=admin@yourstore.com
ADMIN_PASSWORD=StrongPassword123!

# File Paths (Windows)
UPLOAD_DIR=C:\\inetpub\\miniecom\\uploads
LOG_DIR=C:\\inetpub\\miniecom\\storage\\logs
BACKUP_DIR=C:\\inetpub\\miniecom\\storage\\backups
```

### Step 6: Initialize Database

```powershell
# Run initialization script
.\scripts\init_schema.ps1

# Run migrations
bash scripts/migrate.sh
# OR if Git Bash is available:
& "C:\Program Files\Git\bin\bash.exe" scripts/migrate.sh

# Create admin user
node scripts/seed_admin.js
```

### Step 7: Install PM2 (Process Manager)

```powershell
# Install PM2 globally
npm install -g pm2
npm install -g pm2-windows-service

# Configure PM2 as Windows Service
pm2-service-install -n PM2
```

### Step 8: Start Application with PM2

**Create PM2 Ecosystem File:**

```powershell
# Create ecosystem.config.js
@"
module.exports = {
  apps: [
    {
      name: 'miniecom-api',
      cwd: 'C:/inetpub/miniecom/backend',
      script: 'dist/server.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: 'C:/inetpub/miniecom/storage/logs/api-error.log',
      out_file: 'C:/inetpub/miniecom/storage/logs/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
}
"@ | Out-File -FilePath ecosystem.config.js -Encoding UTF8
```

**Start with PM2:**

```powershell
# Start application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Set PM2 to startup on boot
pm2 startup

# Check status
pm2 status
pm2 logs
```

### Step 9: Install and Configure IIS (Optional)

**Install IIS:**
```powershell
# Install IIS
Install-WindowsFeature -name Web-Server -IncludeManagementTools

# Install URL Rewrite module
# Download from: https://www.iis.net/downloads/microsoft/url-rewrite
```

**Configure IIS as Reverse Proxy:**

Create `C:\inetpub\wwwroot\web.config`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="API Proxy" stopProcessing="true">
          <match url="^api/(.*)" />
          <action type="Rewrite" url="http://localhost:3000/api/{R:1}" />
        </rule>
        <rule name="Frontend" stopProcessing="true">
          <match url="(.*)" />
          <action type="Rewrite" url="http://localhost:5173/{R:1}" />
        </rule>
      </rules>
    </rewrite>
  </system.webServer>
</configuration>
```

### Step 10: Configure Windows Firewall

```powershell
# Allow HTTP
New-NetFirewallRule -DisplayName "HTTP" -Direction Inbound -LocalPort 80 -Protocol TCP -Action Allow

# Allow HTTPS
New-NetFirewallRule -DisplayName "HTTPS" -Direction Inbound -LocalPort 443 -Protocol TCP -Action Allow
```

---

## Linux Deployment

### Step 1: Update System

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt upgrade -y
```

**CentOS/RHEL:**
```bash
sudo yum update -y
# OR for CentOS 8+:
sudo dnf update -y
```

### Step 2: Install Node.js

**Ubuntu/Debian:**
```bash
# Add NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# Install Node.js
sudo apt install -y nodejs

# Verify
node --version
npm --version
```

**CentOS/RHEL:**
```bash
# Add NodeSource repository
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -

# Install Node.js
sudo yum install -y nodejs

# Verify
node --version
npm --version
```

### Step 3: Install MongoDB

**Ubuntu 22.04:**
```bash
# Import MongoDB public GPG key
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
  sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

# Create list file
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
  sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Update and install
sudo apt update
sudo apt install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Verify
sudo systemctl status mongod
```

**CentOS 8/RHEL 8:**
```bash
# Create repository file
sudo cat > /etc/yum.repos.d/mongodb-org-7.0.repo << EOF
[mongodb-org-7.0]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/8/mongodb-org/7.0/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://www.mongodb.org/static/pgp/server-7.0.asc
EOF

# Install MongoDB
sudo yum install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Verify
sudo systemctl status mongod
```

**Create Database User:**
```bash
# Connect to MongoDB
mongosh

# In MongoDB shell:
use admin
db.createUser({
  user: "admin",
  pwd: "strongpassword",
  roles: ["root"]
})

use miniecom
db.createUser({
  user: "miniecom",
  pwd: "dbpassword",
  roles: ["readWrite", "dbAdmin"]
})
exit
```

### Step 4: Clone and Setup Application

```bash
# Create application directory
sudo mkdir -p /opt/miniecom
cd /opt/miniecom

# Clone repository
sudo git clone https://github.com/aswathm786/mini-ecom.git .

# Set ownership
sudo chown -R $USER:$USER .

# Install backend dependencies
cd backend
npm install
npm run build
cd ..

# Install frontend dependencies
cd frontend
npm install
npm run build
cd ..
```

### Step 5: Configure Application

```bash
# Copy environment file
cp .env.example .env

# Edit configuration
nano .env
# OR
vim .env
```

**Linux Production Configuration:**

```bash
# Application
APP_ENV=production
NODE_ENV=production
APP_URL=https://yourstore.com
API_URL=https://api.yourstore.com

# Database
MONGO_URI=mongodb://miniecom:dbpassword@localhost:27017/miniecom?authSource=miniecom

# Security Secrets (generate with: openssl rand -base64 32)
JWT_SECRET=your_generated_secret_here
SESSION_SECRET=your_generated_secret_here
CSRF_SECRET=your_generated_secret_here

# Server
PORT=3000

# Admin
ADMIN_EMAIL=admin@yourstore.com
ADMIN_PASSWORD=StrongPassword123!

# Paths
UPLOAD_DIR=/opt/miniecom/uploads
LOG_DIR=/opt/miniecom/storage/logs
BACKUP_DIR=/opt/miniecom/storage/backups
```

### Step 6: Create Required Directories

```bash
# Create directories
mkdir -p storage/logs storage/backups uploads

# Set permissions
chmod -R 775 storage uploads
```

### Step 7: Initialize Database

```bash
# Make scripts executable
chmod +x scripts/*.sh

# Initialize schema
bash scripts/init_schema.sh

# Run migrations
bash scripts/migrate.sh

# Create admin user
node scripts/seed_admin.js

# Optional: Seed sample data
bash scripts/seed_sample_data.sh
```

### Step 8: Install PM2

```bash
# Install PM2 globally
sudo npm install -g pm2

# Create PM2 ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'miniecom-api',
      cwd: '/opt/miniecom/backend',
      script: 'dist/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: '/opt/miniecom/storage/logs/api-error.log',
      out_file: '/opt/miniecom/storage/logs/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
}
EOF

# Start application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Generate startup script
pm2 startup systemd
# Run the command that PM2 outputs

# Check status
pm2 status
pm2 logs
```

### Step 9: Configure Firewall

**Ubuntu (UFW):**
```bash
# Enable firewall
sudo ufw enable

# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Verify
sudo ufw status
```

**CentOS/RHEL (firewalld):**
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

---

## Process Management

### Using PM2 (Recommended)

**Basic Commands:**

```bash
# Start application
pm2 start ecosystem.config.js

# Stop application
pm2 stop miniecom-api

# Restart application
pm2 restart miniecom-api

# Delete from PM2
pm2 delete miniecom-api

# View logs
pm2 logs miniecom-api

# Monitor
pm2 monit

# List processes
pm2 list
```

**Advanced PM2 Features:**

```bash
# Zero-downtime reload
pm2 reload miniecom-api

# Scale instances
pm2 scale miniecom-api 4

# View detailed info
pm2 show miniecom-api

# Save current processes
pm2 save

# Resurrect saved processes
pm2 resurrect
```

### Using systemd (Alternative)

**Create Service File:**

```bash
sudo nano /etc/systemd/system/miniecom-api.service
```

**Service Content:**

```ini
[Unit]
Description=Handmade Harmony API
After=network.target mongod.service
Wants=mongod.service

[Service]
Type=simple
User=miniecom
WorkingDirectory=/opt/miniecom/backend
Environment="NODE_ENV=production"
Environment="PORT=3000"
ExecStart=/usr/bin/node dist/server.js
Restart=always
RestartSec=10
StandardOutput=append:/opt/miniecom/storage/logs/api.log
StandardError=append:/opt/miniecom/storage/logs/api-error.log

[Install]
WantedBy=multi-user.target
```

**Enable and Start:**

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable service
sudo systemctl enable miniecom-api

# Start service
sudo systemctl start miniecom-api

# Check status
sudo systemctl status miniecom-api

# View logs
sudo journalctl -u miniecom-api -f
```

---

## Nginx Configuration

### Install Nginx

**Ubuntu/Debian:**
```bash
sudo apt install -y nginx
```

**CentOS/RHEL:**
```bash
sudo yum install -y nginx
# OR
sudo dnf install -y nginx
```

### Configure Nginx

**Create Site Configuration:**

```bash
sudo nano /etc/nginx/sites-available/miniecom
```

**Configuration Content:**

```nginx
# Upstream backend
upstream api_backend {
    least_conn;
    server localhost:3000 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

# HTTP Server (redirect to HTTPS)
server {
    listen 80;
    listen [::]:80;
    server_name yourstore.com www.yourstore.com;
    
    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    # Redirect to HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS Server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name yourstore.com www.yourstore.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/yourstore.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourstore.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Frontend static files
    root /opt/miniecom/frontend/dist;
    index index.html;

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json application/javascript;

    # API Proxy
    location /api {
        proxy_pass http://api_backend;
        proxy_http_version 1.1;
        
        # Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Buffering
        proxy_buffering off;
        proxy_request_buffering off;
    }

    # Frontend - SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Static assets caching
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Uploaded files
    location /uploads {
        alias /opt/miniecom/uploads;
        expires 1y;
        add_header Cache-Control "public";
    }

    # Health check
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
```

**Enable Site:**

```bash
# Create symbolic link (Ubuntu/Debian)
sudo ln -s /etc/nginx/sites-available/miniecom /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## SSL/HTTPS Setup

### Using Let's Encrypt

**Install Certbot:**

**Ubuntu/Debian:**
```bash
sudo apt install -y certbot python3-certbot-nginx
```

**CentOS/RHEL:**
```bash
sudo yum install -y certbot python3-certbot-nginx
# OR
sudo dnf install -y certbot python3-certbot-nginx
```

**Obtain Certificate:**

```bash
# Obtain and configure
sudo certbot --nginx -d yourstore.com -d www.yourstore.com

# Follow prompts to enter email and agree to terms
```

**Auto-Renewal:**

```bash
# Test renewal
sudo certbot renew --dry-run

# Renewal is automatically configured via systemd timer or cron
```

**Full Guide:** [SSL Setup](ssl-https-setup.md)

---

## Troubleshooting

### Application Won't Start

**Check logs:**
```bash
# PM2
pm2 logs miniecom-api

# systemd
sudo journalctl -u miniecom-api -n 100 --no-pager
```

**Common issues:**
- MongoDB not running: `sudo systemctl start mongod`
- Port in use: `sudo lsof -i :3000`
- Permission issues: `sudo chown -R $USER:$USER /opt/miniecom`

### MongoDB Connection Issues

**Test connection:**
```bash
mongosh "mongodb://miniecom:dbpassword@localhost:27017/miniecom?authSource=miniecom"
```

**Check MongoDB status:**
```bash
sudo systemctl status mongod
```

**View MongoDB logs:**
```bash
sudo tail -f /var/log/mongodb/mongod.log
```

### Nginx Issues

**Test configuration:**
```bash
sudo nginx -t
```

**Check Nginx status:**
```bash
sudo systemctl status nginx
```

**View Nginx logs:**
```bash
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### Performance Issues

**Check system resources:**
```bash
# CPU and memory
htop
# OR
top

# Disk usage
df -h

# Disk I/O
iostat -x 1
```

**Optimize PM2:**
```bash
# Increase instances
pm2 scale miniecom-api 4

# Enable cluster mode in ecosystem.config.js
instances: 'max'
exec_mode: 'cluster'
```

---

## Next Steps

1. **Configure SSL**: [SSL Setup Guide](ssl-https-setup.md)
2. **Set Up Backups**: [Backup Guide](../operations/backup-restore.md)
3. **Enable Monitoring**: [Monitoring Guide](../operations/monitoring.md)
4. **Review Security**: [Production Checklist](production-checklist.md)

---

**Deployment complete!** Your store is running natively on your server. 🎉

