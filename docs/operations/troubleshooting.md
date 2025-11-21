# Troubleshooting Guide

Solutions to common issues in Handmade Harmony.

## 📋 Quick Diagnosis

### Application Won't Start

**Symptoms:** Services fail to start, error on startup

**Check:**
```bash
# Docker
docker compose logs

# PM2
pm2 logs

# System logs (Linux)
sudo journalctl -u miniecom-api -n 100
```

**Common causes:**
- Port already in use
- MongoDB not running
- Configuration errors
- Missing environment variables

---

## 🚫 Common Issues

### Port Already in Use

**Error:** `EADDRINUSE: address already in use :::3000`

**Find what's using the port:**

**Windows:**
```powershell
netstat -ano | findstr :3000
# Kill process: taskkill /PID <PID> /F
```

**Linux/Mac:**
```bash
sudo lsof -i :3000
# Kill process: kill -9 <PID>
```

**Or change port in `.env`:**
```bash
PORT=3001
```

### MongoDB Connection Failed

**Error:** `MongoServerError: Authentication failed`

**Solutions:**

1. **Check MongoDB is running:**
```bash
# Docker
docker compose ps mongo

# Native (Linux)
sudo systemctl status mongod

# Native (Windows)
Get-Service MongoDB
```

2. **Verify connection string:**
```bash
# Check .env
MONGO_URI=mongodb://admin:password@localhost:27017/miniecom?authSource=admin
```

3. **Test connection:**
```bash
mongosh "$MONGO_URI" --eval "db.adminCommand('ping')"
```

### Admin Login Doesn't Work

**Solutions:**

1. **Verify credentials in `.env`**
2. **Recreate admin user:**
```bash
node scripts/seed_admin.js
```

3. **Check session/cookie settings:**
```bash
# In .env for production
COOKIE_SECURE=true  # Only with HTTPS
NODE_ENV=production
```

4. **Clear browser cookies**

### Frontend Shows Blank Page

**Causes:**
- Build errors
- API connection issues
- JavaScript errors

**Solutions:**

**Docker:**
```bash
docker compose logs frontend
docker compose restart frontend
```

**Native:**
```bash
cd frontend
rm -rf dist node_modules
npm install
npm run build
npm run dev
```

**Check browser console for errors (F12)**

### Payment Fails

**Razorpay issues:**

1. **Check API keys in `.env`**
2. **Verify webhook URL configured**
3. **Test with test card:** `4111 1111 1111 1111`
4. **Check Razorpay dashboard for errors**
5. **Review backend logs:**
```bash
docker compose logs api | grep razorpay
```

### Emails Not Sending

**Solutions:**

1. **Verify SMTP settings:**
```bash
# Check .env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email
SMTP_PASS=app_password
```

2. **Test SMTP connection:**
```bash
telnet smtp.gmail.com 587
```

3. **Check logs:**
```bash
grep -i "email\|smtp" storage/logs/app.log
```

4. **For Gmail, use App Password not regular password**

### Slow Performance

**Diagnosis:**

1. **Check resource usage:**
```bash
# Linux
htop
df -h

# Windows
Get-Process
Get-PSDrive
```

2. **Check database:**
```bash
mongosh --eval "db.currentOp()"
```

3. **Enable caching:**
```bash
# In .env
ENABLE_CACHE=true
CACHE_TYPE=redis
```

4. **Scale services:**
```bash
# Docker
docker compose up -d --scale api=3

# PM2
pm2 scale miniecom-api 4
```

### SSL Certificate Errors

**"Your connection is not private"**

**Solutions:**

1. **Check certificate validity:**
```bash
sudo certbot certificates
```

2. **Renew certificate:**
```bash
sudo certbot renew
sudo systemctl reload nginx
```

3. **Verify Nginx configuration:**
```bash
sudo nginx -t
```

### Database Corruption

**⚠️ Critical Issue**

**Symptoms:**
- Cannot start MongoDB
- Data inconsistencies
- Corrupt indexes

**Solutions:**

1. **Try repair:**
```bash
mongod --repair --dbpath /var/lib/mongodb
```

