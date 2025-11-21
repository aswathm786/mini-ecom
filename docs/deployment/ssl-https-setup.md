# SSL/HTTPS Setup Guide

Complete guide to securing your Handmade Harmony store with SSL/HTTPS certificates.

## 📋 Table of Contents

- [Why SSL/HTTPS?](#why-sslhttps)
- [Let's Encrypt (Free SSL)](#lets-encrypt-free-ssl)
- [Custom SSL Certificate](#custom-ssl-certificate)
- [SSL Configuration](#ssl-configuration)
- [Testing and Verification](#testing-and-verification)
- [Renewal and Maintenance](#renewal-and-maintenance)
- [Troubleshooting](#troubleshooting)

---

## Why SSL/HTTPS?

### Benefits

- 🔒 **Encryption**: Protects data in transit
- 🛡️ **Trust**: Browsers show "Secure" indicator
- 📈 **SEO**: Google ranks HTTPS sites higher
- ✅ **Compliance**: Required for payment processing
- 🎯 **Features**: Required for modern web features (service workers, etc.)

### What You Need

- Domain name (e.g., yourstore.com)
- Server with root/sudo access
- Ports 80 and 443 open
- Web server (Nginx, Apache, or IIS)

---

## Let's Encrypt (Free SSL)

Let's Encrypt provides free, automated SSL certificates that are trusted by all browsers.

### For Linux with Nginx

#### Step 1: Install Certbot

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install -y certbot python3-certbot-nginx
```

**CentOS/RHEL:**
```bash
sudo yum install -y certbot python3-certbot-nginx
# OR
sudo dnf install -y certbot python3-certbot-nginx
```

#### Step 2: Obtain Certificate

**Automatic (Recommended):**
```bash
# Certbot will automatically configure Nginx
sudo certbot --nginx -d yourstore.com -d www.yourstore.com

# Follow prompts:
# 1. Enter email address
# 2. Agree to Terms of Service
# 3. Choose whether to redirect HTTP to HTTPS (select yes)
```

**Manual (If automatic fails):**
```bash
# Get certificate only
sudo certbot certonly --nginx -d yourstore.com -d www.yourstore.com

# Certificate files will be saved to:
# /etc/letsencrypt/live/yourstore.com/fullchain.pem
# /etc/letsencrypt/live/yourstore.com/privkey.pem
```

#### Step 3: Configure Nginx (If manual)

Edit your Nginx configuration:
```bash
sudo nano /etc/nginx/sites-available/miniecom
```

Add SSL configuration:
```nginx
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name yourstore.com www.yourstore.com;

    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/yourstore.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourstore.com/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_stapling on;
    ssl_stapling_verify on;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Rest of your configuration...
}

# HTTP to HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name yourstore.com www.yourstore.com;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 301 https://$server_name$request_uri;
    }
}
```

Test and reload:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

#### Step 4: Auto-Renewal

Certbot automatically creates a systemd timer for renewal. Verify:

```bash
# Check timer status
sudo systemctl status certbot.timer

# Test renewal (dry run)
sudo certbot renew --dry-run

# Manual renewal (if needed)
sudo certbot renew
```

### For Linux with Apache

**Install Certbot:**
```bash
# Ubuntu/Debian
sudo apt install -y certbot python3-certbot-apache

# CentOS/RHEL
sudo yum install -y certbot python3-certbot-apache
```

**Obtain Certificate:**
```bash
sudo certbot --apache -d yourstore.com -d www.yourstore.com
```

### For Windows with IIS

Let's Encrypt on Windows IIS is more complex. Recommended tool: **Win-ACME**

**Step 1: Download Win-ACME**
1. Download from: https://github.com/win-acme/win-acme/releases
2. Extract to `C:\win-acme`

**Step 2: Run Win-ACME**
```powershell
cd C:\win-acme
.\wacs.exe
```

**Step 3: Follow Wizard**
1. Choose N: Create new certificate
2. Choose option for IIS binding
3. Enter domain name
4. Choose automatic renewal
5. Confirm

Win-ACME will:
- Obtain certificate
- Install in IIS
- Set up automatic renewal

---

## Custom SSL Certificate

If you purchased an SSL certificate from a provider (GoDaddy, Namecheap, etc.):

### Step 1: Generate CSR (Certificate Signing Request)

**On Linux:**
```bash
openssl req -new -newkey rsa:2048 -nodes -keyout yourstore.com.key -out yourstore.com.csr
```

**On Windows:**
Use IIS Manager to generate CSR:
1. Open IIS Manager
2. Select server → Server Certificates
3. Click "Create Certificate Request"
4. Follow wizard

### Step 2: Purchase and Download Certificate

1. Submit CSR to certificate provider
2. Complete validation (email, DNS, or HTTP)
3. Download certificate files

You'll typically receive:
- `yourstore.com.crt` - Your certificate
- `yourstore.com.ca-bundle` - Intermediate certificates

### Step 3: Install Certificate

**On Linux with Nginx:**

```bash
# Copy files to /etc/ssl
sudo cp yourstore.com.crt /etc/ssl/certs/
sudo cp yourstore.com.key /etc/ssl/private/
sudo cp yourstore.com.ca-bundle /etc/ssl/certs/

# Combine certificate and CA bundle
sudo cat /etc/ssl/certs/yourstore.com.crt /etc/ssl/certs/yourstore.com.ca-bundle > /etc/ssl/certs/yourstore.com-fullchain.crt

# Set permissions
sudo chmod 600 /etc/ssl/private/yourstore.com.key
sudo chmod 644 /etc/ssl/certs/yourstore.com-fullchain.crt

# Configure Nginx
sudo nano /etc/nginx/sites-available/miniecom
```

Update SSL paths:
```nginx
ssl_certificate /etc/ssl/certs/yourstore.com-fullchain.crt;
ssl_certificate_key /etc/ssl/private/yourstore.com.key;
```

Reload Nginx:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

**On Windows with IIS:**

1. Open IIS Manager
2. Select server → Server Certificates
3. Click "Complete Certificate Request"
4. Select downloaded .cer file
5. Enter friendly name
6. Click OK
7. Bind certificate to website:
   - Select site
   - Bindings → Add
   - Type: https
   - Port: 443
   - SSL certificate: Select your certificate

---

## SSL Configuration

### Update Application Configuration

Edit `.env` file:

```bash
# Force HTTPS
APP_URL=https://yourstore.com
API_URL=https://api.yourstore.com

# Secure cookies
COOKIE_SECURE=true
COOKIE_SAMESITE=strict

# CORS with HTTPS
CORS_ORIGIN=https://yourstore.com,https://www.yourstore.com
```

Restart application:
```bash
# Docker
docker compose restart

# PM2
pm2 restart all

# Systemd
sudo systemctl restart miniecom-api
```

### Force HTTPS Redirect

**Nginx:** (Already configured above)

**Express.js (Backend):**

The backend already includes HTTPS redirect middleware. Ensure it's enabled:

```javascript
// Already in backend/src/middleware/security.ts
app.use((req, res, next) => {
  if (req.headers['x-forwarded-proto'] !== 'https' && process.env.NODE_ENV === 'production') {
    return res.redirect('https://' + req.hostname + req.url);
  }
  next();
});
```

---

## Testing and Verification

### Test SSL Certificate

**SSL Labs Test (Recommended):**
1. Visit: https://www.ssllabs.com/ssltest/
2. Enter your domain
3. Wait for analysis
4. Aim for A+ rating

**Command Line Test:**
```bash
# Check certificate info
openssl s_client -connect yourstore.com:443 -servername yourstore.com

# Check certificate expiry
echo | openssl s_client -servername yourstore.com -connect yourstore.com:443 2>/dev/null | openssl x509 -noout -dates
```

**Browser Test:**
1. Visit https://yourstore.com
2. Check for padlock icon
3. Click padlock → View certificate
4. Verify:
   - Issued to your domain
   - Valid dates
   - Trusted certificate authority

### Test HTTPS Redirect

```bash
# Should redirect to HTTPS
curl -I http://yourstore.com

# Should return 301 redirect
```

### Test Security Headers

```bash
curl -I https://yourstore.com | grep -i "strict-transport-security"
# Should show: Strict-Transport-Security: max-age=31536000; includeSubDomains
```

---

## Renewal and Maintenance

### Let's Encrypt Renewal

**Automatic (Default):**
- Certbot creates a systemd timer that runs twice daily
- Certificates auto-renew 30 days before expiry
- No action needed

**Manual Renewal:**
```bash
# Dry run (test)
sudo certbot renew --dry-run

# Actual renewal
sudo certbot renew

# Reload web server after renewal
sudo systemctl reload nginx
```

**Check Renewal Status:**
```bash
sudo certbot certificates
```

### Custom Certificate Renewal

Custom certificates must be renewed manually:

1. **45 days before expiry:** Order renewal from provider
2. **30 days before expiry:** Install new certificate
3. **Test:** Verify new certificate is active
4. **Monitor:** Set calendar reminder for next renewal

### Monitoring Certificate Expiry

**Setup Alert:**

Create script `/usr/local/bin/check-ssl-expiry.sh`:

```bash
#!/bin/bash
DOMAIN="yourstore.com"
DAYS_THRESHOLD=30

EXPIRY_DATE=$(echo | openssl s_client -servername $DOMAIN -connect $DOMAIN:443 2>/dev/null | openssl x509 -noout -enddate | cut -d= -f2)
EXPIRY_EPOCH=$(date -d "$EXPIRY_DATE" +%s)
CURRENT_EPOCH=$(date +%s)
DAYS_REMAINING=$(( ($EXPIRY_EPOCH - $CURRENT_EPOCH) / 86400 ))

if [ $DAYS_REMAINING -lt $DAYS_THRESHOLD ]; then
    echo "WARNING: SSL certificate expires in $DAYS_REMAINING days!"
    # Send alert (email, Slack, etc.)
fi
```

**Add to cron:**
```bash
# Run daily at 9 AM
0 9 * * * /usr/local/bin/check-ssl-expiry.sh
```

---

## Troubleshooting

### Certificate Not Trusted

**Cause:** Missing intermediate certificates

**Solution:**
```bash
# Let's Encrypt: Use fullchain.pem instead of cert.pem
ssl_certificate /etc/letsencrypt/live/yourstore.com/fullchain.pem;

# Custom: Combine certificate with CA bundle
cat yourstore.com.crt ca-bundle.crt > fullchain.crt
```

### Mixed Content Warnings

**Cause:** Loading HTTP resources on HTTPS page

**Solution:**
- Check browser console for warnings
- Update all URLs to HTTPS or use protocol-relative URLs
- Check frontend code for hardcoded HTTP URLs

### Certificate Renewal Fails

**Let's Encrypt:**

```bash
# Check Certbot logs
sudo tail -f /var/log/letsencrypt/letsencrypt.log

# Common issues:
# 1. Port 80 blocked: Ensure firewall allows port 80
# 2. Webroot not accessible: Check .well-known/acme-challenge/ directory
# 3. DNS not resolving: Verify DNS records

# Manual challenge:
sudo certbot certonly --manual -d yourstore.com
```

### "NET::ERR_CERT_DATE_INVALID"

**Cause:** Certificate expired or system clock wrong

**Solution:**
```bash
# Check certificate dates
openssl x509 -in /etc/letsencrypt/live/yourstore.com/cert.pem -noout -dates

# Renew if expired
sudo certbot renew --force-renewal

# Check system time
date
# Fix if wrong:
sudo timedatectl set-ntp true
```

### SSL Handshake Fails

**Check SSL protocols:**
```bash
# Test TLS 1.2
openssl s_client -connect yourstore.com:443 -tls1_2

# Test TLS 1.3
openssl s_client -connect yourstore.com:443 -tls1_3
```

**Update Nginx SSL configuration:**
```nginx
ssl_protocols TLSv1.2 TLSv1.3;  # Remove older versions
```

---

## Best Practices

### Security

- ✅ Use TLS 1.2 and 1.3 only
- ✅ Enable HTTP Strict Transport Security (HSTS)
- ✅ Enable OCSP stapling
- ✅ Use strong cipher suites
- ✅ Disable SSL/TLS compression
- ✅ Enable perfect forward secrecy

### Performance

- ✅ Enable HTTP/2
- ✅ Enable session resumption
- ✅ Use CDN with SSL
- ✅ Enable OCSP stapling (reduces latency)

### Monitoring

- ✅ Monitor certificate expiry
- ✅ Test SSL configuration regularly
- ✅ Set up expiry alerts
- ✅ Document renewal procedures

---

## Quick Reference

### Let's Encrypt Commands

```bash
# Obtain certificate
sudo certbot --nginx -d yourstore.com

# Renew all certificates
sudo certbot renew

# Renew specific certificate
sudo certbot renew --cert-name yourstore.com

# Revoke certificate
sudo certbot revoke --cert-path /etc/letsencrypt/live/yourstore.com/cert.pem

# Delete certificate
sudo certbot delete --cert-name yourstore.com

# List certificates
sudo certbot certificates
```

### Testing Tools

- **SSL Labs:** https://www.ssllabs.com/ssltest/
- **SSL Checker:** https://www.sslshopper.com/ssl-checker.html
- **Why No Padlock:** https://www.whynopadlock.com/

---

## Next Steps

After setting up SSL:

1. **Test Thoroughly:** Use SSL Labs and manual testing
2. **Update DNS:** Ensure all records point to correct server
3. **Setup Monitoring:** Configure expiry alerts
4. **Document:** Save certificate details and renewal dates
5. **Review Checklist:** [Production Checklist](production-checklist.md)

---

**Your store is now secure with HTTPS!** 🔒

