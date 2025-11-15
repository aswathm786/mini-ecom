# Deployment Summary

Quick reference for deploying MiniEcom application.

## Quick Start

### 1. Prerequisites
```bash
# Install Docker & Docker Compose (see docs/deploy.md)
# Install mongosh (MongoDB shell)
# Install Node.js 18+ (for local development)
```

### 2. Setup
```bash
# Clone repository
git clone <repo-url>
cd mini-ecom

# Configure environment
cp .env.example .env
nano .env  # Edit with your secrets

# Install dependencies
cd frontend && npm install && cd ..
cd backend && npm install && cd ..
```

### 3. Development
```bash
# Start with live reload (automatically uses docker-compose.override.yml)
docker compose up -d

# Access:
# - Frontend: http://localhost:80
# - API: http://localhost:3000
# - MongoDB: localhost:27017
```

### 4. Production
```bash
# Build production images
docker compose -f docker-compose.yml -f docker-compose.prod.yml build

# Start services
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Run migrations
chmod +x scripts/migrate.sh
./scripts/migrate.sh

# Seed admin user
chmod +x scripts/seed_admin.js
node scripts/seed_admin.js

# Health check
chmod +x scripts/healthcheck.sh
./scripts/healthcheck.sh
```

## Key Scripts

| Script | Purpose |
|--------|---------|
| `scripts/migrate.sh` | Run database migrations |
| `scripts/seed_admin.js` | Create admin user |
| `scripts/seed_sample_data.sh` | Insert sample data |
| `scripts/deploy.sh` | Deploy to remote server |
| `scripts/healthcheck.sh` | Check service health |
| `scripts/fix-perms.sh` | Fix file permissions |
| `scripts/setup_github.sh` | Setup GitHub repository |

## Environment Variables

**Required:**
- `JWT_SECRET` - Strong random string
- `SESSION_SECRET` - Strong random string
- `CSRF_SECRET` - Strong random string
- `MONGO_ROOT_PASSWORD` - MongoDB root password
- `ADMIN_EMAIL` - Admin user email
- `ADMIN_PASSWORD` - Admin user password

**Optional (for features):**
- `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` - Payment gateway
- `DELHIVERY_TOKEN` / `DELHIVERY_CLIENT_ID` - Shipping
- `SMTP_*` - Email configuration

## Docker Compose Services

- **mongo**: MongoDB database
- **api**: Backend API server
- **frontend**: React frontend (Nginx)
- **worker**: Background job processor (optional)
- **nginx**: Reverse proxy (optional)
- **mongo-express**: MongoDB admin UI (optional)

## GitHub Actions

CI/CD pipeline runs on push/PR:
1. Frontend build & test
2. Backend lint & test
3. Integration tests
4. Docker image build
5. Deploy to production (main branch only)

**Required Secrets:**
- `SSH_PRIVATE_KEY` - SSH key for deployment
- `DEPLOY_HOST` - Production server hostname
- `DEPLOY_USER` - SSH user for deployment

## Nginx Configuration

Example config in `nginx/miniecom.conf`:
- Serves frontend from `/usr/share/nginx/html`
- Proxies `/api/*` to backend
- SPA fallback for React Router
- Gzip compression
- Security headers

## Health Endpoints

- Backend: `GET /api/health` → `{ ok: true, uptime, mongoConnected }`
- Frontend: `GET /health` → `"healthy"`

## Migration System

Migrations in `backend/migrations/`:
- Format: `YYYYMMDDHHMMSS_description.js`
- Idempotent (safe to run multiple times)
- Tracked in `migrations` collection

## PDF Generation

For invoice generation, install:
- **PDFKit**: `npm install pdfkit` (pure Node.js)
- **html-pdf**: `npm install html-pdf puppeteer` (requires Chrome)

Place fonts in `backend/fonts/` if using PDFKit.

## Troubleshooting

```bash
# View logs
docker compose logs -f

# Restart services
docker compose restart

# Check health
./scripts/healthcheck.sh

# Fix permissions
sudo ./scripts/fix-perms.sh
```

## Full Documentation

See `docs/deploy.md` for detailed deployment guide.