2. **Restore from backup:**
```bash
bash scripts/restore.sh --backup storage/backups/latest.tar.gz --confirm
```

---

## 🐳 Docker-Specific Issues

### Container Keeps Restarting

**Check logs:**
```bash
docker compose logs --tail=100 api
```

**Common causes:**
- Application crash
- Port conflicts
- Memory limits
- Missing environment variables

**Solutions:**
```bash
# Increase memory limit
# In docker-compose.yml:
deploy:
  resources:
    limits:
      memory: 2G
```

### Out of Disk Space

**Check usage:**
```bash
docker system df
```

**Clean up:**
```bash
docker system prune -a
docker volume prune
```

### Cannot Connect to Container

**Solutions:**
```bash
# Restart container
docker compose restart api

# Recreate container
docker compose up -d --force-recreate api

# Check network
docker network inspect mini-ecom_default
```

---

## 💻 Platform-Specific Issues

### Windows

**PowerShell Execution Policy:**
```powershell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**WSL Issues:**
```powershell
# Reset WSL
wsl --shutdown
wsl
```

**Line Ending Issues:**
```bash
# Fix CRLF to LF
dos2unix scripts/*.sh
```

### Linux

**Permission Denied:**
```bash
chmod +x scripts/*.sh
sudo chown -R $USER:$USER .
```

**Systemd Service Fails:**
```bash
sudo systemctl daemon-reload
sudo journalctl -u miniecom-api -n 50
```

---

## 📊 Diagnostic Commands

### System Health

**All Platforms:**
```bash
# Check API health
curl http://localhost:3000/api/health

# Check frontend
curl http://localhost/health
```

**Linux:**
```bash
# Resource usage
htop
df -h
free -h

# Network
netstat -tuln
ss -tuln
```

**Windows:**
```powershell
# Resource usage
Get-Process | Sort-Object CPU -Descending | Select-Object -First 10
Get-PSDrive

# Network
netstat -ano
```

### Application Logs

**Docker:**
```bash
docker compose logs -f
docker compose logs --tail=100 api
```

**PM2:**
```bash
pm2 logs
pm2 logs miniecom-api --lines 100
```

**System:**
```bash
# Linux
tail -f storage/logs/app.log
journalctl -u miniecom-api -f

# Windows
Get-Content storage/logs/app.log -Wait -Tail 50
```

---

## 🔍 Advanced Debugging

### Enable Debug Mode

**In `.env`:**
```bash
DEBUG=true
LOG_LEVEL=debug
```

**Restart application**

### Database Debugging

**Check indexes:**
```javascript
// In mongosh
use miniecom
db.products.getIndexes()
```

**Check slow queries:**
```javascript
db.setProfilingLevel(2)
db.system.profile.find().sort({ts:-1}).limit(5)
```

### Network Debugging

**Test connectivity:**
```bash
# Check DNS
nslookup yourstore.com

# Check ports
telnet yourstore.com 443

# Trace route
traceroute yourstore.com  # Linux/Mac
tracert yourstore.com     # Windows
```

---

## 📞 Getting Help

### Before Asking for Help

Collect this information:

1. **System Info:**
   - OS and version
   - Docker/Node.js version
   - Installation method (Docker/Native)

2. **Error Details:**
   - Exact error message
   - When it occurs
   - Steps to reproduce

3. **Logs:**
```bash
# Collect logs
docker compose logs > logs.txt
# OR
pm2 logs --lines 100 > logs.txt
```

4. **Configuration:**
```bash
# Sanitize .env (remove secrets!)
cat .env | grep -v "SECRET\|PASSWORD\|KEY" > config.txt
```

### Where to Get Help

1. **Documentation:** Check all docs
2. **FAQ:** [docs/FAQ.md](../FAQ.md)
3. **GitHub Issues:** Search existing issues
4. **Create Issue:** With all info above

---

## 🚨 Emergency Contacts

- **GitHub Issues:** https://github.com/aswathm786/mini-ecom/issues
- **Email:** aswathm7866@gmail.com

---

**Still stuck?** Don't panic! Check the [FAQ](../FAQ.md) or open a GitHub issue with details.

