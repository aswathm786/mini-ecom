# Configuration Guide

This guide explains all environment variables and configuration options for Handmade Harmony.

## 📋 Table of Contents

- [Quick Configuration](#quick-configuration)
- [Environment Variables Reference](#environment-variables-reference)
- [Feature Configuration](#feature-configuration)
- [Security Configuration](#security-configuration)
- [Development vs Production](#development-vs-production)
- [Advanced Configuration](#advanced-configuration)

---

## Quick Configuration

### Minimum Configuration

For a basic working installation, you only need to configure these variables:

```bash
# Copy example file
cp .env.example .env
```

**Edit `.env` with these minimum required values:**

```bash
# Security Secrets (generate random 32+ character strings)
JWT_SECRET=your_jwt_secret_32chars_minimum
SESSION_SECRET=your_session_secret_32chars_minimum
CSRF_SECRET=your_csrf_secret_32chars_minimum

# Admin Account
ADMIN_EMAIL=admin@yourstore.com
ADMIN_PASSWORD=YourSecurePassword123!

# Database (default works with Docker)
MONGO_URI=mongodb://admin:changeme@mongo:27017/miniecom?authSource=admin
```

### Generate Secure Secrets

**Linux/Mac:**
```bash
# Generate a secret (run 3 times for each secret)
openssl rand -base64 32
```

**Windows (PowerShell):**
```powershell
# Generate a secret (run 3 times for each secret)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

---

## Environment Variables Reference

### Application Settings

```bash
# ============================================
# APPLICATION
# ============================================

# Application environment
APP_ENV=development
# Options: development, production, staging

# Application name (used in emails and UI)
APP_NAME="Handmade Harmony"

# Application URL (your website URL)
APP_URL=http://localhost
# Production: https://yourstore.com

# API URL
API_URL=http://localhost:3000
# Production: https://api.yourstore.com

# Timezone
TZ=Asia/Kolkata
# Use TZ database names: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
```

### Security Secrets

```bash
# ============================================
# SECURITY SECRETS (REQUIRED)
# ============================================

# JWT secret for authentication tokens
JWT_SECRET=generate_random_32_char_string
# Must be at least 32 characters
# Used to sign JWT tokens

# Session secret
SESSION_SECRET=another_random_32_char_string
# Used for session cookies
# Change if sessions are compromised

# CSRF token secret
CSRF_SECRET=yet_another_random_32_char
# Used for CSRF protection
# Protects against cross-site request forgery

# Encryption key for sensitive data
ENCRYPTION_KEY=random_32_char_encryption_key
# Used to encrypt sensitive data at rest

# Cookie secret
COOKIE_SECRET=random_32_char_cookie_secret
# Used to sign cookies
```

**Security Notes:**
- Generate unique random strings for each secret
- Never reuse secrets across environments
- Keep secrets secure and never commit to git
- Rotate secrets every 90 days in production

### Database Configuration

#### Docker Installation

```bash
# ============================================
# DATABASE (Docker)
# ============================================

# MongoDB connection string
MONGO_URI=mongodb://admin:changeme@mongo:27017/miniecom?authSource=admin
# Format: mongodb://username:password@host:port/database?authSource=admin

# MongoDB root username
MONGO_ROOT_USERNAME=admin
# Default admin user

# MongoDB root password
MONGO_ROOT_PASSWORD=changeme
# CHANGE THIS in production!

# MongoDB database name
MONGO_DATABASE=miniecom
# Your database name
```

#### Native Installation

```bash
# ============================================
# DATABASE (Native)
# ============================================

# MongoDB connection string
MONGO_URI=mongodb://localhost:27017/miniecom
# Local MongoDB without authentication

# OR with authentication:
# MONGO_URI=mongodb://username:password@localhost:27017/miniecom?authSource=admin

# MongoDB database name
MONGO_DATABASE=miniecom
```

### Server Configuration

```bash
# ============================================
# SERVER
# ============================================

# Backend API port
PORT=3000
# Port for backend API server

# Frontend port (development only)
FRONTEND_PORT=80
# Docker: 80, Native: 5173

# Node environment
NODE_ENV=development
# Options: development, production

# Enable debug logs
DEBUG=false
# Set to true for verbose logging

# Log level
LOG_LEVEL=info
# Options: error, warn, info, debug

# Maximum request body size
MAX_BODY_SIZE=50mb
# Limit for file uploads
```

### Admin Account

```bash
# ============================================
# ADMIN USER (REQUIRED)
# ============================================

# Admin email address
ADMIN_EMAIL=admin@yourstore.com
# Used for admin login

# Admin password
ADMIN_PASSWORD=YourSecurePassword123!
# Minimum 8 characters, include numbers and special chars

# Admin username (optional)
ADMIN_USERNAME=admin
# Default: derived from email
```

### Payment Gateway (Razorpay)

```bash
# ============================================
# PAYMENT GATEWAY
# ============================================

# Enable Razorpay payments
ENABLE_RAZORPAY=true
# Set to false to disable

# Razorpay Key ID
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
# Get from: https://dashboard.razorpay.com/app/keys

# Razorpay Key Secret
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
# Keep this secret!

# Razorpay Webhook Secret
RAZORPAY_WEBHOOK_SECRET=xxxxxxxxxxxxxxxx
# Get from webhook settings

# Enable Cash on Delivery
ENABLE_COD=true
# Allow COD payment method

# COD limit
COD_LIMIT=10000
# Maximum order value for COD (in rupees)
```

**How to Get Razorpay Keys:**
1. Sign up at [Razorpay](https://razorpay.com)
2. Go to Settings → API Keys
3. Generate test keys for development
4. Generate live keys for production

**Detailed Guide:** [Payment Setup](../features/payment/razorpay-setup.md)

### Shipping Integration (Delhivery)

```bash
# ============================================
# SHIPPING
# ============================================

# Enable Delhivery integration
ENABLE_DELHIVERY=true
# Set to false to disable

# Delhivery API token
DELHIVERY_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxx
# Get from: https://delhivery.com/developer

# Delhivery client ID
DELHIVERY_CLIENT_ID=your_client_id
# Your Delhivery client identifier

# Delhivery API URL
DELHIVERY_API_URL=https://track.delhivery.com/api
# Production: https://track.delhivery.com/api
# Staging: https://staging.delhivery.com/api

# Default shipping cost
DEFAULT_SHIPPING_COST=50
# Used if Delhivery calculation fails

# Free shipping threshold
FREE_SHIPPING_THRESHOLD=500
# Orders above this amount get free shipping
```

**Detailed Guide:** [Shipping Setup](../features/shipping/delhivery-setup.md)

### Email Configuration

```bash
# ============================================
# EMAIL (SMTP)
# ============================================

# Enable email sending
ENABLE_EMAIL=true
# Set to false to disable

# SMTP host
SMTP_HOST=smtp.gmail.com
# Examples:
# Gmail: smtp.gmail.com
# SendGrid: smtp.sendgrid.net
# Mailgun: smtp.mailgun.org

# SMTP port
SMTP_PORT=587
# Common ports:
# 587: TLS (recommended)
# 465: SSL
# 25: Unencrypted (not recommended)

# SMTP security
SMTP_SECURE=false
# true for port 465, false for other ports

# SMTP username
SMTP_USER=your_email@gmail.com
# Your email address or SMTP username

# SMTP password
SMTP_PASS=your_app_password
# For Gmail: use App Password
# https://support.google.com/accounts/answer/185833

# From address
SMTP_FROM="Your Store Name <noreply@yourstore.com>"
# Sender name and email

# Reply-to address
SMTP_REPLY_TO=support@yourstore.com
# Where customers can reply
```

**Gmail Setup:**
1. Enable 2-Step Verification
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Use App Password as `SMTP_PASS`

**Detailed Guide:** [Email Setup](../features/email/smtp-setup.md)

### AI Assistant (Google Gemini)

```bash
# ============================================
# AI ASSISTANT
# ============================================

# Enable AI features
ENABLE_AI=true
# Set to false to disable

# Google Gemini API key
GEMINI_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# Get from: https://makersuite.google.com/app/apikey

# AI model
GEMINI_MODEL=gemini-pro
# Options: gemini-pro, gemini-pro-vision

# Max tokens per request
AI_MAX_TOKENS=1024
# Limit response length
```

**How to Get Gemini API Key:**
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with Google account
3. Click "Create API Key"
4. Copy the key

**Detailed Guide:** [AI Setup](../features/ai-assistant/gemini-setup.md)

### Google OAuth (Optional)

```bash
# ============================================
# GOOGLE OAUTH
# ============================================

# Enable Google Sign-in
ENABLE_GOOGLE_AUTH=true
# Allow users to login with Google

# Google OAuth Client ID
GOOGLE_CLIENT_ID=xxxxxxxxxxxxx.apps.googleusercontent.com
# Get from: https://console.cloud.google.com

# Google OAuth Client Secret
GOOGLE_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxx
# Keep this secret!

# OAuth callback URL
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback
# Production: https://api.yourstore.com/api/auth/google/callback
```

**Detailed Guide:** [OAuth Setup](../features/email/oauth-setup.md)

### Session & Cookies

```bash
# ============================================
# SESSIONS & COOKIES
# ============================================

# Session lifetime (milliseconds)
SESSION_LIFETIME=86400000
# Default: 24 hours (86400000 ms)

# Session name
SESSION_NAME=miniecom_session
# Cookie name for session

# Cookie domain
COOKIE_DOMAIN=localhost
# Production: .yourstore.com

# Secure cookies (HTTPS only)
COOKIE_SECURE=false
# Set to true in production with HTTPS

# SameSite cookie attribute
COOKIE_SAMESITE=lax
# Options: strict, lax, none

# Remember me duration
REMEMBER_ME_DURATION=2592000000
# Default: 30 days (2592000000 ms)
```

### File Upload

```bash
# ============================================
# FILE UPLOADS
# ============================================

# Upload directory
UPLOAD_DIR=./uploads
# Path to store uploaded files

# Maximum file size
MAX_FILE_SIZE=5242880
# Default: 5 MB (5242880 bytes)

# Allowed image types
ALLOWED_IMAGE_TYPES=image/jpeg,image/png,image/webp,image/gif
# Comma-separated MIME types

# Image compression quality
IMAGE_QUALITY=80
# 0-100, higher = better quality

# Generate thumbnails
GENERATE_THUMBNAILS=true
# Auto-generate product thumbnails

# Thumbnail sizes
THUMBNAIL_SIZES=150x150,300x300,600x600
# Comma-separated dimensions
```

### Rate Limiting

```bash
# ============================================
# RATE LIMITING
# ============================================

# Enable rate limiting
ENABLE_RATE_LIMIT=true
# Protect against brute force

# General API rate limit
API_RATE_LIMIT=100
# Requests per window

# Auth endpoint rate limit
AUTH_RATE_LIMIT=5
# Login attempts per window

# Rate limit window (minutes)
RATE_LIMIT_WINDOW=15
# Time window for limits

# Max requests per IP
MAX_REQUESTS_PER_IP=1000
# Per day
```

### Backup & Storage

```bash
# ============================================
# BACKUP & STORAGE
# ============================================

# Backup directory
BACKUP_DIR=./storage/backups
# Path to store backups

# Backup retention (days)
BACKUP_RETENTION=30
# Delete backups older than this

# Enable auto backup
AUTO_BACKUP=true
# Automatic daily backups

# Backup encryption
BACKUP_ENCRYPTION=true
# Encrypt backup files

# Backup encryption password
BACKUP_ENCRYPTION_PASSWORD=your_secure_password
# Used to encrypt/decrypt backups
```

### Logging

```bash
# ============================================
# LOGGING
# ============================================

# Log directory
LOG_DIR=./storage/logs
# Path to store log files

# Log level
LOG_LEVEL=info
# Options: error, warn, info, debug, trace

# Log to file
LOG_TO_FILE=true
# Write logs to files

# Log to console
LOG_TO_CONSOLE=true
# Output logs to terminal

# Log rotation
LOG_ROTATION=daily
# Options: daily, weekly, size

# Max log file size (MB)
MAX_LOG_SIZE=10
# Rotate when file exceeds this size

# Max log files to keep
MAX_LOG_FILES=30
# Number of rotated files to retain
```

### Caching

```bash
# ============================================
# CACHING
# ============================================

# Enable caching
ENABLE_CACHE=true
# Cache frequently accessed data

# Cache type
CACHE_TYPE=memory
# Options: memory, redis

# Redis URL (if using Redis)
REDIS_URL=redis://localhost:6379
# Redis connection string

# Cache TTL (seconds)
CACHE_TTL=3600
# Default: 1 hour

# Clear cache on restart
CLEAR_CACHE_ON_START=false
# Reset cache when server starts
```

### Security

```bash
# ============================================
# SECURITY
# ============================================

# Enable CORS
ENABLE_CORS=true
# Allow cross-origin requests

# CORS origin
CORS_ORIGIN=http://localhost:5173
# Allowed origins (comma-separated)
# Production: https://yourstore.com,https://www.yourstore.com

# Enable CSRF protection
ENABLE_CSRF=true
# Protect against CSRF attacks

# Enable Helmet (security headers)
ENABLE_HELMET=true
# Add security headers

# Admin IP whitelist
ADMIN_IP_WHITELIST=
# Comma-separated IPs (empty = allow all)
# Example: 192.168.1.1,203.0.113.0/24

# Enable 2FA requirement for admin
REQUIRE_ADMIN_2FA=false
# Force 2FA for admin accounts

# Password min length
PASSWORD_MIN_LENGTH=8
# Minimum characters for passwords

# Password requirements
PASSWORD_REQUIRE_UPPERCASE=true
PASSWORD_REQUIRE_LOWERCASE=true
PASSWORD_REQUIRE_NUMBER=true
PASSWORD_REQUIRE_SPECIAL=true
# Enforce strong passwords
```

### Performance

```bash
# ============================================
# PERFORMANCE
# ============================================

# Enable compression
ENABLE_COMPRESSION=true
# Gzip response compression

# Compression level
COMPRESSION_LEVEL=6
# 1-9, higher = better compression

# Database connection pool size
DB_POOL_SIZE=10
# Number of database connections

# Request timeout (milliseconds)
REQUEST_TIMEOUT=30000
# Default: 30 seconds

# Enable clustering
ENABLE_CLUSTERING=false
# Use multiple CPU cores

# Number of workers
CLUSTER_WORKERS=4
# CPU cores to use (0 = auto)
```

---

## Feature Configuration

### Enabling/Disabling Features

```bash
# ============================================
# FEATURE FLAGS
# ============================================

# Payment processing
ENABLE_PAYMENTS=true

# Shipping integration
ENABLE_SHIPPING=true

# Email notifications
ENABLE_EMAILS=true

# AI assistant
ENABLE_AI=true

# Wishlist
ENABLE_WISHLIST=true

# Product reviews
ENABLE_REVIEWS=true

# Product Q&A
ENABLE_QA=true

# Coupons
ENABLE_COUPONS=true

# Loyalty points
ENABLE_LOYALTY=true

# Price alerts
ENABLE_PRICE_ALERTS=true

# Support tickets
ENABLE_SUPPORT_TICKETS=true

# Product recommendations
ENABLE_RECOMMENDATIONS=true

# Google Analytics
ENABLE_ANALYTICS=true
GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX

# Facebook Pixel
ENABLE_FB_PIXEL=true
FB_PIXEL_ID=xxxxxxxxxxxxxxxxxx
```

---

## Security Configuration

### Best Practices

**1. Use Strong Secrets**
```bash
# ❌ Bad
JWT_SECRET=secret123

# ✅ Good
JWT_SECRET=kJ8$mP2xL9nQ4vR7tY0wZ3aB6cD5eF8gH1iJ4kL7mN0pO3qR6sT9uV2wX5yZ8aB1c
```

**2. Enable HTTPS in Production**
```bash
# Development
APP_URL=http://localhost
COOKIE_SECURE=false

# Production
APP_URL=https://yourstore.com
COOKIE_SECURE=true
```

**3. Restrict Admin Access**
```bash
# Allow only specific IPs
ADMIN_IP_WHITELIST=203.0.113.0,198.51.100.0

# Require 2FA
REQUIRE_ADMIN_2FA=true
```

**4. Use Environment-Specific Secrets**
- Never share secrets between environments
- Rotate secrets regularly
- Use different keys for dev/staging/production

---

## Development vs Production

### Development Configuration

```bash
# .env.development
APP_ENV=development
NODE_ENV=development
DEBUG=true
LOG_LEVEL=debug
ENABLE_CORS=true
CORS_ORIGIN=http://localhost:5173
COOKIE_SECURE=false
APP_URL=http://localhost
API_URL=http://localhost:3000
```

### Production Configuration

```bash
# .env.production
APP_ENV=production
NODE_ENV=production
DEBUG=false
LOG_LEVEL=warn
ENABLE_CORS=true
CORS_ORIGIN=https://yourstore.com
COOKIE_SECURE=true
APP_URL=https://yourstore.com
API_URL=https://api.yourstore.com

# Stronger security
ENABLE_RATE_LIMIT=true
REQUIRE_ADMIN_2FA=true
ADMIN_IP_WHITELIST=your_office_ip

# Production services
RAZORPAY_KEY_ID=rzp_live_xxxxx
RAZORPAY_KEY_SECRET=live_secret
```

---

## Advanced Configuration

### Custom MongoDB Connection

**With Authentication:**
```bash
MONGO_URI=mongodb://username:password@host:27017/database?authSource=admin&replicaSet=rs0
```

**With SSL:**
```bash
MONGO_URI=mongodb://host:27017/database?ssl=true&sslValidate=false
```

**MongoDB Atlas:**
```bash
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority
```

### Reverse Proxy Configuration

If using Nginx or Apache:

```bash
# Trust proxy
TRUST_PROXY=true

# Number of proxies
PROXY_DEPTH=1

# Real IP header
REAL_IP_HEADER=X-Forwarded-For
```

### Custom Storage

**S3-Compatible Storage:**
```bash
STORAGE_TYPE=s3
S3_BUCKET=your-bucket
S3_REGION=us-east-1
S3_ACCESS_KEY=your_access_key
S3_SECRET_KEY=your_secret_key
S3_ENDPOINT=https://s3.amazonaws.com
```

---

## Configuration File Examples

### Complete Example

See complete example: `.env.example` in project root

### Docker Production Example

```bash
# See: docker-compose.prod.yml
# Configured for production deployment
```

### Native Production Example

```bash
# See: .env.production.example
# Configured for native deployment
```

---

## Verification

After configuration, verify settings:

```bash
# Check configuration is loaded
curl http://localhost:3000/api/health

# Should return:
# {
#   "ok": true,
#   "environment": "development",
#   "mongoConnected": true
# }
```

---

## Next Steps

- **Test Your Configuration**: [Installation Guide](installation.md)
- **Deploy to Production**: [Deployment Guide](../deployment/README.md)
- **Enable Features**: [Features Documentation](../features/)
- **Secure Your Store**: [Security Checklist](../deployment/production-checklist.md)

---

## Getting Help

**Configuration issues?**
- [Troubleshooting Guide](../operations/troubleshooting.md)
- [FAQ](../FAQ.md)
- [GitHub Issues](https://github.com/aswathm786/mini-ecom/issues)

