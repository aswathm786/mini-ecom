# Getting Started with Handmade Harmony

Welcome! This guide will help you get Handmade Harmony up and running in just a few minutes.

## 🎯 Choose Your Path

### For Non-Technical Users
If you're not familiar with command-line tools or programming, start here:
- [Prerequisites](prerequisites.md#for-non-technical-users) - What you need
- Quick setup with Docker (recommended)
- Step-by-step visual guide

### For Developers
If you're comfortable with command-line tools:
- [Prerequisites](prerequisites.md#for-developers) - System requirements
- [Installation](installation.md) - Detailed setup
- [Configuration](configuration.md) - Environment customization

## 🚀 Quick Start (5 Minutes)

### Step 1: Install Docker

**Windows/Mac:**
1. Download [Docker Desktop](https://www.docker.com/products/docker-desktop)
2. Install and start Docker Desktop
3. Wait for the green "Docker is running" indicator

**Linux:**
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker
```

### Step 2: Get the Code

**Option A: Download ZIP**
1. Go to [GitHub Repository](https://github.com/aswathm786/mini-ecom)
2. Click "Code" → "Download ZIP"
3. Extract to a folder (e.g., `C:\miniecom` or `~/miniecom`)

**Option B: Clone with Git**
```bash
git clone https://github.com/aswathm786/mini-ecom.git
cd mini-ecom
```

### Step 3: Configure

**On Windows (PowerShell):**
```powershell
Copy-Item .env.example .env
notepad .env
```

**On Linux/Mac:**
```bash
cp .env.example .env
nano .env
```

**Minimum configuration** - Edit these lines in `.env`:
```bash
# Change these to strong passwords
JWT_SECRET=your_random_32_character_string_here
SESSION_SECRET=another_random_32_character_string
CSRF_SECRET=yet_another_random_32_character

# Your admin credentials
ADMIN_EMAIL=admin@yourstore.com
ADMIN_PASSWORD=YourSecurePassword123!
```

**Generate secrets:**

**Linux/Mac:**
```bash
openssl rand -base64 32
```

**Windows (PowerShell):**
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

### Step 4: Start Everything

**Navigate to project directory:**
```bash
cd mini-ecom  # or wherever you extracted/cloned
```

**Start services:**
```bash
docker compose up -d
```

**Wait** for services to start (30-60 seconds). Check status:
```bash
docker compose ps
```

All services should show "running" status.

### Step 5: Initialize Database

**On Linux/Mac:**
```bash
# Initialize MongoDB schema
bash scripts/init_schema.sh

# Run migrations
bash scripts/migrate.sh

# Create admin user
node scripts/seed_admin.js

# (Optional) Add sample products
bash scripts/seed_sample_data.sh
```

**On Windows (PowerShell):**
```powershell
# Initialize MongoDB schema
.\scripts\init_schema.ps1

# Run migrations (requires Git Bash or WSL)
bash scripts/migrate.sh
# OR using WSL:
wsl bash scripts/migrate.sh

# Create admin user
node scripts/seed_admin.js

# (Optional) Add sample products
bash scripts/seed_sample_data.sh
# OR using WSL:
wsl bash scripts/seed_sample_data.sh
```

### Step 6: Access Your Store! 🎉

Open your browser and visit:

- **Storefront**: http://localhost
- **Admin Panel**: http://localhost/admin
  - Email: (your `ADMIN_EMAIL`)
  - Password: (your `ADMIN_PASSWORD`)

**🎊 Congratulations!** Your e-commerce store is now running!

## 📚 What's Next?

### Configure Features

1. **Payment Processing** - Accept payments
   - [Razorpay Setup](../features/payment/razorpay-setup.md)
   
2. **Shipping Integration** - Automated shipping
   - [Delhivery Setup](../features/shipping/delhivery-setup.md)
   
3. **Email Notifications** - Send emails to customers
   - [SMTP Setup](../features/email/smtp-setup.md)
   
4. **AI Assistant** - Generate product descriptions
   - [Gemini Setup](../features/ai-assistant/gemini-setup.md)

5. **Security** - Enable two-factor authentication
   - [2FA Setup](../features/authentication/2fa-setup.md)

### Learn the Admin Panel

- [Admin Guide](../features/admin/README.md) - Complete admin documentation
- [Product Management](../features/admin/product-management.md) - Add products
- [Order Management](../features/admin/order-management.md) - Process orders
- [User Management](../features/admin/user-management.md) - Manage customers

### Prepare for Production

- [Production Checklist](../deployment/production-checklist.md) - Go-live preparation
- [SSL/HTTPS Setup](../deployment/ssl-https-setup.md) - Secure your site
- [Backup Setup](../operations/backup-restore.md) - Protect your data
- [Monitoring](../operations/monitoring.md) - Keep an eye on your store

## 🆘 Troubleshooting

### Common Issues

**Docker won't start:**
- Ensure Docker Desktop is running (Windows/Mac)
- Check Docker service: `sudo systemctl status docker` (Linux)

**Port already in use:**
```bash
# Find what's using the port (Windows)
netstat -ano | findstr :80
netstat -ano | findstr :3000

# Find what's using the port (Linux/Mac)
sudo lsof -i :80
sudo lsof -i :3000
```

**Can't connect to MongoDB:**
```bash
# Check MongoDB container
docker compose ps mongo
docker compose logs mongo

# Verify connection
docker compose exec mongo mongosh --eval "db.adminCommand('ping')"
```

**Admin login doesn't work:**
1. Verify credentials in `.env` file
2. Recreate admin user:
   ```bash
   node scripts/seed_admin.js
   ```

**Permission errors (Linux):**
```bash
sudo chown -R $USER:$USER storage/
chmod -R 775 storage/
```

### Get More Help

- [Troubleshooting Guide](../operations/troubleshooting.md) - Comprehensive solutions
- [FAQ](../FAQ.md) - Frequently asked questions
- [GitHub Issues](https://github.com/aswathm786/mini-ecom/issues) - Report bugs

## 📖 Detailed Guides

Want more details? Check out these guides:

- **[Prerequisites](prerequisites.md)** - Detailed system requirements
- **[Installation](installation.md)** - Comprehensive installation guide
- **[Configuration](configuration.md)** - All environment variables explained

---

**Ready to dive deeper?** Continue to [Installation Guide](installation.md) for advanced setup options.

