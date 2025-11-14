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
- [Accessing the Application](#accessing-the-application)
- [Admin Tasks](#admin-tasks)
- [Developer Guide](#developer-guide)
- [Troubleshooting](#troubleshooting)
- [Security & Maintenance](#security--maintenance)
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

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/miniecom.git
   cd miniecom
   ```

2. **Set up environment:**
   ```bash
   cp .env.example .env
   # Edit .env and fill in your configuration (see Configuration section)
   ```

3. **Run quick start script:**
   ```bash
   chmod +x scripts/quick_start.sh
   ./scripts/quick_start.sh
   ```

4. **Access the application:**
   - Frontend: http://localhost:80
   - Backend API: http://localhost:3000
   - Admin Login: http://localhost/admin (use credentials from `.env`)

**That's it!** The script will:
- Start all Docker containers
- Run database migrations
- Seed sample data
- Create admin user

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

```bash
git clone https://github.com/yourusername/miniecom.git
cd miniecom
```

#### Step 2: Configure Environment

```bash
cp .env.example .env
nano .env  # or use your favorite editor
```

**Critical settings to configure:**
- `MONGO_URI` - MongoDB connection string
- `JWT_SECRET` - Random secret for JWT tokens (generate with: `openssl rand -base64 32`)
- `SESSION_SECRET` - Random secret for sessions (generate with: `openssl rand -base64 32`)
- `CSRF_SECRET` - Random secret for CSRF protection
- `ADMIN_EMAIL` - Your admin email
- `ADMIN_PASSWORD` - Your admin password

**Optional but recommended:**
- `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` - For payment processing
- `DELHIVERY_TOKEN` and `DELHIVERY_CLIENT_ID` - For shipping
- `SMTP_*` settings - For email notifications

See [Configuration](#configuration) section for full details.

#### Step 3: Start Services

**Development mode (with live reload):**
```bash
# Set in .env: USE_BIND_MOUNTS=1
docker compose up -d
```

**Production mode:**
```bash
# Set in .env: USE_BIND_MOUNTS=0
docker compose build --no-cache
docker compose up -d
```

#### Step 4: Run Migrations and Seed Data

```bash
# Run database migrations
./scripts/migrate.sh

# Create admin user
node scripts/seed_admin.js

# Seed sample data (optional)
./scripts/seed_sample_data.sh
```

#### Step 5: Verify Installation

```bash
# Check health endpoints
curl http://localhost:3000/api/health
curl http://localhost/health

# Check container status
docker compose ps
```

### Method 2: Native Install (Without Docker)

If you cannot use Docker, you can run the application natively. See [docs/native_install.md](docs/native_install.md) for complete instructions.

**Quick summary:**
1. Install Node.js, npm, and MongoDB
2. Install dependencies: `npm install` in both `frontend/` and `backend/`
3. Start MongoDB service
4. Run migrations: `node backend/migrations/run.js`
5. Start backend: `cd backend && npm run dev`
6. Start frontend: `cd frontend && npm run dev`

---

## Configuration

### Environment Variables

All configuration is done through the `.env` file. Copy `.env.example` to `.env` and fill in your values.

#### Critical Variables (Required)

```bash
# MongoDB
MONGO_URI=mongodb://admin:changeme@mongo:27017/miniecom?authSource=admin

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

Use these commands to generate secure random secrets:

```bash
# Generate JWT secret
openssl rand -base64 32

# Generate session secret
openssl rand -base64 32

# Generate CSRF secret
openssl rand -base64 32
```

---

## Running the Application

### Development Mode

**With Docker:**
```bash
# Set USE_BIND_MOUNTS=1 in .env
docker compose up -d
```

**Without Docker:**
```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

### Production Mode

**With Docker:**
```bash
# Set USE_BIND_MOUNTS=0 in .env
docker compose build --no-cache
docker compose up -d
```

**Without Docker:**
```bash
# Build frontend
cd frontend
npm run build

# Start backend
cd backend
npm start
```

### Stopping the Application

```bash
# Docker
docker compose down

# Native
# Press Ctrl+C in each terminal
```

---

## First-Time Setup

### 1. Create Admin User

The admin user is created automatically when you run:
```bash
node scripts/seed_admin.js
```

**Default credentials** (from `.env`):
- Email: `ADMIN_EMAIL` value
- Password: `ADMIN_PASSWORD` value

**Change admin password after first login:**
1. Log in to admin panel
2. Go to Profile > Change Password
3. Enter new password

### 2. Seed Sample Data

To populate your store with sample products:
```bash
./scripts/seed_sample_data.sh
```

This creates:
- Sample categories (Handmade Jewelry, Art & Paintings, etc.)
- Sample products with images
- Sample users (optional)

### 3. Configure Payment Gateway

1. Log in to admin panel
2. Go to Settings > Payment
3. Enter Razorpay credentials
4. Toggle "Enable Razorpay" to ON
5. Test with test keys first

See [docs/payment_setup.md](docs/payment_setup.md) for details.

### 4. Configure Shipping

1. Log in to admin panel
2. Go to Settings > Shipping
3. Enter Delhivery credentials
4. Test connection

See [docs/shipping_setup.md](docs/shipping_setup.md) for details.

### 5. Configure Email

1. Log in to admin panel
2. Go to Settings > Email
3. Enter SMTP settings
4. Send test email

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

### MongoDB (Optional)

If you enabled Mongo Express:
- **URL**: http://localhost:8081
- **Login**: Use `MONGO_ROOT_USERNAME` and `MONGO_ROOT_PASSWORD` from `.env`

---

## Admin Tasks

For detailed admin task guides, see [docs/admin_quickguide.md](docs/admin_quickguide.md).

### Quick Admin Tasks

1. **Create Product:**
   - Go to Admin > Products > Add New
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

**Backend:**
```bash
cd backend
npm run dev  # Uses nodemon for auto-reload
```

**Frontend:**
```bash
cd frontend
npm run dev  # Vite dev server with HMR
```

### Running Tests

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

### Adding Database Migrations

1. Create migration file: `backend/migrations/YYYYMMDDHHMMSS_description.js`
2. Write idempotent migration (see [docs/developer_guide.md](docs/developer_guide.md))
3. Run: `./scripts/migrate.sh`

---

## Troubleshooting

For detailed troubleshooting, see [docs/troubleshooting.md](docs/troubleshooting.md).

### Common Issues

**1. Docker containers won't start:**
```bash
# Check logs
docker compose logs

# Check container status
docker compose ps

# Restart containers
docker compose restart
```

**2. Port already in use:**
```bash
# Find process using port
sudo lsof -i :3000
sudo lsof -i :80

# Kill process or change port in .env
```

**3. MongoDB connection failed:**
```bash
# Check MongoDB container
docker compose ps mongo
docker compose logs mongo

# Test connection
docker compose exec mongo mongosh --eval "db.adminCommand('ping')"
```

**4. Permission errors:**
```bash
# Fix permissions
./scripts/fix-perms.sh

# Or manually
chmod -R 775 storage/
chown -R $USER:$USER storage/
```

**5. CSRF/Session errors:**
- Clear browser cookies
- Check `SESSION_SECRET` and `CSRF_SECRET` in `.env`
- Ensure cookies are enabled in browser

---

## Security & Maintenance

### Backups

**Automated backups:**
- Backups run daily (configured via systemd timer or cron)
- Backups include: MongoDB, uploads, configuration
- Retention: 14 days daily, 12 weeks weekly, 12 months monthly

**Manual backup:**
```bash
./scripts/backup.sh
```

**Restore from backup:**
```bash
./scripts/restore.sh --backup storage/backups/YYYYMMDD_HHMMSS.tar.gz --confirm
```

See [docs/backup_restore.md](docs/backup_restore.md) for details.

### Monitoring

**Service monitoring:**
```bash
./scripts/monitor_services.sh
```

**Disk space monitoring:**
```bash
./scripts/disk_alert.sh
```

See [docs/monitoring.md](docs/monitoring.md) for details.

### Maintenance

**Run maintenance tasks:**
```bash
./scripts/run_maintenance_tasks.sh
```

**Enter maintenance mode:**
```bash
./scripts/enter_maintenance.sh "Scheduled maintenance"
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

## FAQ

See [docs/faq.md](docs/faq.md) for comprehensive FAQ with 10+ questions and answers.

**Quick answers:**

**Q: How do I enable 2FA?**
A: See [docs/2fa_setup.md](docs/2fa_setup.md)

**Q: How do I generate PDF invoices?**
A: See [docs/invoice_pdf.md](docs/invoice_pdf.md)

**Q: How do I test payments locally?**
A: See [docs/payment_setup.md](docs/payment_setup.md)

**Q: How do I restore from backup?**
A: See [docs/restore_quick.md](docs/restore_quick.md)

---

## Support

### Getting Help

If you encounter issues:

1. **Check logs:**
   ```bash
   tail -f storage/logs/ops.log
   docker compose logs
   ```

2. **Check troubleshooting guide:** [docs/troubleshooting.md](docs/troubleshooting.md)

3. **Open GitHub issue:**
   - Include system info (OS, Docker version, Node version)
   - Include last 100 lines of logs
   - Include `docker compose ps` output
   - Include `docker compose logs` output

### Contact

**Store Owner Contact** (update this section):
- Email: support@handmadeharmony.com
- Phone: +1-234-567-8900
- Website: https://handmadeharmony.com

---

## Additional Documentation

- [Quick Start Guide](docs/setup_quickstart.md) - For non-coders
- [Native Install Guide](docs/native_install.md) - Install without Docker
- [Admin Quick Guide](docs/admin_quickguide.md) - Admin tasks
- [Developer Guide](docs/developer_guide.md) - Development docs
- [Troubleshooting](docs/troubleshooting.md) - Common issues
- [FAQ](docs/faq.md) - Frequently asked questions
- [Go-Live Checklist](docs/checklist_go_live.md) - Before going live
- [Payment Setup](docs/payment_setup.md) - Razorpay configuration
- [Shipping Setup](docs/shipping_setup.md) - Delhivery configuration
- [2FA Setup](docs/2fa_setup.md) - Two-factor authentication
- [Invoice PDF](docs/invoice_pdf.md) - PDF generation
- [Backup & Restore](docs/backup_restore.md) - Backup procedures
- [Monitoring](docs/monitoring.md) - Monitoring setup
- [Maintenance](docs/maintenance.md) - Maintenance procedures

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
