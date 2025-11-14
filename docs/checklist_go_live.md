# Go-Live Checklist

Use this checklist before making your store live to the public.

---

## Security Checklist

### ✅ 1. Change Default Passwords

- [ ] Changed `ADMIN_PASSWORD` in `.env`
- [ ] Changed `MONGO_ROOT_PASSWORD` in `.env`
- [ ] Changed admin password after first login
- [ ] Verified strong passwords (12+ characters, mixed case, numbers, symbols)

### ✅ 2. Generate Secure Secrets

- [ ] Generated new `JWT_SECRET` (use: `openssl rand -base64 32`)
- [ ] Generated new `SESSION_SECRET` (use: `openssl rand -base64 32`)
- [ ] Generated new `CSRF_SECRET` (use: `openssl rand -base64 32`)
- [ ] Generated new `BACKUP_PASSPHRASE` (use: `openssl rand -base64 32`)

### ✅ 3. File Permissions

- [ ] `.env` file is 600 (read/write owner only)
- [ ] Storage directories have correct permissions (775)
- [ ] No world-writable directories (run: `./scripts/sec_audit.sh`)

### ✅ 4. Security Audit

- [ ] Ran security audit: `./scripts/sec_audit.sh`
- [ ] Fixed all security issues found
- [ ] Reviewed exposed ports in `docker-compose.yml`
- [ ] Configured firewall rules (only allow 80, 443, 22)

---

## Payment Gateway Setup

### ✅ 5. Razorpay Configuration

- [ ] Created Razorpay account
- [ ] Switched from test to live keys
- [ ] Updated `RAZORPAY_KEY_ID` in `.env` (live key)
- [ ] Updated `RAZORPAY_KEY_SECRET` in `.env` (live secret)
- [ ] Configured webhook URL in Razorpay dashboard
- [ ] Set `RAZORPAY_WEBHOOK_SECRET` in `.env`
- [ ] Tested payment with real card (small amount)
- [ ] Verified webhook receives payment events

**Test Mode:** Ensure test mode is OFF in production!

---

## Shipping Setup

### ✅ 6. Delhivery Configuration

- [ ] Created Delhivery account
- [ ] Switched from test to production mode
- [ ] Updated `DELHIVERY_TOKEN` in `.env` (production token)
- [ ] Updated `DELHIVERY_CLIENT_ID` in `.env` (production ID)
- [ ] Tested shipping label generation
- [ ] Verified tracking integration works

---

## Email Configuration

### ✅ 7. SMTP Setup

- [ ] Configured production SMTP service (SendGrid, Mailgun, AWS SES, etc.)
- [ ] Updated `SMTP_HOST` in `.env`
- [ ] Updated `SMTP_PORT` in `.env`
- [ ] Updated `SMTP_USER` in `.env`
- [ ] Updated `SMTP_PASS` in `.env`
- [ ] Updated `SMTP_FROM` with your domain email
- [ ] Sent test email and verified delivery
- [ ] Tested order confirmation emails
- [ ] Tested password reset emails

**Important:** Use a real SMTP service, not Mailtrap, in production!

---

## Domain & SSL

### ✅ 8. Domain Configuration

- [ ] Purchased domain name
- [ ] Configured DNS A record pointing to server IP
- [ ] Updated `APP_URL` in `.env` to your domain (e.g., `https://yourstore.com`)
- [ ] Updated `API_URL` in `.env` if using subdomain
- [ ] Verified domain resolves correctly: `ping yourstore.com`

### ✅ 9. SSL Certificate

- [ ] Installed certbot: `sudo apt-get install certbot`
- [ ] Obtained SSL certificate: `sudo certbot certonly --standalone -d yourstore.com`
- [ ] Configured Nginx to use SSL certificates
- [ ] Updated Nginx config to redirect HTTP to HTTPS
- [ ] Tested HTTPS: `curl https://yourstore.com`
- [ ] Verified certificate auto-renewal is set up

**Nginx SSL Config Example:**
```nginx
server {
    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/yourstore.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourstore.com/privkey.pem;
    # ... rest of config
}
```

---

## Backup & Recovery

### ✅ 10. Backup Configuration

- [ ] Configured `BACKUP_DIR` in `.env`
- [ ] Set `BACKUP_PASSPHRASE` for encryption
- [ ] Enabled `ENCRYPT_BACKUP=true` in `.env`
- [ ] Tested backup: `./scripts/test_backup.sh`
- [ ] Verified backup contains all data
- [ ] Set up automated backups (systemd timer or cron)
- [ ] Tested restore process: `./scripts/restore.sh --dry-run`
- [ ] Configured offsite backup (optional but recommended)

**Backup Schedule:**
- Daily backups: 14 days retention
- Weekly backups: 12 weeks retention
- Monthly backups: 12 months retention

---

## Monitoring & Maintenance

### ✅ 11. Monitoring Setup

- [ ] Configured `ALERT_EMAIL` in `.env`
- [ ] Set up service monitoring: `./scripts/monitor_services.sh`
- [ ] Set up disk space monitoring: `./scripts/disk_alert.sh`
- [ ] Configured cron jobs for monitoring (see `cron/miniecom-cron-example`)
- [ ] Tested email alerts work
- [ ] Set up log rotation: `./scripts/logs_collect.sh`

