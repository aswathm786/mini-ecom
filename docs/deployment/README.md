# Deployment Overview

This guide covers deploying Handmade Harmony to production environments.

## 🎯 Deployment Options

### Choose Your Deployment Method

| Method | Best For | Difficulty | Scalability |
|--------|----------|------------|-------------|
| [Docker](docker-deployment.md) | Production servers, consistent environments | ⭐⭐ Easy | ⭐⭐⭐ High |
| [Native Host](host-deployment.md) | Maximum performance, full control | ⭐⭐⭐ Medium | ⭐⭐ Medium |

### Platform Support

- **Windows Server** 2019+ (Docker or Native)
- **Linux** Ubuntu 20.04+, CentOS 8+, Debian 11+ (Docker or Native)
- **Cloud Platforms** AWS, DigitalOcean, Azure, Google Cloud, Linode

---

## 🚀 Quick Deployment

### Option 1: Docker (Recommended)

**Best for:** Most production deployments

```bash
# 1. Clone repository
git clone https://github.com/aswathm786/mini-ecom.git
cd mini-ecom

# 2. Configure
cp .env.example .env
# Edit .env with production values

# 3. Deploy
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# 4. Initialize
bash scripts/migrate.sh
node scripts/seed_admin.js
```

**📘 Full Guide**: [Docker Deployment](docker-deployment.md)

### Option 2: Native Installation

**Best for:** Maximum performance, custom requirements

```bash
# 1. Install dependencies
# Node.js 18+, MongoDB 7+, Nginx

# 2. Clone and configure
git clone https://github.com/aswathm786/mini-ecom.git
cd mini-ecom
cp .env.example .env
# Edit .env

# 3. Build
cd backend && npm install && npm run build && cd ..
cd frontend && npm install && npm run build && cd ..

# 4. Start services
# Use PM2, systemd, or Windows services
```

**📘 Full Guide**: [Host Deployment](host-deployment.md)

---

## 📋 Pre-Deployment Checklist

Before deploying to production:

