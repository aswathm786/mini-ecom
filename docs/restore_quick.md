# Quick Restore Guide

This is a quick reference for restoring your store from a backup. For detailed instructions, see [docs/backup_restore.md](backup_restore.md).

---

## Emergency Restore (5 Minutes)

### Step 1: Find Your Backup

```bash
ls -lh storage/backups/
```

You'll see files like:
- `20240101_020000.tar.gz` (unencrypted)
- `20240101_020000.tar.gz.enc` (encrypted)

**Use the most recent one!**

### Step 2: Restore

**If backup is encrypted:**
```bash
# Decrypt first
./scripts/decrypt_backup.sh storage/backups/20240101_020000.tar.gz.enc storage/backups/20240101_020000.tar.gz
```

**Restore:**
```bash
./scripts/restore.sh --backup storage/backups/20240101_020000.tar.gz --confirm
```

### Step 3: Restart Services

```bash
docker compose restart
```

### Step 4: Verify

```bash
# Check health
./scripts/healthcheck.sh

# Test login
curl http://localhost:3000/api/health
```

---

## Complete Server Restore

### Step 1: Fresh Server Setup

```bash
# Install Docker (if not installed)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Clone project
git clone https://github.com/yourusername/miniecom.git
cd miniecom
```

### Step 2: Transfer Backup

**From your computer to server:**
```bash
scp storage/backups/20240101_020000.tar.gz user@server:/opt/miniecom/storage/backups/
```

**Or download from offsite backup:**
```bash
# If you have offsite backup configured
./scripts/push_offsite.sh  # This pulls from remote
```

### Step 3: Configure Environment

```bash
cp .env.example .env
# Edit .env with your settings
nano .env
```

### Step 4: Restore

```bash
# Start MongoDB first
docker compose up -d mongo
sleep 10

# Restore
./scripts/restore.sh --backup storage/backups/20240101_020000.tar.gz --confirm
```

### Step 5: Start All Services

```bash
docker compose up -d
```

### Step 6: Run Migrations (If Needed)

```bash
./scripts/migrate.sh
```

---

## Partial Restore (Database Only)

### Restore Just the Database

```bash
# Extract backup
tar -xzf storage/backups/20240101_020000.tar.gz -C /tmp/restore

# Restore MongoDB
mongorestore --uri="$MONGO_URI" --archive=/tmp/restore/*/mongo.archive.gz --gzip --drop

# Cleanup
rm -rf /tmp/restore
```

---

## Partial Restore (Uploads Only)

### Restore Just the Uploads

```bash
# Extract backup
tar -xzf storage/backups/20240101_020000.tar.gz -C /tmp/restore

# Restore uploads
rsync -av /tmp/restore/*/uploads/ storage/uploads/

# Fix permissions
./scripts/fix-perms.sh

# Cleanup
rm -rf /tmp/restore
```

---

## Verification After Restore

### Check Database

```bash
docker compose exec mongo mongosh "$MONGO_URI" --eval "
  db.stats();
  db.products.countDocuments();
  db.orders.countDocuments();
  db.users.countDocuments();
"
```

### Check Uploads

```bash
ls -la storage/uploads/
# Should see your product images
```

### Check Services

```bash
docker compose ps
# All services should be "running"
```

### Test Application

1. **Open browser:** http://localhost
2. **Browse products** - should see your products
3. **Log in as admin** - should work
4. **View orders** - should see order history

---

## Troubleshooting Restore

### "Backup file not found"

**Solution:**
```bash
# List available backups
ls -lh storage/backups/

# Use full path
./scripts/restore.sh --backup /full/path/to/backup.tar.gz --confirm
```

### "MongoDB restore failed"

**Solution:**
```bash
# Check MongoDB is running
docker compose ps mongo

# Check connection
docker compose exec mongo mongosh "$MONGO_URI" --eval "db.adminCommand('ping')"

# Try manual restore
docker compose exec mongo mongorestore --uri="$MONGO_URI" --archive=/backup/mongo.archive.gz --gzip
```

### "Permission denied"

**Solution:**
```bash
# Fix permissions
./scripts/fix-perms.sh

# Or manually
chmod -R 775 storage/
chown -R $USER:$USER storage/
```

---

## Before Restoring

**⚠️ WARNING:** Restore will overwrite existing data!

1. **Backup current state first:**
   ```bash
   ./scripts/backup.sh
   ```

2. **Test restore with dry-run:**
   ```bash
   ./scripts/restore.sh --backup <backup_file> --dry-run
   ```

3. **Enter maintenance mode:**
   ```bash
   ./scripts/enter_maintenance.sh "Restoring from backup"
   ```

---

## After Restoring

1. **Exit maintenance mode:**
   ```bash
   ./scripts/exit_maintenance.sh
   ```

2. **Verify everything works:**
   ```bash
   ./scripts/healthcheck.sh
   ```

3. **Test admin login:**
   - Go to http://localhost/admin
   - Log in with admin credentials

4. **Check recent orders:**
   - Should see orders from backup date

---

## Quick Commands Reference

```bash
# List backups
ls -lh storage/backups/

# Restore (interactive)
./scripts/restore.sh --backup <backup_file> --confirm

# Restore (dry-run - safe to test)
./scripts/restore.sh --backup <backup_file> --dry-run

# Decrypt backup
./scripts/decrypt_backup.sh <encrypted_file> <output_file>

# Health check
./scripts/healthcheck.sh

# View logs
docker compose logs
```

---

**For detailed restore scenarios, see [docs/backup_restore.md](backup_restore.md)**