### ✅ 12. Maintenance Tasks

- [ ] Scheduled weekly maintenance: `./scripts/run_maintenance_tasks.sh`
- [ ] Set up log retention (30 days default)
- [ ] Configured Docker cleanup
- [ ] Set up security audit schedule (weekly)

---

## Application Configuration

### ✅ 13. Environment Variables

- [ ] All required variables set in `.env`
- [ ] `APP_ENV=production` (not development!)
- [ ] `USE_BIND_MOUNTS=0` (production mode)
- [ ] All URLs use HTTPS
- [ ] Database connection string is correct
- [ ] File upload directory is configured

### ✅ 14. Production Build

- [ ] Built production images: `docker compose build --no-cache`
- [ ] Verified no development dependencies in production
- [ ] Frontend is built: `cd frontend && npm run build`
- [ ] Tested production build locally

---

## Content & Data

### ✅ 15. Store Content

- [ ] Added all products with correct prices
- [ ] Uploaded product images
- [ ] Created product categories
- [ ] Set stock quantities
- [ ] Added store information (name, email, phone)
- [ ] Configured shipping rates
- [ ] Set tax rates (GST/VAT)
- [ ] Added terms & conditions
- [ ] Added privacy policy
- [ ] Added return/refund policy

### ✅ 16. Test Orders

- [ ] Created test order with real payment
- [ ] Verified order confirmation email sent
- [ ] Verified invoice PDF generated
- [ ] Tested refund process
- [ ] Tested order status updates
- [ ] Verified shipping label generation (if using Delhivery)

---

## Performance & Optimization

### ✅ 17. Performance Checks

- [ ] Tested page load times (< 3 seconds)
- [ ] Optimized product images (compressed)
- [ ] Enabled Nginx caching
- [ ] Verified database indexes exist
- [ ] Checked server resources (CPU, RAM, disk)
- [ ] Set up CDN for static assets (optional)

### ✅ 18. Load Testing

- [ ] Tested with multiple concurrent users
- [ ] Verified no memory leaks
- [ ] Checked database connection pool
- [ ] Monitored resource usage under load

---

## Legal & Compliance

### ✅ 19. Legal Pages

- [ ] Created Terms of Service page
- [ ] Created Privacy Policy page
- [ ] Created Return/Refund Policy page
- [ ] Added links to legal pages in footer
- [ ] Complied with GDPR (if applicable)
- [ ] Complied with local e-commerce regulations

### ✅ 20. Contact Information

- [ ] Added store contact email
- [ ] Added store phone number
- [ ] Added physical address (if required)
- [ ] Added business registration number (if required)
- [ ] Added GST/VAT number (if applicable)

---

## Final Checks

### ✅ 21. Pre-Launch Testing

- [ ] Tested complete checkout flow
- [ ] Tested payment processing
- [ ] Tested order emails
- [ ] Tested admin panel functionality
- [ ] Tested on multiple browsers (Chrome, Firefox, Safari)
- [ ] Tested on mobile devices
- [ ] Tested with slow internet connection
- [ ] Verified all links work
- [ ] Checked for broken images

### ✅ 22. Documentation

- [ ] Documented server setup
- [ ] Documented backup/restore procedures
- [ ] Documented monitoring setup
- [ ] Created runbook for common issues
- [ ] Shared credentials securely with team (if applicable)

---

## Launch Day

### ✅ 23. Launch Checklist

- [ ] Final backup taken before launch
- [ ] Maintenance mode disabled (if was enabled)
- [ ] All services running: `docker compose ps`
- [ ] Health checks passing: `./scripts/healthcheck.sh`
- [ ] Monitoring active
- [ ] Team notified of launch
- [ ] Support channels ready (email, phone)

### ✅ 24. Post-Launch

- [ ] Monitor logs for errors: `docker compose logs -f`
- [ ] Monitor server resources: `docker stats`
- [ ] Check for any payment/webhook issues
- [ ] Verify first real orders process correctly
- [ ] Test customer support flow

---

## Emergency Contacts

**Store Owner:**
- Email: support@yourstore.com
- Phone: +1-234-567-8900

**Hosting Provider:**
- Support: [your hosting support contact]

**Payment Gateway (Razorpay):**
- Support: support@razorpay.com

**Shipping (Delhivery):**
- Support: [Delhivery support contact]

---

## Quick Reference Commands

```bash
# Check all services
docker compose ps

# View logs
docker compose logs -f

# Health check
./scripts/healthcheck.sh

# Backup
./scripts/backup.sh

# Restore
./scripts/restore.sh --backup <backup_file> --confirm

# Enter maintenance mode
./scripts/enter_maintenance.sh "Maintenance reason"

# Exit maintenance mode
./scripts/exit_maintenance.sh
```

---

**✅ Ready to Launch!**

Once all items are checked, your store is ready to go live. Monitor closely for the first 24-48 hours and be ready to address any issues quickly.

**Good luck with your launch! 🚀**