### Infrastructure
- [ ] Server meets [minimum requirements](../getting-started/prerequisites.md)
- [ ] Domain name configured and DNS pointed to server
- [ ] SSL certificate obtained (Let's Encrypt or purchased)
- [ ] Firewall configured (ports 80, 443, 22)
- [ ] Backup solution in place

### Application
- [ ] Environment variables configured for production
- [ ] Strong secrets generated (JWT, session, CSRF)
- [ ] Admin credentials set
- [ ] Database connection tested
- [ ] All required services configured (payment, email, shipping)

### Security
- [ ] HTTPS enabled and enforced
- [ ] Secure cookies enabled (`COOKIE_SECURE=true`)
- [ ] Admin IP whitelist configured (optional)
- [ ] 2FA enabled for admin accounts
- [ ] Rate limiting enabled
- [ ] Security headers configured

### Monitoring
- [ ] Logging configured
- [ ] Monitoring solution set up
- [ ] Alerting configured
- [ ] Backup automation configured
- [ ] Health check endpoints accessible

**📘 Complete Checklist**: [Production Checklist](production-checklist.md)

---

## 🏗️ Deployment Architecture

### Typical Production Setup

```
Internet
   |
   v
[Load Balancer / CDN]
   |
   v
[Nginx / Reverse Proxy]
   |
   +-- Frontend (Static Files)
   |
   +-- Backend API
       |
       +-- MongoDB
       +-- Redis (optional)
       +-- Worker Processes (optional)
```

### Recommended Configurations

#### Small Store (< 1000 orders/month)
- **Server**: 2 CPU, 4 GB RAM
- **Database**: Single MongoDB instance
- **Deployment**: Docker on single server
- **Cost**: ~$20-40/month

#### Medium Store (1000-10000 orders/month)
- **Server**: 4 CPU, 8 GB RAM
- **Database**: MongoDB replica set
- **Deployment**: Docker with load balancer
- **Cost**: ~$80-150/month

#### Large Store (10000+ orders/month)
- **Servers**: Multiple app servers
- **Database**: MongoDB cluster
- **Deployment**: Kubernetes or Docker Swarm
- **Additional**: CDN, caching layer
- **Cost**: $300+/month

---

## 🌐 Platform-Specific Guides

### Cloud Providers

#### AWS (Amazon Web Services)
- **Recommended**: EC2 t3.medium + RDS MongoDB Atlas
- [AWS Deployment Guide](docker-deployment.md#aws-deployment)

#### DigitalOcean
- **Recommended**: Basic Droplet 4GB + Managed MongoDB
- [DigitalOcean Guide](docker-deployment.md#digitalocean-deployment)

#### Google Cloud Platform
- **Recommended**: e2-medium VM + Cloud MongoDB
- [GCP Guide](docker-deployment.md#gcp-deployment)

#### Azure
- **Recommended**: B2s VM + Cosmos DB (MongoDB API)
- [Azure Guide](docker-deployment.md#azure-deployment)

#### Linode/Vultr
- **Recommended**: 4GB instance + MongoDB
- [Generic VPS Guide](docker-deployment.md#generic-vps)

### Operating Systems

#### Linux (Ubuntu 22.04 LTS) - Recommended
- [Docker on Ubuntu](docker-deployment.md#ubuntu-deployment)
- [Native on Ubuntu](host-deployment.md#ubuntu-deployment)

#### Linux (CentOS/RHEL)
- [Docker on CentOS](docker-deployment.md#centos-deployment)
- [Native on CentOS](host-deployment.md#centos-deployment)

#### Windows Server
- [Docker on Windows](docker-deployment.md#windows-server-deployment)
- [Native on Windows](host-deployment.md#windows-server-deployment)

---

## 🔒 SSL/HTTPS Setup

### Free SSL with Let's Encrypt (Recommended)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d yourstore.com -d www.yourstore.com

# Auto-renewal is configured automatically
```

**📘 Detailed Guide**: [SSL/HTTPS Setup](ssl-https-setup.md)

### Custom SSL Certificate

If you have a purchased SSL certificate:

```bash
# Copy certificate files
sudo cp yourstore.com.crt /etc/ssl/certs/
sudo cp yourstore.com.key /etc/ssl/private/

# Configure Nginx (see guide)
```

---

## 🔄 CI/CD Integration

### GitHub Actions

Automatic deployment on push to main branch:

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to server
        run: |
          # SSH into server and deploy
```

**📘 Full Guide**: See [Developer Documentation](../developer/contributing.md)

### GitLab CI

```yaml
# .gitlab-ci.yml
deploy:
  stage: deploy
  script:
    - ssh user@server 'cd /app && git pull && docker compose up -d'
  only:
    - main
```

---

## 📦 Deployment Scripts

The project includes helpful deployment scripts:

### Deploy Script

```bash
# scripts/deploy.sh
# Automated deployment to remote server

./scripts/deploy.sh production
```

### Quick Start Script

```bash
# scripts/quick_start.sh
# Complete setup for new deployments

./scripts/quick_start.sh
```

### Health Check

```bash
# scripts/healthcheck.sh
# Verify all services are running

./scripts/healthcheck.sh
```

**📘 Complete Scripts Guide**: [Scripts Documentation](../scripts/README.md)

---

## 🎯 Post-Deployment Tasks

After deploying:

### 1. Verify Deployment

```bash
# Check all services
docker compose ps  # Docker method
# OR
systemctl status miniecom-*  # Native method

# Test endpoints
curl https://yourstore.com/health
curl https://yourstore.com/api/health
```

### 2. Configure Monitoring

- Set up uptime monitoring (UptimeRobot, Pingdom)
- Configure log monitoring
- Set up error alerting
- Enable performance monitoring

**📘 Guide**: [Monitoring](../operations/monitoring.md)

### 3. Set Up Backups

```bash
# Configure automated backups
bash scripts/backup.sh

# Test restore procedure
bash scripts/restore.sh --backup latest --confirm
```

**📘 Guide**: [Backup & Restore](../operations/backup-restore.md)

### 4. Performance Optimization

- Enable caching (Redis)
- Configure CDN for static assets
- Optimize database indexes
- Enable compression

### 5. Security Hardening

- Enable fail2ban
- Configure UFW/firewall
- Set up intrusion detection
- Regular security updates

**📘 Guide**: [Production Checklist](production-checklist.md)

---

## 🆘 Troubleshooting Deployment

### Common Issues

**Services won't start:**
```bash
# Check logs
docker compose logs  # Docker
journalctl -u miniecom-api  # Native

# Check ports
sudo netstat -tulpn | grep -E ':(80|443|3000|27017)'
```

**Database connection fails:**
```bash
# Test MongoDB connection
mongosh "mongodb://localhost:27017/miniecom"

# Check MongoDB status
systemctl status mongod
```

**SSL certificate issues:**
```bash
# Test certificate
sudo certbot certificates

# Renew certificate
sudo certbot renew --dry-run
```

**📘 Full Guide**: [Troubleshooting](../operations/troubleshooting.md)

---

## 📚 Additional Resources

### Documentation
- [Production Checklist](production-checklist.md) - Complete pre-launch checklist
- [SSL/HTTPS Setup](ssl-https-setup.md) - Secure your site
- [Backup & Restore](../operations/backup-restore.md) - Data protection
- [Monitoring](../operations/monitoring.md) - Keep your store healthy

### Deployment Guides
- [Docker Deployment](docker-deployment.md) - Container deployment
- [Host Deployment](host-deployment.md) - Native deployment
- [Scripts Documentation](../scripts/README.md) - Automation scripts

### Operations
- [Maintenance](../operations/maintenance.md) - Regular maintenance
- [Troubleshooting](../operations/troubleshooting.md) - Common issues
- [FAQ](../FAQ.md) - Frequently asked questions

---

## 💡 Best Practices

### DO ✅

- Use Docker for consistency
- Enable HTTPS everywhere
- Set up automated backups
- Monitor your application
- Use strong secrets
- Keep software updated
- Test disaster recovery
- Document your setup

### DON'T ❌

- Commit secrets to git
- Use default passwords
- Skip backups
- Ignore security updates
- Run as root
- Disable security features
- Forget to monitor
- Skip testing

---

## 🎉 Ready to Deploy?

Choose your deployment method:

1. **[Docker Deployment →](docker-deployment.md)** - Recommended for most users
2. **[Native Deployment →](host-deployment.md)** - For advanced users
3. **[Production Checklist →](production-checklist.md)** - Before going live

---

**Need help?** Check our [Troubleshooting Guide](../operations/troubleshooting.md) or [open an issue](https://github.com/aswathm786/mini-ecom/issues).

