# Handmade Harmony - E-Commerce Platform

<div align="center">

![Project Status](https://img.shields.io/badge/status-production--ready-green)
![License](https://img.shields.io/badge/license-MIT-blue)
![Node](https://img.shields.io/badge/node-18+-brightgreen)
![MongoDB](https://img.shields.io/badge/mongodb-7+-green)

**A complete, production-ready e-commerce platform built for artisans and small businesses**

[Quick Start](#-quick-start) • [Features](#-features) • [Documentation](#-documentation) • [Deployment](#-deployment) • [Support](#-support)

</div>

---

## 🎯 What is Handmade Harmony?

Handmade Harmony is a full-featured e-commerce solution designed specifically for artisans, craftspeople, and small businesses selling handmade products online. Built with modern technologies and best practices, it provides everything you need to run a professional online store.

### ✨ Key Highlights

- **Production-Ready**: Battle-tested security, performance, and reliability
- **Feature-Complete**: Shopping cart, payments, shipping, admin panel, and more
- **Easy Deployment**: Docker support for quick setup or native installation
- **Extensible**: Clean architecture with comprehensive API
- **Well-Documented**: Step-by-step guides for every feature

---

## 🚀 Quick Start

Get your store running in **5 minutes** with Docker:

```bash
# 1. Clone the repository
git clone https://github.com/aswathm786/mini-ecom.git
cd mini-ecom

# 2. Configure environment
cp .env.example .env
# Edit .env with your secrets (see Configuration section)

# 3. Start with Docker
docker compose up -d

# 4. Initialize database
bash scripts/init_schema.sh
bash scripts/migrate.sh
node scripts/seed_admin.js

# 5. Access your store
# Frontend: http://localhost
# Admin Panel: http://localhost/admin
```

**📘 Detailed Setup**: See [Getting Started Guide](docs/getting-started/README.md)

---

## 💎 Features

### Customer Features
- **Product Catalog**: Browse products with categories, search, and filters
- **Shopping Cart**: Add to cart, manage quantities, guest cart support
- **Checkout**: Guest checkout or registered user checkout
- **Payment Processing**: Razorpay integration with COD support
- **Order Tracking**: Real-time order status and timeline
- **Wishlist**: Save products for later
- **Product Reviews**: Rate and review products
- **Product Q&A**: Ask questions about products
- **Price Alerts**: Get notified when prices drop
- **User Accounts**: Registration, login, profile management
- **Two-Factor Authentication**: Enhanced account security
- **Support Tickets**: Submit and track support requests

### Admin Features
- **Dashboard**: Analytics, sales reports, key metrics
- **Product Management**: Add, edit, delete products with variants
- **Order Management**: View, process, fulfill orders
- **User Management**: Manage customers and permissions
- **Inventory Control**: Track stock levels and alerts
- **Coupon System**: Create discount codes and promotions
- **Loyalty Points**: Reward repeat customers
- **Invoice Generation**: Automatic PDF invoice creation
- **Shipping Integration**: Delhivery API for automated shipping
- **AI Assistant**: Google Gemini-powered product descriptions and FAQs
- **Email System**: Automated transactional emails
- **Settings Management**: Configure all aspects from admin panel
- **Role-Based Access Control**: Granular permissions

### Developer Features
- **RESTful API**: Well-documented API endpoints
- **TypeScript**: Full type safety
- **MongoDB**: Scalable NoSQL database
- **Docker Support**: Containerized deployment
- **Migration System**: Database version control
- **Testing Suite**: Comprehensive test coverage
- **Security**: CSRF protection, rate limiting, input validation
- **Logging**: Structured logging and audit trails

---

## 🛠️ Technology Stack

### Frontend
- **React 18** - Modern UI library
- **TypeScript** - Type-safe JavaScript
- **Vite** - Lightning-fast build tool
- **Tailwind CSS** - Utility-first CSS framework
- **React Router** - Client-side routing

### Backend
- **Node.js 18+** - JavaScript runtime
- **Express.js** - Web application framework
- **TypeScript** - Type-safe server code
- **MongoDB 7+** - NoSQL database
- **JWT** - Secure authentication
- **Argon2id** - Password hashing

### Integrations
- **Razorpay** - Payment gateway
- **Delhivery** - Shipping & logistics
- **Google Gemini** - AI assistant
- **SMTP** - Email delivery
- **Puppeteer** - PDF generation

---

## 📖 Documentation

### Getting Started
- [Installation Guide](docs/getting-started/installation.md) - Comprehensive setup instructions
- [Prerequisites](docs/getting-started/prerequisites.md) - System requirements
- [Configuration](docs/getting-started/configuration.md) - Environment variables explained
- [Quick Start](docs/getting-started/README.md) - 5-minute setup guide

### Deployment
- [Docker Deployment](docs/deployment/docker-deployment.md) - Deploy with Docker (Windows/Linux)
- [Host Deployment](docs/deployment/host-deployment.md) - Native deployment (Windows/Linux)
- [Production Checklist](docs/deployment/production-checklist.md) - Go-live preparation
- [SSL/HTTPS Setup](docs/deployment/ssl-https-setup.md) - Secure your site

### Features
- [Authentication](docs/features/authentication/README.md) - User authentication and 2FA
- [Payment Processing](docs/features/payment/README.md) - Razorpay setup and testing
- [Shipping](docs/features/shipping/README.md) - Delhivery integration
- [Email System](docs/features/email/README.md) - SMTP and OAuth setup
- [AI Assistant](docs/features/ai-assistant/README.md) - Google Gemini integration
- [Admin Panel](docs/features/admin/README.md) - Complete admin guide

### Scripts & Automation
- [Scripts Overview](docs/scripts/README.md) - All available scripts
- [Database Scripts](docs/scripts/database-scripts.md) - Schema, migrations, seeding
- [Backup & Restore](docs/scripts/backup-restore.md) - Data protection
- [Maintenance Scripts](docs/scripts/maintenance-scripts.md) - System maintenance
- [Deployment Scripts](docs/scripts/deployment-scripts.md) - Deployment automation

### Operations & Maintenance
- [Monitoring](docs/operations/monitoring.md) - System monitoring and alerts
- [Backup & Restore](docs/operations/backup-restore.md) - Backup procedures
- [Maintenance](docs/operations/maintenance.md) - Regular maintenance tasks
- [Troubleshooting](docs/operations/troubleshooting.md) - Common issues and solutions

### Developer Documentation
- [Architecture](docs/developer/architecture.md) - System design and structure
- [API Reference](docs/developer/api-reference.md) - Complete API documentation
- [Database Schema](docs/developer/database-schema.md) - MongoDB collections
- [Contributing](docs/developer/contributing.md) - How to contribute
- [Testing](docs/developer/testing.md) - Running and writing tests

### Additional Resources
- [FAQ](docs/FAQ.md) - Frequently asked questions
- [Changelog](docs/archive/CHANGELOG_PHASE2.md) - Version history

---

## 🚀 Deployment

### Quick Deployment Options

#### Option 1: Docker (Recommended)

**Best for**: Quick setup, consistent environments, production deployment

```bash
# Development mode
docker compose up -d

# Production mode
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

**📘 Full Guide**: [Docker Deployment](docs/deployment/docker-deployment.md)

#### Option 2: Native Installation

**Best for**: Development, maximum performance, custom configurations

```bash
# Install dependencies
cd backend && npm install && cd ../frontend && npm install

# Start services
cd backend && npm run dev  # Terminal 1
cd frontend && npm run dev # Terminal 2
```

**📘 Full Guide**: [Host Deployment](docs/deployment/host-deployment.md)

### Platform-Specific Guides

- **Windows**: [Windows Installation](docs/deployment/host-deployment.md#windows-deployment)
- **Linux**: [Linux Installation](docs/deployment/host-deployment.md#linux-deployment)
- **Docker on Windows**: [Windows Docker Setup](docs/deployment/docker-deployment.md#windows-setup)
- **Docker on Linux**: [Linux Docker Setup](docs/deployment/docker-deployment.md#linux-setup)

---

## ⚙️ Configuration

### Essential Environment Variables

```bash
# Security (Required)
JWT_SECRET=your_jwt_secret_32chars_min
SESSION_SECRET=your_session_secret_32chars_min
CSRF_SECRET=your_csrf_secret_32chars_min

# Database (Required)
MONGO_URI=mongodb://admin:changeme@mongo:27017/miniecom?authSource=admin

# Admin Account (Required)
ADMIN_EMAIL=admin@yourstore.com
ADMIN_PASSWORD=YourSecurePassword123!

# Payment Gateway (Optional)
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=your_secret

# Shipping (Optional)
DELHIVERY_TOKEN=your_token
DELHIVERY_CLIENT_ID=your_client_id

# Email (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# AI Assistant (Optional)
GEMINI_API_KEY=your_gemini_api_key
```

**📘 Full Configuration Guide**: [Configuration](docs/getting-started/configuration.md)

### Generate Secure Secrets

**Linux/Mac:**
```bash
openssl rand -base64 32
```

**Windows (PowerShell):**
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

---

## 🔧 Common Tasks

### Database Management

```bash
# Initialize schema
bash scripts/init_schema.sh

# Run migrations
bash scripts/migrate.sh

# Create admin user
node scripts/seed_admin.js

# Seed sample data
bash scripts/seed_sample_data.sh

# Backup database
bash scripts/backup.sh

# Restore from backup
bash scripts/restore.sh --backup storage/backups/YYYYMMDD_HHMMSS.tar.gz --confirm
```

### Service Management

```bash
# Start all services
docker compose up -d

# Stop all services
docker compose down

# View logs
docker compose logs -f

# Restart service
docker compose restart api

# Health check
bash scripts/healthcheck.sh
```

### Maintenance

```bash
# Run maintenance tasks
bash scripts/run_maintenance_tasks.sh

# Monitor services
bash scripts/monitor_services.sh

# Security audit
bash scripts/sec_audit.sh

# Check disk space
bash scripts/disk_alert.sh
```

**📘 Complete Scripts Guide**: [Scripts Documentation](docs/scripts/README.md)

---

## 🏗️ Project Structure

```
handmade-harmony/
├── backend/              # Node.js/Express backend
│   ├── src/
│   │   ├── controllers/  # Request handlers
│   │   ├── services/     # Business logic
│   │   ├── models/       # Data models
│   │   ├── routes/       # API routes
│   │   └── middleware/   # Express middleware
│   ├── migrations/       # Database migrations
│   └── scripts/          # Backend utilities
├── frontend/             # React/Vite frontend
│   ├── src/
│   │   ├── pages/        # Page components
│   │   ├── components/   # Reusable components
│   │   ├── admin/        # Admin dashboard
│   │   └── hooks/        # React hooks
│   └── public/           # Static assets
├── scripts/              # Project-wide scripts
├── docs/                 # Documentation
├── docker/               # Dockerfiles
├── nginx/                # Nginx configuration
└── docker-compose.yml    # Docker Compose config
```

---

## 🔒 Security Features

- **Authentication**: JWT-based with secure session management
- **Password Hashing**: Argon2id (OWASP recommended)
- **CSRF Protection**: Token-based CSRF prevention
- **Rate Limiting**: Protect against brute force attacks
- **Input Validation**: Comprehensive validation using Zod
- **XSS Prevention**: Content Security Policy headers
- **SQL Injection**: N/A (MongoDB) + input sanitization
- **2FA Support**: TOTP-based two-factor authentication
- **Admin IP Whitelist**: Restrict admin access by IP
- **Session Fingerprinting**: Prevent session hijacking
- **Audit Logging**: Track all sensitive operations

**📘 Security Guide**: [Production Checklist](docs/deployment/production-checklist.md)

---

## 📊 System Requirements

### Minimum Requirements
- **CPU**: 2 cores
- **RAM**: 4 GB
- **Storage**: 20 GB
- **OS**: Windows 10+, Ubuntu 20.04+, macOS 10.15+

### Recommended for Production
- **CPU**: 4+ cores
- **RAM**: 8+ GB
- **Storage**: 50+ GB SSD
- **OS**: Ubuntu 22.04 LTS

### Software Dependencies
- **Docker**: 20.10+ (Docker method)
- **Node.js**: 18+ (Native method)
- **MongoDB**: 7+ (Native method)
- **npm**: 9+

**📘 Detailed Requirements**: [Prerequisites](docs/getting-started/prerequisites.md)

---

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test

# Run specific test
npm test -- checkout.test.ts

# Coverage report
npm run test:coverage
```

**📘 Testing Guide**: [Testing Documentation](docs/developer/testing.md)

---

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/AmazingFeature`)
3. **Commit** your changes (`git commit -m 'Add some AmazingFeature'`)
4. **Push** to the branch (`git push origin feature/AmazingFeature`)
5. **Open** a Pull Request

**📘 Contributing Guide**: [Contributing](docs/developer/contributing.md)

### Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/mini-ecom.git
cd mini-ecom

# Install dependencies
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# Start development servers
cd backend && npm run dev  # Terminal 1
cd frontend && npm run dev # Terminal 2
```

---

## 🆘 Support

### Getting Help

1. **Check Documentation**: [docs/](docs/)
2. **Search Issues**: [GitHub Issues](https://github.com/aswathm786/mini-ecom/issues)
3. **FAQ**: [Frequently Asked Questions](docs/FAQ.md)
4. **Troubleshooting**: [Common Issues](docs/operations/troubleshooting.md)

### Reporting Issues

When reporting issues, please include:
- Operating system and version
- Node.js and npm versions
- Docker version (if using Docker)
- Error messages and logs
- Steps to reproduce

### Contact

- **Email**: aswathm7866@gmail.com
- **GitHub**: [@aswathm786](https://github.com/aswathm786)
- **Repository**: [mini-ecom](https://github.com/aswathm786/mini-ecom)

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🌟 Acknowledgments

Built with ❤️ for artisans and small businesses worldwide.

### Technologies Used

- [Node.js](https://nodejs.org/) - JavaScript runtime
- [React](https://react.dev/) - UI library
- [Express](https://expressjs.com/) - Web framework
- [MongoDB](https://www.mongodb.com/) - Database
- [Docker](https://www.docker.com/) - Containerization
- [Vite](https://vitejs.dev/) - Build tool
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework

---

## 🗺️ Roadmap

- [ ] Multi-language support
- [ ] Mobile app (React Native)
- [ ] Advanced analytics dashboard
- [ ] Marketplace features
- [ ] Social media integration
- [ ] Progressive Web App (PWA)
- [ ] GraphQL API
- [ ] Real-time inventory sync

---

<div align="center">

**Made with ❤️ by [Aswath M](https://github.com/aswathm786)**

[⬆ back to top](#handmade-harmony---e-commerce-platform)

</div>
