# Handmade Harmony (MiniEcom) 🛍️

A full-featured e-commerce platform built with React, Node.js, and MongoDB. Perfect for selling handmade products, art, and crafts online.

![Project Status](https://img.shields.io/badge/status-production--ready-green)
![License](https://img.shields.io/badge/license-MIT-blue)

## 📋 Table of Contents

- [What is Handmade Harmony?](#what-is-handmade-harmony)
- [Quick Start (5 Minutes)](#quick-start-5-minutes)
- [Prerequisites](#prerequisites)
- [Installation Methods](#installation-methods)
  - [Method 1: Docker Compose (Recommended)](#method-1-docker-compose-recommended)
  - [Method 2: Native Install (Without Docker)](#method-2-native-install-without-docker)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [First-Time Setup](#first-time-setup)
- [Using the Application](#using-the-application)
- [Common Commands Reference](#common-commands-reference)
- [Accessing the Application](#accessing-the-application)
- [Admin Tasks](#admin-tasks)
- [Developer Guide](#developer-guide)
- [Troubleshooting](#troubleshooting)
- [Security & Maintenance](#security--maintenance)
- [Documentation Overview](#documentation-overview)
- [FAQ](#faq)
- [Support](#support)

---

## What is Handmade Harmony?

Handmade Harmony is a complete e-commerce solution designed for small businesses and artisans selling handmade products. It includes:

- ✅ **Product Catalog**: Categories, products, search, filters
- ✅ **Shopping Cart**: Add to cart, quantity management
- ✅ **Checkout & Payments**: Razorpay integration, COD support
- ✅ **Order Management**: Order tracking, invoices, refunds
- ✅ **Shipping**: Delhivery integration for automated shipping
- ✅ **User Accounts**: Registration, login, profile management
- ✅ **Admin Dashboard**: Complete admin panel with RBAC
- ✅ **Security**: CSRF protection, session management, 2FA support
- ✅ **Invoices**: PDF invoice generation
- ✅ **Support Tickets**: Customer support system

---

## Quick Start (5 Minutes)

**For non-developers**: See [docs/setup_quickstart.md](docs/setup_quickstart.md) for a super simple guide.

**For developers**:

### Step 1: Clone the Repository

**📍 Run on: HOST (your computer)**

```bash
git clone https://github.com/aswathm786/mini-ecom.git
cd mini-ecom
```

### Step 2: Set Up Environment

**📍 Run on: HOST (your computer)**

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env file with your favorite editor
nano .env  # or use: code .env, vim .env, notepad .env
```

**Minimum required settings in `.env`:**
```bash
JWT_SECRET=your_jwt_secret_here
SESSION_SECRET=your_session_secret_here
CSRF_SECRET=your_csrf_secret_here
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your_secure_password
```

**Generate secrets:**
```bash
# On Linux/Mac
openssl rand -base64 32

# On Windows (PowerShell)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

### Step 3: Start the Application

**📍 Run on: HOST (your computer)**

```bash
# Make scripts executable (Linux/Mac)
chmod +x scripts/*.sh

# Start all services with Docker Compose
docker compose up -d

# Wait for services to start (30-60 seconds)
docker compose ps
```

### Step 4: Run Initial Setup

**📍 Run on: HOST (your computer)**

**On Linux/Mac:**
```bash
# Run database migrations
./scripts/migrate.sh

# Create admin user
node scripts/seed_admin.js

# (Optional) Seed sample products
./scripts/seed_sample_data.sh
```

**On Windows (PowerShell):**
```powershell
# Run database migrations (using Git Bash or WSL)
bash scripts/migrate.sh
# OR if you have WSL:
wsl bash scripts/migrate.sh

# Create admin user
node scripts/seed_admin.js

# (Optional) Seed sample products
bash scripts/seed_sample_data.sh
# OR using WSL:
wsl bash scripts/seed_sample_data.sh
```

**Alternative for Windows (Direct Node.js):**
If you prefer not to use bash scripts, you can run migrations directly:
```powershell
# Make sure MongoDB is running first
# Then run migrations using Node.js directly
# (Check backend/migrations/ directory for migration files)
node backend/migrations/run.js
```

### Step 5: Access the Application

- **Frontend**: http://localhost:80
- **Backend API**: http://localhost:3000/api/health
- **Admin Panel**: http://localhost/admin
  - Email: (value from `ADMIN_EMAIL` in `.env`)
  - Password: (value from `ADMIN_PASSWORD` in `.env`)

**That's it!** Your e-commerce platform is now running.

---

## Prerequisites

### For Docker Method (Recommended)

- **Docker** (version 20.10+)
- **Docker Compose** (version 2.0+)
- **Git** (to clone the repository)

**Install Docker on Ubuntu:**
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker
```

**Install Docker on Windows/Mac:**
- Download and install [Docker Desktop](https://www.docker.com/products/docker-desktop)

**Verify Docker installation:**
```bash
docker --version
docker compose version
```

### For Native Install

- **Node.js** (version 18+)
- **npm** (version 9+)
- **MongoDB** (version 7+)
- **Git**

See [docs/native_install.md](docs/native_install.md) for detailed installation instructions.

---

## Installation Methods

### Method 1: Docker Compose (Recommended)

Docker Compose is the easiest way to run Handmade Harmony. It handles all dependencies automatically.

#### Step 1: Clone the Repository

**📍 Run on: HOST (your computer)**

```bash
git clone https://github.com/aswathm786/mini-ecom.git
cd mini-ecom
```

#### Step 2: Configure Environment

**📍 Run on: HOST (your computer)**

**On Linux/Mac:**
```bash
cp .env.example .env
nano .env  # or use your favorite editor
```

**On Windows (PowerShell):**
```powershell
Copy-Item .env.example .env
notepad .env  # or use: code .env, notepad++ .env
```

**Critical settings to configure:**
- `MONGO_URI` - MongoDB connection string (default works for Docker)
- `JWT_SECRET` - Random secret for JWT tokens (generate with: `openssl rand -base64 32`)
- `SESSION_SECRET` - Random secret for sessions (generate with: `openssl rand -base64 32`)
- `CSRF_SECRET` - Random secret for CSRF protection (generate with: `openssl rand -base64 32`)
- `ADMIN_EMAIL` - Your admin email
- `ADMIN_PASSWORD` - Your admin password

**Optional but recommended:**
- `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` - For payment processing
- `DELHIVERY_TOKEN` and `DELHIVERY_CLIENT_ID` - For shipping
- `SMTP_*` settings - For email notifications

See [Configuration](#configuration) section for full details.

#### Step 3: Start Services

**📍 Run on: HOST (your computer)**

**Development mode (with live reload):**
```bash
# Set in .env: USE_BIND_MOUNTS=1
docker compose -f docker-compose.dev.yml up -d
```

**Production mode:**
```bash
# Set in .env: USE_BIND_MOUNTS=0
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d
```

**Standard mode (uses main docker-compose.yml):**
```bash
docker compose up -d
```

#### Step 4: Run Migrations and Seed Data

**📍 Run on: HOST (your computer)**

**On Linux/Mac:**
```bash
# Run database migrations
./scripts/migrate.sh

# Create admin user
node scripts/seed_admin.js

# Seed sample data (optional)
./scripts/seed_sample_data.sh
```

**On Windows (PowerShell):**
```powershell
# Run database migrations (using Git Bash or WSL)
bash scripts/migrate.sh
# OR using WSL:
wsl bash scripts/migrate.sh

# Create admin user
node scripts/seed_admin.js

# Seed sample data (optional)
bash scripts/seed_sample_data.sh
# OR using WSL:
wsl bash scripts/seed_sample_data.sh
```

#### Step 5: Verify Installation

**📍 Run on: HOST (your computer)**

**On Linux/Mac:**
```bash
# Check health endpoints
curl http://localhost:3000/api/health
curl http://localhost/health

# Check container status
docker compose ps

# View logs
docker compose logs -f
```

**On Windows (PowerShell):**
```powershell
# Check health endpoints
Invoke-WebRequest -Uri http://localhost:3000/api/health
Invoke-WebRequest -Uri http://localhost/health
# OR use curl if available:
curl http://localhost:3000/api/health

# Check container status
docker compose ps

# View logs
docker compose logs -f
```

### Method 2: Native Install (Without Docker)

If you cannot use Docker, you can run the application natively. See [docs/native_install.md](docs/native_install.md) for complete instructions.

**Quick summary:**

**📍 Run on: HOST (your computer)**

```bash
# 1. Install Node.js, npm, and MongoDB
# 2. Install dependencies
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# 3. Start MongoDB service
# On Linux:
sudo systemctl start mongod
# On Mac:
brew services start mongodb-community
# On Windows:
# Start MongoDB service from Services panel

# 4. Run migrations
node backend/migrations/run.js

# 5. Start backend (Terminal 1)
cd backend
npm run dev

# 6. Start frontend (Terminal 2)
cd frontend
npm run dev
```

---

## Configuration

### Environment Variables

All configuration is done through the `.env` file. Copy `.env.example` to `.env` and fill in your values.

**📍 Edit on: HOST (your computer)**

#### Critical Variables (Required)

```bash
# MongoDB
MONGO_URI=mongodb://admin:changeme@mongo:27017/miniecom?authSource=admin
# For native install, use:
# MONGODB_URI=mongodb://localhost:27017/miniecom

# Security Secrets (generate random strings)
JWT_SECRET=your_jwt_secret_here
SESSION_SECRET=your_session_secret_here
CSRF_SECRET=your_csrf_secret_here

# Admin User
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your_secure_password
```

#### Payment Gateway (Razorpay)

```bash
RAZORPAY_KEY_ID=rzp_test_YOUR_KEY_ID
RAZORPAY_KEY_SECRET=YOUR_RAZORPAY_KEY_SECRET
RAZORPAY_WEBHOOK_SECRET=YOUR_WEBHOOK_SECRET
```

**How to get Razorpay keys:**
1. Sign up at [Razorpay Dashboard](https://dashboard.razorpay.com)
2. Go to Settings > API Keys
3. Generate test keys (for development)
4. Copy Key ID and Key Secret to `.env`

See [docs/payment_setup.md](docs/payment_setup.md) for detailed setup.

#### Shipping (Delhivery)

```bash
DELHIVERY_TOKEN=YOUR_DELHIVERY_TOKEN
DELHIVERY_CLIENT_ID=YOUR_DELHIVERY_CLIENT_ID
```

**How to get Delhivery credentials:**
1. Sign up at [Delhivery Developer Portal](https://delhivery.com/developer)
2. Create an API token
3. Copy token and client ID to `.env`

See [docs/shipping_setup.md](docs/shipping_setup.md) for detailed setup.

#### Email (SMTP)

```bash
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your_smtp_username
SMTP_PASS=your_smtp_password
SMTP_FROM="Handmade Harmony <noreply@handmadeharmony.com>"
```

**For production**, use a real SMTP service like:
- SendGrid
- Mailgun
- AWS SES
- Gmail (with App Password)

#### Application URLs

```bash
APP_URL=http://localhost:80
API_URL=http://localhost:3000
```

**For production**, update to your domain:
```bash
APP_URL=https://yourdomain.com
API_URL=https://api.yourdomain.com
```

### Generating Secure Secrets

**📍 Run on: HOST (your computer)**

Use these commands to generate secure random secrets:

**Linux/Mac:**
```bash
# Generate JWT secret
openssl rand -base64 32

# Generate session secret
openssl rand -base64 32

# Generate CSRF secret
openssl rand -base64 32
```

**Windows (PowerShell):**
```powershell
# Generate random base64 string
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

---

## Running the Application

### Development Mode

**📍 Run on: HOST (your computer)**

**With Docker:**
```bash
# Set USE_BIND_MOUNTS=1 in .env
docker compose -f docker-compose.dev.yml up -d

# View logs
docker compose logs -f

# Stop services
docker compose down
```

**Without Docker:**

**On Linux/Mac:**
```bash
# Terminal 1: Backend
cd backend
npm run dev  # Uses nodemon for auto-reload

# Terminal 2: Frontend
cd frontend
npm run dev  # Vite dev server with HMR
```

**On Windows (PowerShell):**
```powershell
# Terminal 1: Backend (PowerShell)
cd backend
npm run dev  # Uses nodemon for auto-reload

# Terminal 2: Frontend (PowerShell)
cd frontend
npm run dev  # Vite dev server with HMR
```

### Production Mode

**📍 Run on: HOST (your computer)**

**With Docker:**
```bash
# Set USE_BIND_MOUNTS=0 in .env
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d

# View logs
docker compose logs -f

# Stop services
docker compose down
```

**Without Docker:**

**On Linux/Mac:**
```bash
# Build frontend
cd frontend
npm run build

# Start backend
cd backend
npm start
```

**On Windows (PowerShell):**
```powershell
# Build frontend
cd frontend
npm run build

# Start backend
cd backend
npm start
```

### Stopping the Application

**📍 Run on: HOST (your computer)**

```bash
# Docker
docker compose down

# Stop specific service
docker compose stop api
docker compose stop frontend

# Stop and remove volumes (⚠️ deletes data)
docker compose down -v

# Native
# Press Ctrl+C in each terminal
```

---

## First-Time Setup

### 1. Create Admin User

**📍 Run on: HOST (your computer)**

The admin user is created automatically when you run:
```bash
node scripts/seed_admin.js
```

**Default credentials** (from `.env`):
- Email: `ADMIN_EMAIL` value
- Password: `ADMIN_PASSWORD` value

**Change admin password after first login:**
1. Log in to admin panel at http://localhost/admin
2. Go to Profile > Change Password
3. Enter new password

### 2. Seed Sample Data

**📍 Run on: HOST (your computer)**

To populate your store with sample products:
```bash
./scripts/seed_sample_data.sh
```

This creates:
- Sample categories (Handmade Jewelry, Art & Paintings, etc.)
- Sample products with images
- Sample users (optional)

### 3. Configure Payment Gateway

**📍 Run in: BROWSER (Admin Panel)**

1. Log in to admin panel: http://localhost/admin
2. Go to Settings > Payment
3. Enter Razorpay credentials from `.env`
4. Toggle "Enable Razorpay" to ON
5. Test with test keys first

See [docs/payment_setup.md](docs/payment_setup.md) for details.

### 4. Configure Shipping

**📍 Run in: BROWSER (Admin Panel)**

1. Log in to admin panel: http://localhost/admin
2. Go to Settings > Shipping
3. Enter Delhivery credentials from `.env`
4. Test connection

See [docs/shipping_setup.md](docs/shipping_setup.md) for details.

### 5. Configure Email

**📍 Run in: BROWSER (Admin Panel)**

1. Log in to admin panel: http://localhost/admin
2. Go to Settings > Email
3. Enter SMTP settings from `.env`
4. Send test email

---

## Using the Application

### For Customers

1. **Browse Products**
   - Visit http://localhost:80
   - Browse categories or search for products
   - Click on products to view details

2. **Add to Cart**
   - Click "Add to Cart" on any product
   - Adjust quantity in cart
   - View cart by clicking cart icon

3. **Checkout**
   - Click "Checkout" from cart
   - Enter shipping address
   - Choose payment method (Razorpay or COD)
   - Complete order

4. **Track Orders**
   - Log in to your account
   - Go to "My Orders"
   - View order status and tracking

5. **Support**
   - Create support tickets from account page
   - View ticket status and replies

### For Administrators

1. **Log In**
   - Visit http://localhost/admin
   - Use admin credentials from `.env`

2. **Manage Products**
   - Go to Admin > Catalog
   - Click "Add New Product"
   - Fill in details, upload images, set price
   - Save product

3. **Manage Orders**
   - Go to Admin > Orders
   - View all orders
   - Click order to view details
   - Update order status
   - Generate invoices
   - Process refunds

4. **Manage Users**
   - Go to Admin > Users
   - View user list
   - Edit user roles
   - Manage permissions

5. **Configure Settings**
   - Go to Admin > Settings
   - Update payment, shipping, email settings
   - Configure store information

See [docs/admin_quickguide.md](docs/admin_quickguide.md) for detailed admin tasks.

---

## Common Commands Reference

### Docker Commands

**📍 All commands run on: HOST (your computer)**

```bash
# Start all services
docker compose up -d

# Stop all services
docker compose down

# View logs
docker compose logs -f
docker compose logs api        # Backend logs only
docker compose logs frontend   # Frontend logs only
docker compose logs mongo      # MongoDB logs only

# Restart a service
docker compose restart api
docker compose restart frontend

# View running containers
docker compose ps

# Execute command in container
docker compose exec api sh     # Open shell in backend container
docker compose exec mongo mongosh  # Open MongoDB shell

# Rebuild containers
docker compose build
docker compose build --no-cache

# View resource usage
docker stats
```

### Database Commands

**📍 Run on: HOST (your computer)**

**On Linux/Mac:**
```bash
# Run migrations
./scripts/migrate.sh

# Access MongoDB shell (Docker)
docker compose exec mongo mongosh -u admin -p changeme

# Access MongoDB shell (Native)
mongosh mongodb://localhost:27017/miniecom

# Backup database
./scripts/backup.sh

# Restore database
./scripts/restore.sh --backup storage/backups/YYYYMMDD_HHMMSS.tar.gz --confirm
```

**On Windows (PowerShell):**
```powershell
# Run migrations
bash scripts/migrate.sh
# OR using WSL:
wsl bash scripts/migrate.sh

# Access MongoDB shell (Docker)
docker compose exec mongo mongosh -u admin -p changeme

# Access MongoDB shell (Native)
mongosh mongodb://localhost:27017/miniecom

# Backup database
bash scripts/backup.sh
# OR using WSL:
wsl bash scripts/backup.sh

# Restore database
bash scripts/restore.sh --backup storage/backups/YYYYMMDD_HHMMSS.tar.gz --confirm
# OR using WSL:
wsl bash scripts/restore.sh --backup storage/backups/YYYYMMDD_HHMMSS.tar.gz --confirm
```

### Scripts

**📍 Run on: HOST (your computer)**

**On Linux/Mac:**
```bash
# Quick start (sets up everything)
./scripts/quick_start.sh

# Create admin user
node scripts/seed_admin.js

# Seed sample data
./scripts/seed_sample_data.sh

# Health check
./scripts/healthcheck.sh

# Fix permissions
./scripts/fix-perms.sh

# Monitor services
./scripts/monitor_services.sh

# Security audit
./scripts/sec_audit.sh
```

**On Windows (PowerShell):**
```powershell
# Quick start (sets up everything)
bash scripts/quick_start.sh
# OR using WSL:
wsl bash scripts/quick_start.sh

# Create admin user
node scripts/seed_admin.js

# Seed sample data
bash scripts/seed_sample_data.sh
# OR using WSL:
wsl bash scripts/seed_sample_data.sh

# Health check
bash scripts/healthcheck.sh
# OR using WSL:
wsl bash scripts/healthcheck.sh

# Fix permissions (Windows doesn't need chmod, but you can set file attributes)
# For Windows, permissions are managed differently
icacls storage /grant Users:F /T

# Monitor services
bash scripts/monitor_services.sh
# OR using WSL:
wsl bash scripts/monitor_services.sh

# Security audit
bash scripts/sec_audit.sh
# OR using WSL:
wsl bash scripts/sec_audit.sh
```

### Container-Specific Commands

**📍 Run on: HOST (your computer) - Executes inside container**

```bash
# Run npm commands in backend container
docker compose exec api npm install
docker compose exec api npm run build
docker compose exec api npm test

# Run npm commands in frontend container
docker compose exec frontend npm install
docker compose exec frontend npm run build

# Access MongoDB directly
docker compose exec mongo mongosh --eval "db.adminCommand('ping')"

# View container environment variables
docker compose exec api env

# Copy file from container to host
docker compose cp api:/app/storage/logs/app.log ./logs/

# Copy file from host to container
docker compose cp ./config.json api:/app/config.json
```

---

## Accessing the Application

### Frontend (Customer-Facing)

- **URL**: http://localhost:80 (or your configured port)
- **Features**: Browse products, add to cart, checkout, view orders

### Admin Dashboard

- **URL**: http://localhost/admin
- **Login**: Use admin credentials from `.env`
- **Features**: Manage products, orders, users, settings

### API Documentation

- **Health Check**: http://localhost:3000/api/health
- **API Base**: http://localhost:3000/api
- **CSRF Token**: http://localhost:3000/api/csrf-token

### MongoDB (Optional)

If you enabled Mongo Express:
- **URL**: http://localhost:8081
- **Login**: Use `MONGO_ROOT_USERNAME` and `MONGO_ROOT_PASSWORD` from `.env`

**Access MongoDB shell:**
```bash
# Docker
docker compose exec mongo mongosh -u admin -p changeme

# Native
mongosh mongodb://localhost:27017/miniecom
```

---

## Admin Tasks

For detailed admin task guides, see [docs/admin_quickguide.md](docs/admin_quickguide.md).

### Quick Admin Tasks

1. **Create Product:**
   - Go to Admin > Catalog > Add New
   - Fill in name, description, price, images
   - Set category and stock
   - Save

2. **View Orders:**
   - Go to Admin > Orders
   - Click on order to view details
   - Download invoice, issue refund, update status

3. **Manage Users:**
   - Go to Admin > Users
   - View user list, edit roles, grant permissions

4. **Configure Settings:**
   - Go to Admin > Settings
   - Update payment, shipping, email settings

5. **Manage Support Tickets:**
   - Go to Admin > Support Tickets
   - View all tickets, reply, change status

---

## Developer Guide

For detailed developer documentation, see [docs/developer_guide.md](docs/developer_guide.md).

### Project Structure

```
miniecom/
├── backend/          # Node.js/Express backend
│   ├── src/
│   │   ├── controllers/  # Request handlers
│   │   ├── services/     # Business logic
│   │   ├── models/       # Data models
│   │   ├── routes/       # API routes
│   │   └── middleware/   # Express middleware
│   ├── migrations/   # Database migrations
│   └── test/        # Backend tests
├── frontend/         # React/Vite frontend
│   ├── src/
│   │   ├── pages/        # Page components
│   │   ├── components/  # Reusable components
│   │   ├── admin/        # Admin dashboard
│   │   └── hooks/        # React hooks
│   └── public/      # Static assets
├── scripts/         # Utility scripts
├── docs/            # Documentation
└── docker/          # Dockerfiles
```

### Running Development Servers

**📍 Run on: HOST (your computer)**

**Backend:**
```bash
cd backend
npm install
npm run dev  # Uses nodemon for auto-reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev  # Vite dev server with HMR
```

**Or use Docker with bind mounts:**
```bash
# Set USE_BIND_MOUNTS=1 in .env
docker compose -f docker-compose.dev.yml up -d
```

### Running Tests

**📍 Run on: HOST (your computer)**

**Backend tests:**
```bash
cd backend
npm test
```

**Frontend tests:**
```bash
cd frontend
npm test
```

**Or in Docker:**
```bash
docker compose exec api npm test
docker compose exec frontend npm test
```

### Adding Database Migrations

**📍 Run on: HOST (your computer)**

1. Create migration file: `backend/migrations/YYYYMMDDHHMMSS_description.js`
2. Write idempotent migration (see [docs/developer_guide.md](docs/developer_guide.md))
3. Run migrations:

**On Linux/Mac:**
```bash
./scripts/migrate.sh
```

**On Windows (PowerShell):**
```powershell
bash scripts/migrate.sh
# OR using WSL:
wsl bash scripts/migrate.sh
# OR directly with Node.js:
node backend/migrations/run.js
```

---

## Troubleshooting

For detailed troubleshooting, see [docs/troubleshooting.md](docs/troubleshooting.md).

### Common Issues

**1. Docker containers won't start:**

**📍 Run on: HOST (your computer)**

```bash
# Check logs
docker compose logs

# Check container status
docker compose ps

# Restart containers
docker compose restart

# Rebuild containers
docker compose build --no-cache
docker compose up -d
```

**2. Port already in use:**

**📍 Run on: HOST (your computer)**

```bash
# Find process using port (Linux/Mac)
sudo lsof -i :3000
sudo lsof -i :80

# Find process using port (Windows)
netstat -ano | findstr :3000
netstat -ano | findstr :80

# Kill process or change port in .env
```

**3. MongoDB connection failed:**

**📍 Run on: HOST (your computer)**

```bash
# Check MongoDB container
docker compose ps mongo
docker compose logs mongo

# Test connection
docker compose exec mongo mongosh --eval "db.adminCommand('ping')"

# Check MongoDB URI in .env
cat .env | grep MONGO
```

**4. Permission errors:**

**📍 Run on: HOST (your computer)**

**On Linux/Mac:**
```bash
# Fix permissions
./scripts/fix-perms.sh

# Or manually
chmod -R 775 storage/
chown -R $USER:$USER storage/
```

**On Windows (PowerShell):**
```powershell
# Windows handles file permissions differently
# Ensure you have write access to the storage folder
# If needed, run PowerShell as Administrator and grant permissions:
icacls storage /grant Users:F /T

# Or manually set folder permissions through File Explorer:
# Right-click storage folder > Properties > Security > Edit > Add your user > Full Control
```

**5. CSRF/Session errors:**
- Clear browser cookies
- Check `SESSION_SECRET` and `CSRF_SECRET` in `.env`
- Ensure cookies are enabled in browser
- Restart containers: `docker compose restart`

**6. Cannot access admin panel:**

**📍 Check:**
- Admin user created: `node scripts/seed_admin.js`
- Correct credentials in `.env`
- Containers running: `docker compose ps`
- No errors in logs: `docker compose logs api`

---

## Security & Maintenance

### Backups

**📍 Run on: HOST (your computer)**

**Automated backups:**
- Backups run daily (configured via systemd timer or cron)
- Backups include: MongoDB, uploads, configuration
- Retention: 14 days daily, 12 weeks weekly, 12 months monthly

**Manual backup:**

**On Linux/Mac:**
```bash
./scripts/backup.sh
```

**On Windows (PowerShell):**
```powershell
bash scripts/backup.sh
# OR using WSL:
wsl bash scripts/backup.sh
```

**Restore from backup:**

**On Linux/Mac:**
```bash
./scripts/restore.sh --backup storage/backups/YYYYMMDD_HHMMSS.tar.gz --confirm
```

**On Windows (PowerShell):**
```powershell
bash scripts/restore.sh --backup storage/backups/YYYYMMDD_HHMMSS.tar.gz --confirm
# OR using WSL:
wsl bash scripts/restore.sh --backup storage/backups/YYYYMMDD_HHMMSS.tar.gz --confirm
```

See [docs/backup_restore.md](docs/backup_restore.md) for details.

### Monitoring

**📍 Run on: HOST (your computer)**

**Service monitoring:**

**On Linux/Mac:**
```bash
./scripts/monitor_services.sh
```

**On Windows (PowerShell):**
```powershell
bash scripts/monitor_services.sh
# OR using WSL:
wsl bash scripts/monitor_services.sh
```

**Disk space monitoring:**

**On Linux/Mac:**
```bash
./scripts/disk_alert.sh
```

**On Windows (PowerShell):**
```powershell
bash scripts/disk_alert.sh
# OR using WSL:
wsl bash scripts/disk_alert.sh
# OR use PowerShell native command:
Get-PSDrive C | Select-Object Used,Free
```

See [docs/monitoring.md](docs/monitoring.md) for details.

### Maintenance

**📍 Run on: HOST (your computer)**

**Run maintenance tasks:**

**On Linux/Mac:**
```bash
./scripts/run_maintenance_tasks.sh
```

**On Windows (PowerShell):**
```powershell
bash scripts/run_maintenance_tasks.sh
# OR using WSL:
wsl bash scripts/run_maintenance_tasks.sh
```

**Enter maintenance mode:**

**On Linux/Mac:**
```bash
./scripts/enter_maintenance.sh "Scheduled maintenance"
```

**On Windows (PowerShell):**
```powershell
bash scripts/enter_maintenance.sh "Scheduled maintenance"
# OR using WSL:
wsl bash scripts/enter_maintenance.sh "Scheduled maintenance"
```

See [docs/maintenance.md](docs/maintenance.md) for details.

### Security Checklist

- [ ] Change default admin password
- [ ] Use strong secrets (JWT_SECRET, SESSION_SECRET)
- [ ] Enable HTTPS (see [docs/checklist_go_live.md](docs/checklist_go_live.md))
- [ ] Set up firewall rules
- [ ] Regular security audits: `./scripts/sec_audit.sh`
- [ ] Keep dependencies updated
- [ ] Rotate secrets quarterly

---

## Documentation Overview

This project includes comprehensive documentation in the `docs/` folder. Here's an overview of all available guides:

### 📚 Setup & Installation Guides

1. **[setup_quickstart.md](docs/setup_quickstart.md)** - Quick start guide for non-coders
   - Step-by-step instructions with screenshots
   - Perfect for beginners
   - Covers Docker installation and basic setup

2. **[native_install.md](docs/native_install.md)** - Install without Docker
   - Manual installation of Node.js, MongoDB, and dependencies
   - Step-by-step setup for each component
   - Troubleshooting for native installations

3. **[noncoder_runbook.md](docs/noncoder_runbook.md)** - Complete runbook for non-technical users
   - Day-to-day operations guide
   - How to perform common tasks
   - Maintenance procedures

### 🎯 Configuration Guides

4. **[payment_setup.md](docs/payment_setup.md)** - Razorpay payment gateway setup
   - Creating Razorpay account
   - Getting API keys
   - Configuring webhooks
   - Testing payments

5. **[shipping_setup.md](docs/shipping_setup.md)** - Delhivery shipping integration
   - Creating Delhivery account
   - Getting API credentials
   - Configuring shipping zones
   - Testing shipments

6. **[2fa_setup.md](docs/2fa_setup.md)** - Two-factor authentication setup
   - Enabling 2FA for admin accounts
   - Using authenticator apps
   - Backup codes and recovery

### 👨‍💼 Admin & User Guides

7. **[admin_quickguide.md](docs/admin_quickguide.md)** - Admin panel quick reference
   - Managing products and categories
   - Processing orders and refunds
   - User management
   - Settings configuration

8. **[invoice_pdf.md](docs/invoice_pdf.md)** - Invoice generation guide
   - Generating PDF invoices
   - Customizing invoice templates
   - Email delivery

### 🛠️ Developer Guides

9. **[developer_guide.md](docs/developer_guide.md)** - Complete developer documentation
   - Project structure
   - Development workflow
   - API development
   - Frontend development
   - Testing procedures
   - Code style guidelines

10. **[deploy.md](docs/deploy.md)** - Deployment guide
    - Production deployment steps
    - Server configuration
    - SSL/HTTPS setup
    - Domain configuration

### 🔧 Operations & Maintenance

11. **[backup_restore.md](docs/backup_restore.md)** - Backup and restore procedures
    - Automated backup setup
    - Manual backup procedures
    - Restore from backup
    - Backup rotation policies

12. **[restore_quick.md](docs/restore_quick.md)** - Quick restore guide
    - Emergency restore procedures
    - Step-by-step restore commands
    - Verification steps

13. **[monitoring.md](docs/monitoring.md)** - Monitoring and alerting
    - Service monitoring setup
    - Log management
    - Performance monitoring
    - Alert configuration

14. **[maintenance.md](docs/maintenance.md)** - Maintenance procedures
    - Scheduled maintenance tasks
    - Database maintenance
    - Log rotation
    - Cache management

### 🚀 Deployment & Production

15. **[checklist_go_live.md](docs/checklist_go_live.md)** - Pre-launch checklist
    - Security checklist
    - Performance optimization
    - SSL/HTTPS setup
    - Backup configuration
    - Monitoring setup

16. **[how_to_push_github.md](docs/how_to_push_github.md)** - GitHub setup guide
    - Creating GitHub repository
    - Pushing code to GitHub
    - Setting up CI/CD
    - Branch management

### ❓ Help & Support

17. **[troubleshooting.md](docs/troubleshooting.md)** - Common issues and solutions
    - Installation problems
    - Runtime errors
    - Database issues
    - Performance problems
    - Security issues

18. **[faq.md](docs/faq.md)** - Frequently asked questions
    - General questions
    - Installation questions
    - Configuration questions
    - Troubleshooting questions

### 📸 Additional Resources

19. **[screenshots/README.md](docs/screenshots/README.md)** - Screenshot gallery
    - Admin panel screenshots
    - User interface screenshots
    - Configuration screenshots

---

## FAQ

See [docs/faq.md](docs/faq.md) for comprehensive FAQ with 20+ questions and answers.

**Quick answers:**

**Q: How do I enable 2FA?**
A: See [docs/2fa_setup.md](docs/2fa_setup.md)

**Q: How do I generate PDF invoices?**
A: See [docs/invoice_pdf.md](docs/invoice_pdf.md)

**Q: How do I test payments locally?**
A: See [docs/payment_setup.md](docs/payment_setup.md)

**Q: How do I restore from backup?**
A: See [docs/restore_quick.md](docs/restore_quick.md)

**Q: Where do I run commands - host or container?**
A: Most commands run on the HOST (your computer). Commands that need to run inside containers are clearly marked with `docker compose exec`.

---

## Support

### Getting Help

If you encounter issues:

1. **Check logs:**

   **On Linux/Mac:**
   ```bash
   # Docker
   docker compose logs -f
   
   # Native
   tail -f storage/logs/ops.log
   ```

   **On Windows (PowerShell):**
   ```powershell
   # Docker
   docker compose logs -f
   
   # Native
   Get-Content storage/logs/ops.log -Wait -Tail 50
   # OR using WSL:
   wsl tail -f storage/logs/ops.log
   ```

2. **Check troubleshooting guide:** [docs/troubleshooting.md](docs/troubleshooting.md)

3. **Check FAQ:** [docs/faq.md](docs/faq.md)

4. **Open GitHub issue:**
   - Include system info (OS, Docker version, Node version)
   - Include last 100 lines of logs
   - Include `docker compose ps` output
   - Include `docker compose logs` output

### Contact

**Repository:** https://github.com/aswathm786/mini-ecom

**Store Owner Contact** (update this section):
- Email: support@handmadeharmony.com
- Phone: +1-234-567-8900
- Website: https://handmadeharmony.com

---

## License

MIT License - see LICENSE file for details

---

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

**Made with ❤️ for artisans and small businesses**
