# Troubleshooting Guide

Common issues and their solutions.

---

## Table of Contents

- [Docker Issues](#docker-issues)
- [Database Issues](#database-issues)
- [Port Conflicts](#port-conflicts)
- [Permission Errors](#permission-errors)
- [CSRF/Session Issues](#csrfsession-issues)
- [Payment Issues](#payment-issues)
- [Email Issues](#email-issues)
- [Build Errors](#build-errors)
- [Getting Help](#getting-help)

---

## Docker Issues

### Containers Won't Start

**Symptoms:**
- `docker compose up` fails
- Containers exit immediately
- Error: "Cannot connect to Docker daemon"

**Solutions:**

1. **Check Docker is running:**

   **On Windows (PowerShell) or Mac/Linux:**
   ```powershell
   # Same command works on all platforms
   docker ps
   ```
   
   If error:
   - **Windows:** Start Docker Desktop
   - **Linux:** `sudo systemctl start docker`
   - **Mac:** Start Docker Desktop

2. **Check logs:**
   ```bash
   docker compose logs
   docker compose logs api
   docker compose logs frontend
   docker compose logs mongo
   ```

3. **Restart containers:**
   ```bash
   docker compose down
   docker compose up -d
   ```

4. **Rebuild containers:**
   ```bash
   docker compose build --no-cache
   docker compose up -d
   ```

### Container Keeps Restarting

**Symptoms:**
- Container status shows "Restarting"
- `docker compose ps` shows restart count increasing

**Solutions:**

1. **Check container logs:**
   ```bash
   docker compose logs api --tail 100
   ```

2. **Check resource limits:**
   ```bash
   docker stats
   ```
   If memory/CPU is maxed out, increase limits in `docker-compose.yml`

3. **Check health checks:**
   ```bash
   docker compose ps
   ```
   If health check is failing, check the service endpoint

### "Cannot find Dockerfile"

**Symptoms:**
- Error: "Cannot locate specified Dockerfile"

**Solutions:**

1. **Check Dockerfile exists:**

   **On Mac/Linux:**
   ```bash
   ls -la docker/Dockerfile.*
   ```

   **On Windows (PowerShell):**
   ```powershell
   Get-ChildItem docker/Dockerfile.*
   ```

2. **Check docker-compose.yml paths:**
   ```yaml
   build:
     context: .
     dockerfile: docker/Dockerfile.backend
   ```

---

## Database Issues

### MongoDB Connection Failed

**Symptoms:**
- Error: "MongoServerError: connect ECONNREFUSED"
- Backend logs show connection errors

**Solutions:**

1. **Check MongoDB container:**
   ```bash
   docker compose ps mongo
   docker compose logs mongo
   ```

2. **Test connection:**
   ```bash
   docker compose exec mongo mongosh --eval "db.adminCommand('ping')"
   ```

3. **Check MONGO_URI in .env:**
   ```bash
   # Should match docker-compose service name
   MONGO_URI=mongodb://admin:changeme@mongo:27017/miniecom?authSource=admin
   ```

4. **Restart MongoDB:**
   ```bash
   docker compose restart mongo
   ```

### Migration Errors

**Symptoms:**
- Migration script fails
- Error: "Migration already applied" or "Migration failed"

**Solutions:**

1. **Check migration status:**
   ```bash
   docker compose exec mongo mongosh "$MONGO_URI" --eval "db.migrations.find().toArray()"
   ```

2. **Manually mark migration as applied:**
   ```bash
   docker compose exec mongo mongosh "$MONGO_URI" --eval "db.migrations.insertOne({ name: 'migration_name.js', appliedAt: new Date() })"
   ```

3. **Run migration manually:**
   ```bash
   docker compose exec mongo mongosh "$MONGO_URI" < backend/migrations/your_migration.js
   ```

### Database Locked

**Symptoms:**
- Error: "Database is locked"
- Cannot write to database

**Solutions:**

1. **Check for long-running queries:**
   ```bash
   docker compose exec mongo mongosh "$MONGO_URI" --eval "db.currentOp()"
   ```

2. **Kill long-running operations:**
   ```bash
   docker compose exec mongo mongosh "$MONGO_URI" --eval "db.killOp(opid)"
   ```

---

## Port Conflicts

### Port Already in Use

**Symptoms:**
- Error: "Bind for 0.0.0.0:3000 failed: port is already allocated"
- Services cannot start

**Solutions:**

1. **Find process using port:**
   ```bash
   # Linux/macOS
   sudo lsof -i :3000
   sudo lsof -i :80
   
   # Windows
   netstat -ano | findstr :3000
   ```

2. **Kill process:**
   ```bash
   # Linux/macOS
   sudo kill -9 <PID>
   
   # Windows
   taskkill /PID <PID> /F
   ```

3. **Change port in .env:**
   ```bash
   API_PORT=3001
   FRONTEND_PORT=8080
   ```

4. **Update docker-compose.yml:**
   ```yaml
   ports:
     - "${API_PORT:-3001}:3000"
   ```

---

## Permission Errors

### Storage/Uploads Permission Denied

**Symptoms:**
- Error: "EACCES: permission denied"
- Cannot write to `storage/uploads/`

**Solutions:**

1. **Fix permissions:**
   ```bash
   ./scripts/fix-perms.sh
   ```

2. **Manual fix:**
   ```bash
   chmod -R 775 storage/
   chown -R $USER:$USER storage/
   ```

3. **Check Docker volume permissions:**
   ```bash
   docker compose exec api ls -la /app/storage
   ```

### .env Permission Denied

**Symptoms:**
- Cannot read `.env` file
- Error: "Permission denied"

**Solutions:**

1. **Check file permissions:**
   ```bash
   ls -la .env
   ```

2. **Fix permissions:**
   ```bash
   chmod 600 .env
   ```

---

## CSRF/Session Issues

### CSRF Token Mismatch

**Symptoms:**
- Error: "CSRF token mismatch"
- Requests fail with 403

**Solutions:**

1. **Clear browser cookies:**
   - Open browser dev tools
   - Application > Cookies
   - Delete all cookies for localhost

2. **Get new CSRF token:**
   ```bash
   curl http://localhost:3000/api/csrf-token
   ```

3. **Check CSRF_SECRET in .env:**
   ```bash
   # Should be a random string
   CSRF_SECRET=your_secret_here
   ```

4. **Restart backend:**
   ```bash
   docker compose restart api
   ```

### Session Not Persisting

**Symptoms:**
- Logged out after page refresh
- Session cookie not set

**Solutions:**

1. **Check SESSION_SECRET in .env:**
   ```bash
   SESSION_SECRET=your_secret_here
   ```

2. **Check cookie settings:**
   - Ensure cookies are enabled in browser
   - Check if using HTTPS (cookies may require secure flag)

3. **Check CORS settings:**
   ```typescript
   // backend/src/server.ts
   app.use(cors({
     credentials: true,
     origin: 'http://localhost:5173'
   }));
   ```

---

## Payment Issues

### Razorpay Payment Fails

**Symptoms:**
- Payment button doesn't work
- Error: "Payment failed"

**Solutions:**

1. **Check Razorpay keys:**
   ```bash
   # In .env
   RAZORPAY_KEY_ID=rzp_test_...
   RAZORPAY_KEY_SECRET=...
   ```

2. **Test with test keys:**
   - Use Razorpay test keys first
   - Test card: 4111 1111 1111 1111

3. **Check webhook URL:**
   - Configure webhook in Razorpay dashboard
   - Use ngrok for local testing

4. **Check logs:**
   ```bash
   docker compose logs api | grep -i razorpay
   ```

See [docs/payment_setup.md](payment_setup.md) for detailed setup.

### Webhook Not Received

**Symptoms:**
- Payment succeeds but order status not updated
- Webhook logs show no requests

**Solutions:**

1. **Check webhook URL:**
   - Must be publicly accessible
   - Use ngrok for local testing: `ngrok http 3000`

2. **Verify webhook secret:**
   ```bash
   RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
   ```

3. **Check webhook logs:**
   ```bash
   docker compose logs api | grep -i webhook
   ```

---

## Email Issues

### Emails Not Sending

**Symptoms:**
- Order confirmation emails not received
- Password reset emails not working

**Solutions:**

1. **Check SMTP settings:**
   ```bash
   # In .env
   SMTP_HOST=smtp.example.com
   SMTP_PORT=587
   SMTP_USER=your_username
   SMTP_PASS=your_password
   ```

2. **Test SMTP connection:**
   ```bash
   # In admin panel: Settings > Email > Send Test Email
   ```

3. **Check logs:**
   ```bash
   docker compose logs api | grep -i smtp
   ```

4. **Use Mailtrap for testing:**
   - Sign up at mailtrap.io
   - Use their SMTP settings for development

---

## Build Errors

### Frontend Build Fails

**Symptoms:**
- `npm run build` fails
- TypeScript errors
- Module not found errors

**Solutions:**

1. **Clear cache and reinstall:**
   ```bash
   cd frontend
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Check TypeScript errors:**
   ```bash
   npm run type-check
   ```

3. **Check for missing dependencies:**
   ```bash
   npm install --save <missing-package>
   ```

### Backend Build Fails

**Symptoms:**
- `npm run build` fails
- TypeScript compilation errors

**Solutions:**

1. **Clear and rebuild:**
   ```bash
   cd backend
   rm -rf dist node_modules
   npm install
   npm run build
   ```

2. **Check TypeScript config:**
   ```bash
   # Check tsconfig.json
   cat tsconfig.json
   ```

---

## Getting Help

### Collecting Information

Before asking for help, collect:

1. **System information:**
   ```bash
   uname -a
   docker --version
   node --version
   npm --version
   ```

2. **Container status:**
   ```bash
   docker compose ps
   ```

3. **Recent logs:**
   ```bash
   docker compose logs --tail 100 > logs.txt
   ```

4. **Environment (sanitized):**
   ```bash
   # Remove secrets
   cat .env | grep -v SECRET | grep -v PASSWORD
   ```

### Opening GitHub Issue

Include:
- **What you're trying to do**
- **What happened** (error messages)
- **System information** (OS, Docker version, etc.)
- **Logs** (last 100 lines)
- **Steps to reproduce**

### Useful Commands

```bash
# Full system check
docker compose ps
docker compose logs --tail 50
df -h  # Disk space
free -h  # Memory

# Health checks
curl http://localhost:3000/api/health
curl http://localhost/health

# Database check
docker compose exec mongo mongosh "$MONGO_URI" --eval "db.stats()"
```

---

**Still stuck?** Check [docs/faq.md](faq.md) or open a GitHub issue with the information above.

