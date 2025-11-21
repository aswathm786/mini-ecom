# Installation Guide

This comprehensive guide covers both Docker and native installation methods for Windows, macOS, and Linux.

## 📋 Table of Contents

- [Before You Begin](#before-you-begin)
- [Method 1: Docker Installation (Recommended)](#method-1-docker-installation-recommended)
- [Method 2: Native Installation](#method-2-native-installation)
- [Post-Installation Steps](#post-installation-steps)
- [Verification](#verification)
- [Troubleshooting](#troubleshooting)

---

## Before You Begin

###Prerequisites Check

Ensure you've completed the [Prerequisites](prerequisites.md) guide:

- [ ] Docker installed (Docker method) OR Node.js + MongoDB (Native method)
- [ ] Git installed
- [ ] At least 10 GB free disk space
- [ ] Required ports available (80, 3000, 27017)

---

## Method 1: Docker Installation (Recommended)

Docker provides the easiest and most consistent installation experience across all platforms.

### Step 1: Get the Code

#### Option A: Download ZIP

1. Visit [GitHub Repository](https://github.com/aswathm786/mini-ecom)
2. Click **Code** → **Download ZIP**
3. Extract to your desired location:
   - Windows: `C:\miniecom`
   - Mac/Linux: `~/miniecom`

#### Option B: Clone with Git

**Windows (PowerShell):**
```powershell
cd C:\
git clone https://github.com/aswathm786/mini-ecom.git
cd mini-ecom
```

**Mac/Linux:**
```bash
cd ~
git clone https://github.com/aswathm786/mini-ecom.git
cd mini-ecom
```

### Step 2: Create Environment Configuration

**Windows (PowerShell):**
```powershell
Copy-Item .env.example .env
```

**Mac/Linux:**
```bash
cp .env.example .env
```

### Step 3: Configure Environment Variables

Open `.env` file in your text editor:

**Windows:**
```powershell
notepad .env
```

**Mac:**
```bash
nano .env
# or
code .env  # if using VS Code
```

**Linux:**
```bash
nano .env
# or
vim .env
```

**Minimum Required Configuration:**

```bash
# ============================================
# SECURITY SECRETS (REQUIRED - CHANGE THESE!)
# ============================================
JWT_SECRET=generate_a_random_32_character_string_here
SESSION_SECRET=another_random_32_character_string_here
CSRF_SECRET=yet_another_random_32_character_here

# ============================================
# ADMIN CREDENTIALS (REQUIRED)
# ============================================
ADMIN_EMAIL=admin@yourstore.com
ADMIN_PASSWORD=YourSecurePassword123!

# ============================================
# DATABASE (Default works with Docker)
# ============================================
MONGO_URI=mongodb://admin:changeme@mongo:27017/miniecom?authSource=admin
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=changeme
```

**Generate Secure Secrets:**

**Windows (PowerShell):**
```powershell
# Run this command 3 times to generate 3 different secrets
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

**Mac/Linux:**
```bash
# Run this command 3 times to generate 3 different secrets
openssl rand -base64 32
```

Copy each generated secret to `JWT_SECRET`, `SESSION_SECRET`, and `CSRF_SECRET`.

### Step 4: Start Services with Docker

#### Development Mode

**All Platforms:**
```bash
docker compose up -d
```

This starts:
- MongoDB database
- Backend API server
- Frontend web server

**Check status:**
```bash
docker compose ps
```

All services should show `running` state.

**View logs:**
```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f api
docker compose logs -f frontend
docker compose logs -f mongo
```

#### Production Mode

**All Platforms:**
```bash
# Build production images
docker compose -f docker-compose.yml -f docker-compose.prod.yml build

# Start production services
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Step 5: Initialize Database

**Linux/Mac:**
```bash
# Initialize MongoDB schema (creates collections and indexes)
bash scripts/init_schema.sh

# Run migrations
bash scripts/migrate.sh

# Create admin user
node scripts/seed_admin.js

# (Optional) Add sample data
bash scripts/seed_sample_data.sh
```

**Windows (PowerShell):**
```powershell
# Initialize MongoDB schema
.\scripts\init_schema.ps1

# Run migrations (requires Git Bash or WSL)
bash scripts/migrate.sh
# OR using WSL:
wsl bash scripts/migrate.sh

# Create admin user
node scripts/seed_admin.js

# (Optional) Add sample data
bash scripts/seed_sample_data.sh
# OR using WSL:
wsl bash scripts/seed_sample_data.sh
```

### Step 6: Access Your Store

Open your browser and navigate to:

- **Storefront**: http://localhost
- **Admin Panel**: http://localhost/admin
- **API Health**: http://localhost:3000/api/health

**Login to Admin:**
- Email: Value from `ADMIN_EMAIL` in `.env`
- Password: Value from `ADMIN_PASSWORD` in `.env`

---

## Method 2: Native Installation

Install and run all components directly on your system (without Docker).

### Step 1: Install Prerequisites

Ensure you have installed:
- Node.js 18+
- npm 9+
- MongoDB 7+
- Git

See [Prerequisites](prerequisites.md) for installation instructions.

### Step 2: Get the Code

**Windows (PowerShell):**
```powershell
cd C:\
git clone https://github.com/aswathm786/mini-ecom.git
cd mini-ecom
```

**Mac/Linux:**
```bash
cd ~
git clone https://github.com/aswathm786/mini-ecom.git
cd mini-ecom
```

### Step 3: Install Dependencies

**Backend:**
```bash
cd backend
npm install
cd ..
```

**Frontend:**
```bash
cd frontend
npm install
cd ..
```

### Step 4: Configure Environment

**Windows (PowerShell):**
```powershell
Copy-Item .env.example .env
notepad .env
```

**Mac/Linux:**
```bash
cp .env.example .env
nano .env
```

**Native Installation Configuration:**

```bash
# ============================================
# SECURITY SECRETS (REQUIRED)
# ============================================
JWT_SECRET=your_generated_secret_here
SESSION_SECRET=your_generated_secret_here
CSRF_SECRET=your_generated_secret_here

# ============================================
# ADMIN CREDENTIALS (REQUIRED)
# ============================================
ADMIN_EMAIL=admin@yourstore.com
ADMIN_PASSWORD=YourSecurePassword123!

# ============================================
# DATABASE (For Native Installation)
# ============================================
MONGO_URI=mongodb://localhost:27017/miniecom

# ============================================
# SERVER PORTS
# ============================================
PORT=3000
FRONTEND_PORT=5173

# ============================================
# APPLICATION URLS
# ============================================
API_URL=http://localhost:3000
APP_URL=http://localhost:5173
```

### Step 5: Start MongoDB

**Windows:**

**Option A: Using Services**
1. Open Services (Win + R, type `services.msc`)
2. Find "MongoDB" service
3. Right-click → Start

**Option B: Using PowerShell (as Administrator)**
```powershell
Start-Service MongoDB
```

**Verify:**
```powershell
Get-Service MongoDB
```

**Mac:**
```bash
# Start MongoDB
brew services start mongodb-community@7.0

# Verify
brew services list
```

**Linux:**
```bash
# Start MongoDB
sudo systemctl start mongod

# Enable to start on boot
sudo systemctl enable mongod

# Verify
sudo systemctl status mongod
```

### Step 6: Initialize Database

**Mac/Linux:**
```bash
# Initialize schema
bash scripts/init_schema.sh

# Run migrations
bash scripts/migrate.sh

# Create admin user
node scripts/seed_admin.js

# (Optional) Seed sample data
bash scripts/seed_sample_data.sh
```

**Windows (PowerShell):**
```powershell
# Initialize schema
.\scripts\init_schema.ps1

# Run migrations
bash scripts/migrate.sh
# OR using WSL:
wsl bash scripts/migrate.sh

# Create admin user
node scripts/seed_admin.js

# (Optional) Seed sample data
bash scripts/seed_sample_data.sh
```

### Step 7: Start Services

You'll need **two terminal windows**.

**Terminal 1: Backend**

**Windows (PowerShell):**
```powershell
cd backend
npm run dev
```

**Mac/Linux:**
```bash
cd backend
npm run dev
```

Backend will start on http://localhost:3000

**Terminal 2: Frontend**

**Windows (PowerShell):**
```powershell
cd frontend
npm run dev
```

**Mac/Linux:**
```bash
cd frontend
npm run dev
```

Frontend will start on http://localhost:5173

### Step 8: Access Your Store

- **Storefront**: http://localhost:5173
- **Admin Panel**: http://localhost:5173/admin
- **API Health**: http://localhost:3000/api/health

---

## Post-Installation Steps

### 1. Verify Installation

**Check all services are running:**

**Docker Method:**
```bash
docker compose ps
```

**Native Method:**
- Backend running on http://localhost:3000
- Frontend running on http://localhost:5173
- MongoDB running (check with `mongosh`)

**Test health endpoints:**

**Windows (PowerShell):**
```powershell
# Test backend
Invoke-WebRequest -Uri http://localhost:3000/api/health

# Test frontend (Docker)
Invoke-WebRequest -Uri http://localhost/health
```

**Mac/Linux:**
```bash
# Test backend
curl http://localhost:3000/api/health

# Test frontend (Docker)
curl http://localhost/health
```

### 2. Login to Admin Panel

1. Navigate to http://localhost/admin (Docker) or http://localhost:5173/admin (Native)
2. Enter credentials from `.env`:
   - Email: `ADMIN_EMAIL`
   - Password: `ADMIN_PASSWORD`
3. You should see the admin dashboard

### 3. Configure Features (Optional)

#### Payment Gateway

1. Sign up for [Razorpay](https://razorpay.com)
2. Get API keys from dashboard
3. Update `.env`:
   ```bash
   RAZORPAY_KEY_ID=rzp_test_xxxxx
   RAZORPAY_KEY_SECRET=your_secret
   RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
   ```
4. Restart services

**Guide**: [Payment Setup](../features/payment/razorpay-setup.md)

#### Shipping Integration

1. Sign up for [Delhivery](https://delhivery.com)
2. Get API credentials
3. Update `.env`:
   ```bash
   DELHIVERY_TOKEN=your_token
   DELHIVERY_CLIENT_ID=your_client_id
   ```
4. Restart services

**Guide**: [Shipping Setup](../features/shipping/delhivery-setup.md)

#### Email Configuration

1. Get SMTP credentials (Gmail, SendGrid, etc.)
2. Update `.env`:
   ```bash
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your_email@gmail.com
   SMTP_PASS=your_app_password
   SMTP_FROM="Your Store <noreply@yourstore.com>"
   ```
3. Restart services

**Guide**: [Email Setup](../features/email/smtp-setup.md)

#### AI Assistant

1. Get Google Gemini API key
2. Update `.env`:
   ```bash
   GEMINI_API_KEY=your_api_key
   ```
3. Restart services

**Guide**: [AI Setup](../features/ai-assistant/gemini-setup.md)

### 4. Enable Two-Factor Authentication

1. Login to admin panel
2. Go to Profile → Security
3. Enable 2FA and scan QR code with authenticator app

**Guide**: [2FA Setup](../features/authentication/2fa-setup.md)

---

## Verification

### Functionality Checklist

After installation, verify these features:

**Storefront:**
- [ ] Homepage loads
- [ ] Can browse products
- [ ] Can search products
- [ ] Can add items to cart
- [ ] Can proceed to checkout

**Admin Panel:**
- [ ] Can login with admin credentials
- [ ] Dashboard displays
- [ ] Can view products list
- [ ] Can view orders list
- [ ] Settings page loads

**API:**
- [ ] Health endpoint responds: http://localhost:3000/api/health
- [ ] CSRF token endpoint responds: http://localhost:3000/api/csrf-token

### Performance Check

**Response Times:**
- Homepage: < 2 seconds
- Product page: < 1 second
- API requests: < 500ms

**Resource Usage (Docker):**
```bash
docker stats
```

Should show reasonable CPU and memory usage (< 2 GB total).

---

## Troubleshooting

### Common Issues

#### "Port already in use"

**Find what's using the port:**

**Windows (PowerShell):**
```powershell
# Find process using port 80
netstat -ano | findstr :80

# Find process using port 3000
netstat -ano | findstr :3000

# Kill process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

**Mac/Linux:**
```bash
# Find process using port 80
sudo lsof -i :80

# Find process using port 3000
sudo lsof -i :3000

# Kill process
kill -9 <PID>
```

**Or change ports in `.env`:**
```bash
FRONTEND_PORT=8080
PORT=3001
```

#### "Cannot connect to MongoDB"

**Docker Method:**
```bash
# Check MongoDB container
docker compose ps mongo

# View MongoDB logs
docker compose logs mongo

# Test connection
docker compose exec mongo mongosh --eval "db.adminCommand('ping')"
```

**Native Method:**

**Check MongoDB status:**

**Windows:**
```powershell
Get-Service MongoDB
```

**Mac:**
```bash
brew services list | grep mongodb
```

**Linux:**
```bash
sudo systemctl status mongod
```

**Start MongoDB if stopped:**

**Windows:**
```powershell
Start-Service MongoDB
```

**Mac:**
```bash
brew services start mongodb-community@7.0
```

**Linux:**
```bash
sudo systemctl start mongod
```

#### "Admin login doesn't work"

1. **Verify credentials in `.env`**
2. **Recreate admin user:**
   ```bash
   node scripts/seed_admin.js
   ```
3. **Check backend logs for errors:**
   ```bash
   # Docker
   docker compose logs api
   
   # Native
   # Check terminal where backend is running
   ```

#### "Frontend shows blank page"

**Docker Method:**
```bash
# Rebuild frontend
docker compose build frontend
docker compose up -d frontend

# Check logs
docker compose logs frontend
```

**Native Method:**
```bash
# Clear and rebuild
cd frontend
rm -rf node_modules dist
npm install
npm run build
npm run dev
```

#### "Permission errors" (Linux/Mac)

```bash
# Fix file permissions
sudo chown -R $USER:$USER .
chmod -R 755 storage/
chmod +x scripts/*.sh
```

#### "Docker daemon not running"

**Windows/Mac:**
- Start Docker Desktop application
- Wait for green "Docker is running" indicator

**Linux:**
```bash
sudo systemctl start docker
sudo systemctl enable docker
```

### Getting More Help

If you're still experiencing issues:

1. Check [Troubleshooting Guide](../operations/troubleshooting.md)
2. Review [FAQ](../FAQ.md)
3. Search [GitHub Issues](https://github.com/aswathm786/mini-ecom/issues)
4. Open a new issue with:
   - Your operating system
   - Installation method used
   - Error messages and logs
   - Steps to reproduce

---

## Next Steps

### Configure Your Store

- [Configuration Guide](configuration.md) - Detailed environment configuration
- [Admin Guide](../features/admin/README.md) - Learn the admin panel
- [Add Products](../features/admin/product-management.md) - Start adding products

### Prepare for Production

- [Production Checklist](../deployment/production-checklist.md) - Go-live preparation
- [SSL/HTTPS Setup](../deployment/ssl-https-setup.md) - Secure your site
- [Backup Setup](../operations/backup-restore.md) - Protect your data

### Customize and Extend

- [Developer Guide](../developer/README.md) - Development documentation
- [API Reference](../developer/api-reference.md) - API documentation
- [Contributing](../developer/contributing.md) - Contribute to the project

---

**Installation complete!** 🎉 Your e-commerce store is now ready to use.

