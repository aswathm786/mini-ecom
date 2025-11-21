# Production Checklist

Complete checklist before launching your e-commerce store to production.

## 🎯 Pre-Launch Checklist

### Security

- [ ] Strong secrets generated (JWT, SESSION, CSRF - min 32 chars)
- [ ] Admin password is strong (12+ characters, mixed case, numbers, special)
- [ ] HTTPS enabled and enforced (`COOKIE_SECURE=true`)
- [ ] SSL certificate valid and auto-renewal configured
- [ ] Rate limiting enabled (`ENABLE_RATE_LIMIT=true`)
- [ ] CSRF protection enabled (`ENABLE_CSRF=true`)
- [ ] Security headers configured (Helmet enabled)
- [ ] Admin 2FA enabled (`REQUIRE_ADMIN_2FA=true`)
- [ ] Admin IP whitelist configured (optional but recommended)
- [ ] Session timeout configured appropriately
- [ ] Cookie settings secure (`COOKIE_SECURE=true`, `COOKIE_SAMESITE=strict`)
- [ ] Input validation enabled
- [ ] File upload restrictions configured
- [ ] Database authentication enabled
- [ ] MongoDB not exposed to internet
- [ ] Firewall configured (only ports 80, 443, 22 open)
- [ ] SSH key-based authentication (password login disabled)
- [ ] fail2ban installed and configured
- [ ] Regular security updates enabled

### Application Configuration

- [ ] Environment set to production (`NODE_ENV=production`, `APP_ENV=production`)
- [ ] Debug mode disabled (`DEBUG=false`)
- [ ] Correct domain configured (`APP_URL`, `API_URL`)
- [ ] Database connection string correct
- [ ] Admin credentials set and tested
- [ ] Email SMTP configured and tested
- [ ] Payment gateway configured (Razorpay)
- [ ] Shipping integration configured (Delhivery)
- [ ] AI features configured (if using)
- [ ] File upload paths configured
- [ ] Log directories writable
- [ ] Backup directory configured
- [ ] Timezone set correctly (`TZ`)
- [ ] CORS origins configured properly

### Infrastructure

- [ ] Server meets minimum requirements (4GB RAM, 2 CPU minimum)
- [ ] Domain name purchased and configured
- [ ] DNS records point to server (A and AAAA records)
- [ ] Swap space configured (if needed)
- [ ] Disk space adequate (50GB+ recommended)
- [ ] Backup storage configured
- [ ] CDN configured (optional but recommended)
- [ ] Load balancer configured (if using)
- [ ] Database backup location configured

### Monitoring & Logging

- [ ] Application logging enabled
- [ ] Log rotation configured
- [ ] Error tracking set up
- [ ] Uptime monitoring configured (UptimeRobot, Pingdom, etc.)
- [ ] Server monitoring configured (CPU, RAM, disk)
- [ ] Health check endpoints accessible
- [ ] Alert notifications configured
- [ ] Performance monitoring enabled
- [ ] Database monitoring configured

### Backup & Recovery

- [ ] Automated backups configured
- [ ] Backup retention policy set
- [ ] Off-site backup storage configured
- [ ] Backup encryption enabled
- [ ] Restore procedure tested
- [ ] Database backups tested
- [ ] File backups tested
- [ ] Disaster recovery plan documented

### Performance

- [ ] Gzip compression enabled
- [ ] Static asset caching configured
- [ ] Database indexes created
- [ ] Image optimization enabled
- [ ] CDN for static assets (recommended)
- [ ] Connection pooling configured
- [ ] Rate limiting tuned
- [ ] Caching enabled (Redis recommended)
- [ ] Load testing completed

### Testing

- [ ] All features tested in production environment
- [ ] User registration works
- [ ] User login works
- [ ] Product browsing works
- [ ] Add to cart works
- [ ] Checkout process works
- [ ] Payment processing works (test mode first)
- [ ] Email notifications sent
- [ ] Admin panel accessible
- [ ] Order management works
- [ ] Invoice generation works
- [ ] Mobile responsiveness tested
- [ ] Cross-browser compatibility tested
- [ ] SSL certificate validates
- [ ] API endpoints respond correctly

### Documentation

- [ ] Admin credentials documented securely
- [ ] Server access documented
- [ ] Deployment procedure documented
- [ ] Backup/restore procedure documented
- [ ] Emergency contacts list created
- [ ] Service credentials documented (payment, email, etc.)
- [ ] DNS configuration documented
- [ ] SSL renewal procedure documented

### Legal & Compliance

- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] Cookie consent implemented (if required)
- [ ] GDPR compliance (if applicable)
- [ ] Payment gateway compliance verified
- [ ] Shipping terms published
- [ ] Return/refund policy published
- [ ] Contact information visible

### Business Readiness

- [ ] Products added
- [ ] Categories configured
- [ ] Shipping rates configured
- [ ] Tax rates configured (if applicable)
- [ ] Payment methods enabled
- [ ] Welcome email template configured
- [ ] Order confirmation template configured
- [ ] Shipping notification template configured
- [ ] Support email configured
- [ ] Social media links added
- [ ] Contact information updated
- [ ] About page content added

---

## 🔒 Security Hardening

### System Level

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install fail2ban
sudo apt install fail2ban -y

# Configure firewall
sudo ufw enable
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Disable password authentication (SSH key only)
sudo nano /etc/ssh/sshd_config
# Set: PasswordAuthentication no
sudo systemctl restart sshd
```

### Application Level

```bash
# In .env file:
ENABLE_RATE_LIMIT=true
ENABLE_CSRF=true
ENABLE_HELMET=true
COOKIE_SECURE=true
REQUIRE_ADMIN_2FA=true
ADMIN_IP_WHITELIST=your_office_ip
```

### Database Security

```bash
# MongoDB configuration
# Edit: /etc/mongod.conf

security:
  authorization: enabled

net:
  bindIp: 127.0.0.1  # Only local connections
```

---

## 📊 Performance Optimization

### Enable Caching

```bash
# Install Redis
sudo apt install redis-server -y

# Configure in .env
ENABLE_CACHE=true
CACHE_TYPE=redis
REDIS_URL=redis://localhost:6379
```

### Nginx Optimization

```nginx
# Add to nginx.conf
worker_processes auto;
worker_connections 4096;

# Enable caching
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=my_cache:10m max_size=1g inactive=60m;
```

### PM2 Cluster Mode

```javascript
// ecosystem.config.js
instances: 'max',  // Use all CPU cores
exec_mode: 'cluster'
```

---

## 🧪 Testing

### API Health Check

```bash
curl https://yourstore.com/api/health
# Expected: {"ok":true,"mongoConnected":true}
```

### SSL Certificate Check

```bash
curl -I https://yourstore.com
# Check for: Strict-Transport-Security header
```

### Performance Test

```bash
# Install Apache Bench
sudo apt install apache2-utils -y

# Test performance
ab -n 1000 -c 10 https://yourstore.com/
```

---

## 🚀 Launch Day Tasks

1. **Final Backup**
   ```bash
   bash scripts/backup.sh
   ```

2. **Switch Payment Gateway to Live Mode**
   - Update Razorpay keys to live keys
   - Test a small real transaction

3. **Enable Monitoring Alerts**
   - Verify uptime monitoring active
   - Test alert notifications

4. **Announce Launch**
   - Send announcement emails
   - Post on social media
   - Update website status

5. **Monitor Closely**
   - Watch logs: `pm2 logs` or `docker compose logs -f`
   - Check error rates
   - Monitor server resources

---

## 📋 Post-Launch

### Daily

- [ ] Check error logs
- [ ] Review sales/orders
- [ ] Monitor server resources
- [ ] Verify backup completed

### Weekly

- [ ] Review performance metrics
- [ ] Check security logs
- [ ] Test backup restore
- [ ] Update content (if needed)

### Monthly

- [ ] Security audit
- [ ] Performance review
- [ ] Backup verification
- [ ] SSL certificate check
- [ ] Update dependencies
- [ ] Review and rotate logs

---

## 🆘 Emergency Procedures

### Site Down

1. Check server status: `systemctl status miniecom`
2. Check logs: `pm2 logs` or `journalctl -u miniecom-api`
3. Restart services: `pm2 restart all` or `systemctl restart miniecom`
4. If database issue: `systemctl restart mongod`

### Database Corruption

1. Stop application
2. Restore from latest backup: `bash scripts/restore.sh`
3. Restart application
4. Verify data integrity

### Security Breach

1. Take site offline immediately
2. Change all passwords and secrets
3. Review logs for unauthorized access
4. Restore from clean backup
5. Patch vulnerability
6. Notify affected users (if required)

---

## 📚 Additional Resources

- [SSL Setup Guide](ssl-https-setup.md)
- [Monitoring Guide](../operations/monitoring.md)
- [Backup & Restore](../operations/backup-restore.md)
- [Troubleshooting](../operations/troubleshooting.md)

---

**Ready to launch?** 🚀 Double-check this list before going live!

