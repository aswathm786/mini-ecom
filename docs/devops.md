# DevOps & Deployment Guide

Complete guide for deploying Handmade Harmony e-commerce platform to production.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Docker Setup](#docker-setup)
3. [Environment Configuration](#environment-configuration)
4. [CI/CD Pipeline](#cicd-pipeline)
5. [Deployment Strategies](#deployment-strategies)
6. [Monitoring & Logging](#monitoring--logging)
7. [Scaling & Performance](#scaling--performance)
8. [Security Hardening](#security-hardening)
9. [Backup & Recovery](#backup--recovery)
10. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

### System Components

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Nginx     │────▶│  Frontend   │────▶│   Backend   │
│  (Reverse   │     │   (React)   │     │  (Express)  │
│   Proxy)    │     │             │     │             │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                                 │
                                          ┌──────▼──────┐
                                          │   MongoDB   │
                                          │  (Database) │
                                          └─────────────┘
```

### Technology Stack

- **Frontend**: React + TypeScript + Vite
- **Backend**: Node.js + Express + TypeScript
- **Database**: MongoDB
- **Reverse Proxy**: Nginx
- **Containerization**: Docker + Docker Compose
- **CI/CD**: GitHub Actions

---

## Docker Setup

### Development Environment

**File: `docker-compose.dev.yml`**

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:7.0
    container_name: handmade-harmony-mongo-dev
    ports:
      - "27017:27017"
    volumes:
      - mongo-data-dev:/data/db
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_ROOT_PASSWORD:-changeme}
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.dev
    container_name: handmade-harmony-backend-dev
    ports:
      - "3000:3000"
    volumes:
      - ./backend:/app
      - /app/node_modules
    environment:
      NODE_ENV: development
      MONGODB_URI: mongodb://admin:${MONGO_ROOT_PASSWORD:-changeme}@mongodb:27017/handmade-harmony?authSource=admin
    depends_on:
      mongodb:
        condition: service_healthy
    command: npm run dev

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    container_name: handmade-harmony-frontend-dev
    ports:
      - "5173:5173"
    volumes:
      - ./frontend:/app
      - /app/node_modules
    environment:
      VITE_API_URL: http://localhost:3000
    command: npm run dev

volumes:
  mongo-data-dev:
```

### Production Environment

**File: `docker-compose.prod.yml`**

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:7.0
    container_name: handmade-harmony-mongo
    volumes:
      - mongo-data:/data/db
      - mongo-backup:/backup
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_ROOT_USERNAME}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_ROOT_PASSWORD}
    networks:
      - app-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
    container_name: handmade-harmony-backend
    ports:
      - "3000:3000"
    volumes:
      - uploads:/app/uploads
      - logs:/app/logs
    environment:
      NODE_ENV: production
      MONGODB_URI: ${MONGODB_URI}
      JWT_SECRET: ${JWT_SECRET}
      # ... other env vars
    depends_on:
      mongodb:
        condition: service_healthy
    networks:
      - app-network
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 512M

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod
    container_name: handmade-harmony-frontend
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    networks:
      - app-network
    restart: unless-stopped
    depends_on:
      - backend

  nginx:
    image: nginx:alpine
    container_name: handmade-harmony-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
      - frontend-static:/usr/share/nginx/html:ro
    depends_on:
      - frontend
    networks:
      - app-network
    restart: unless-stopped

volumes:
  mongo-data:
  mongo-backup:
  uploads:
  logs:
  frontend-static:

networks:
  app-network:
    driver: bridge
```

### Dockerfiles

**Backend Dockerfile (Production): `backend/Dockerfile.prod`**

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

EXPOSE 3000

CMD ["node", "dist/server.js"]
```

**Frontend Dockerfile (Production): `frontend/Dockerfile.prod`**

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

---

## Environment Configuration

### Backend Environment Variables

**File: `.env.production`**

```bash
# Server
NODE_ENV=production
PORT=3000
APP_URL=https://yourdomain.com
APP_NAME=Handmade Harmony

# Database
MONGODB_URI=mongodb://admin:password@mongodb:27017/handmade-harmony?authSource=admin

# Security
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRES_IN=7d
COOKIE_SECURE=true
COOKIE_SAME_SITE=strict
CSRF_SECRET=your-csrf-secret-key

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@yourdomain.com

# Payment
RAZORPAY_KEY_ID=your-razorpay-key
RAZORPAY_KEY_SECRET=your-razorpay-secret

# Shipping
DELHIVERY_API_KEY=your-delhivery-key
DELHIVERY_API_SECRET=your-delhivery-secret
SHIPPING_FROM_PINCODE=110001

# AI Providers
GEMINI_API_KEY=your-gemini-key
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key
OPENROUTER_API_KEY=your-openrouter-key

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Admin Security
ADMIN_IP_WHITELIST_ENABLED=false
ADMIN_IP_WHITELIST=127.0.0.1,::1
```

### Frontend Environment Variables

**File: `frontend/.env.production`**

```bash
VITE_API_URL=https://api.yourdomain.com
VITE_APP_NAME=Handmade Harmony
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

---

## CI/CD Pipeline

### GitHub Actions Workflow

**File: `.github/workflows/deploy.yml`**

```yaml
name: Deploy to Production

on:
  push:
    branches:
      - main
  workflow_dispatch:

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: |
            backend/package-lock.json
            frontend/package-lock.json

      - name: Install dependencies
        run: |
          cd backend && npm ci
          cd ../frontend && npm ci

      - name: Lint backend
        run: cd backend && npm run lint

      - name: Lint frontend
        run: cd frontend && npm run lint

      - name: Type check
        run: |
          cd backend && npm run build --dry-run || npx tsc --noEmit
          cd ../frontend && npx tsc --noEmit

      - name: Run tests
        run: |
          cd backend && npm test || true

  build-and-push:
    needs: lint-and-test
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - uses: actions/checkout@v3

      - name: Log in to Container Registry
        uses: docker/login-action@v2
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push backend
        uses: docker/build-push-action@v4
        with:
          context: ./backend
          file: ./backend/Dockerfile.prod
          push: true
          tags: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}-backend:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Build and push frontend
        uses: docker/build-push-action@v4
        with:
          context: ./frontend
          file: ./frontend/Dockerfile.prod
          push: true
          tags: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}-frontend:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
      - uses: actions/checkout@v3

      - name: Deploy to server
        uses: appleboy/ssh-action@v0.1.5
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ${{ secrets.SSH_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /opt/handmade-harmony
            docker-compose -f docker-compose.prod.yml pull
            docker-compose -f docker-compose.prod.yml up -d
            docker system prune -f
```

---

## Deployment Strategies

### Option 1: Single Server Deployment

1. **Setup Server** (Ubuntu 22.04 LTS)
   ```bash
   # Install Docker
   curl -fsSL https://get.docker.com -o get-docker.sh
   sh get-docker.sh

   # Install Docker Compose
   sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   ```

2. **Clone Repository**
   ```bash
   git clone https://github.com/yourusername/handmade-harmony.git
   cd handmade-harmony
   ```

3. **Configure Environment**
   ```bash
   cp backend/.env.example backend/.env.production
   cp frontend/.env.example frontend/.env.production
   # Edit both files with production values
   ```

4. **Deploy**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

### Option 2: Kubernetes Deployment

**File: `k8s/deployment.yaml`**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: handmade-harmony-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
      - name: backend
        image: ghcr.io/yourusername/handmade-harmony-backend:latest
        ports:
        - containerPort: 3000
        env:
        - name: MONGODB_URI
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: mongodb-uri
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "2000m"
---
apiVersion: v1
kind: Service
metadata:
  name: backend-service
spec:
  selector:
    app: backend
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer
```

---

## Monitoring & Logging

### Health Check Endpoints

- `GET /api/health` - Basic health check
- `GET /api/health/detailed` - Detailed system status

### Logging Strategy

1. **Application Logs**: Winston (backend) → stdout → Docker logs
2. **Access Logs**: Nginx access logs
3. **Error Tracking**: Consider Sentry integration

### Monitoring Tools

- **Uptime**: UptimeRobot, Pingdom
- **Metrics**: Prometheus + Grafana
- **APM**: New Relic, Datadog

---

## Scaling & Performance

### Horizontal Scaling

1. **Backend**: Run multiple instances behind load balancer
2. **Database**: MongoDB replica set for read scaling
3. **CDN**: Use CloudFlare or AWS CloudFront for static assets

### Caching Strategy

- **Redis**: Session storage, API response caching
- **CDN**: Static assets, images
- **Browser**: HTTP caching headers

### Database Optimization

- Create indexes on frequently queried fields
- Use MongoDB connection pooling
- Implement query result pagination

---

## Security Hardening

### SSL/TLS

1. **Obtain Certificate** (Let's Encrypt)
   ```bash
   certbot certonly --standalone -d yourdomain.com
   ```

2. **Nginx SSL Configuration**
   ```nginx
   server {
       listen 443 ssl http2;
       ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
       # ... rest of config
   }
   ```

### Firewall

```bash
# UFW configuration
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### Security Headers

Nginx configuration includes:
- HSTS
- CSP
- X-Frame-Options
- X-Content-Type-Options

---

## Backup & Recovery

### MongoDB Backup

```bash
# Daily backup script
docker exec handmade-harmony-mongo mongodump \
  --uri="mongodb://admin:password@localhost:27017/handmade-harmony?authSource=admin" \
  --out=/backup/$(date +%Y%m%d)
```

### Automated Backups

**File: `scripts/backup.sh`**

```bash
#!/bin/bash
BACKUP_DIR="/backup"
DATE=$(date +%Y%m%d_%H%M%S)

# MongoDB backup
docker exec handmade-harmony-mongo mongodump --out=/backup/$DATE

# Upload to S3 (optional)
aws s3 sync $BACKUP_DIR s3://your-backup-bucket/

# Cleanup old backups (keep last 7 days)
find $BACKUP_DIR -type d -mtime +7 -exec rm -rf {} +
```

---

## Troubleshooting

### Common Issues

1. **Container won't start**
   - Check logs: `docker-compose logs backend`
   - Verify environment variables
   - Check MongoDB connection

2. **High memory usage**
   - Increase container memory limits
   - Check for memory leaks
   - Optimize database queries

3. **Slow performance**
   - Enable database indexes
   - Add Redis caching
   - Use CDN for static assets

### Debug Commands

```bash
# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Restart services
docker-compose restart backend

# Access MongoDB shell
docker exec -it handmade-harmony-mongo mongosh

# Check container resources
docker stats
```

---

## Next Steps

1. Set up monitoring and alerting
2. Configure automated backups
3. Implement blue-green deployment
4. Set up staging environment
5. Configure log aggregation
6. Implement rate limiting at infrastructure level

---

For questions or issues, refer to the main README or open an issue on GitHub.

