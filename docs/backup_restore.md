# Backup and Restore Guide

This document provides comprehensive instructions for backing up and restoring the MiniEcom application.

## Table of Contents
1. [Backup Overview](#backup-overview)
2. [Creating Backups](#creating-backups)
3. [Backup Components](#backup-components)
4. [Restore Procedures](#restore-procedures)
5. [Verification Steps](#verification-steps)
6. [Troubleshooting](#troubleshooting)

---

## Backup Overview

The MiniEcom backup system creates comprehensive backups of:
- **MongoDB Database**: Complete database dump using `mongodump`
- **Uploads/Storage**: All user-uploaded files from `storage/uploads`
- **Configuration**: `.env` file and `docker-compose.yml`

Backups are stored in `storage/backups/` by default and can be encrypted and pushed to offsite locations.

---

## Creating Backups

### Manual Backup

Run the backup script manually:

**On Mac/Linux:**
```bash
cd /opt/miniecom
./scripts/backup.sh
```

**On Windows (PowerShell):**
```powershell
cd C:\path\to\miniecom
bash scripts/backup.sh
# OR using WSL:
wsl bash scripts/backup.sh
```

### Automated Backups

#### Using systemd Timer (Recommended)

1. **Install the service and timer:**
   ```bash
   sudo cp systemd/miniecom-backup.service /etc/systemd/system/
   sudo cp systemd/miniecom-backup.timer /etc/systemd/system/
   sudo systemctl daemon-reload
   sudo systemctl enable miniecom-backup.timer
   sudo systemctl start miniecom-backup.timer
   ```

2. **Check timer status:**
   ```bash
   sudo systemctl status miniecom-backup.timer
   sudo systemctl list-timers miniecom-backup.timer
   ```

#### Using Cron

Add the backup job to your crontab:

```bash
crontab -e
# Add: 0 2 * * * cd /opt/miniecom && ./scripts/backup.sh >> storage/logs/cron.log 2>&1
```

### Test Backup

Before relying on backups, test the backup process:

**On Mac/Linux:**
```bash
./scripts/test_backup.sh
```

**On Windows (PowerShell):**
```powershell
bash scripts/test_backup.sh
# OR using WSL:
wsl bash scripts/test_backup.sh
```

This creates a test backup and validates all components.

---

## Backup Components

### MongoDB Backup

- **Format**: Compressed archive (`mongo.archive.gz`)
- **Tool**: `mongodump` with `--gzip` flag
- **Location**: `$BACKUP_DIR/<timestamp>/mongo.archive.gz`

### Uploads Backup

- **Format**: Directory structure preserved via `rsync`
- **Location**: `$BACKUP_DIR/<timestamp>/uploads/`
- **Note**: Only backs up `storage/uploads/` directory

### Configuration Backup

- **Files**: `.env`, `docker-compose.yml`
- **Location**: `$BACKUP_DIR/<timestamp>/`

### Backup Manifest

Each backup includes a `manifest.json` file with:
- Timestamp
- Component sizes
- Version information

---

## Restore Procedures

### Scenario 1: Database Lost (Full Database Restore)

**When to use**: Database corruption, accidental deletion, or migration failure.

**Steps**:

1. **Stop the application:**
   ```bash
   cd /opt/miniecom
   docker compose stop api frontend
   ```

2. **Run restore script:**
   ```bash
   ./scripts/restore.sh --backup storage/backups/20240101_020000.tar.gz --confirm
   ```

3. **Restart services:**
   ```bash
   docker compose start api frontend
   ```

4. **Verify restore:**
   ```bash
   ./scripts/healthcheck.sh
   mongosh "$MONGO_URI" --eval "db.stats()"
   ```

### Scenario 2: Server Lost (Complete Restore)

**When to use**: Server failure, hardware replacement, or disaster recovery.

**Prerequisites**:
- Fresh server with Docker and Docker Compose installed
- Backup files (encrypted or decrypted)
- `.env` file with correct configuration

**Steps**:

1. **Set up new server:**
   ```bash
   # Install Docker (see docs/deploy.md)
   # Clone or transfer project files
   git clone <repo-url> /opt/miniecom
   cd /opt/miniecom
   ```

2. **Restore configuration:**
   ```bash
   # Extract backup
   tar -xzf storage/backups/20240101_020000.tar.gz -C /tmp/restore
   
   # Copy .env (verify values first!)
   cp /tmp/restore/*/.env .env
   ```

3. **Start MongoDB:**
   ```bash
   docker compose up -d mongo
   # Wait for MongoDB to be ready
   sleep 10
   ```

4. **Restore database:**
   ```bash
   ./scripts/restore.sh --backup storage/backups/20240101_020000.tar.gz --confirm
   ```

5. **Restore uploads:**
   ```bash
   # Uploads are restored automatically by restore.sh
   # Or manually:
   rsync -av /tmp/restore/*/uploads/ storage/uploads/
   ```

6. **Start all services:**
   ```bash
   docker compose up -d
   ```

7. **Run migrations (if needed):**
   ```bash
   ./scripts/migrate.sh
   ```

8. **Verify:**
   ```bash
   ./scripts/healthcheck.sh
   ```

### Scenario 3: Partial Restore (Uploads Only)

**When to use**: Uploads directory lost or corrupted.

**Steps**:

1. **Extract backup:**
   ```bash
   tar -xzf storage/backups/20240101_020000.tar.gz -C /tmp/restore
   ```

2. **Restore uploads:**
   ```bash
   rsync -av /tmp/restore/*/uploads/ storage/uploads/
   ./scripts/fix-perms.sh
   ```

3. **Restart services:**
   ```bash
   docker compose restart api
   ```

### Encrypted Backup Restore

If your backup is encrypted (`.tar.gz.enc`):

1. **Decrypt first:**
   ```bash
   ./scripts/decrypt_backup.sh storage/backups/20240101_020000.tar.gz.enc storage/backups/20240101_020000.tar.gz
   ```

2. **Then restore:**
   ```bash
   ./scripts/restore.sh --backup storage/backups/20240101_020000.tar.gz --confirm
   ```

---

## Verification Steps

After any restore operation, verify:

### 1. Database Integrity

```bash
mongosh "$MONGO_URI" --eval "
  db.stats();
  db.users.countDocuments();
  db.products.countDocuments();
  db.orders.countDocuments();
"
```

### 2. Uploads Directory

```bash
ls -la storage/uploads/
# Check for expected files and directories
```

### 3. Service Health

```bash
./scripts/healthcheck.sh
curl http://localhost/api/health
curl http://localhost/health
```

### 4. Application Functionality

- Log in to admin panel
- Browse products
- View orders
- Check file uploads

---

## Troubleshooting

### Issue: "mongodump not found"

**Solution**: Install MongoDB database tools:
```bash
# Ubuntu/Debian
sudo apt-get install mongodb-database-tools

# Or ensure mongodb-tools are installed in Docker container
# (Already included in Dockerfile.backend)
```

### Issue: "Permission denied" during restore

**Solution**: Fix permissions:
```bash
./scripts/fix-perms.sh
sudo chown -R $USER:$USER storage/
```

### Issue: "Backup file is corrupted"

**Solution**:
1. Check backup file integrity:
   ```bash
   file storage/backups/20240101_020000.tar.gz
   ```
2. Try decrypting if encrypted:
   ```bash
   ./scripts/decrypt_backup.sh storage/backups/20240101_020000.tar.gz.enc
   ```
3. Verify manifest.json in backup

### Issue: "Docker volume vs bind mount"

**Important**: If using Docker volumes (not bind mounts), restore process differs:

1. **For bind mounts** (development): Restore directly to `storage/uploads/`
2. **For volumes** (production): Restore to volume:
   ```bash
   docker compose exec api sh -c "tar -xzf /backup.tar.gz -C /app/storage/"
   ```

### Issue: "MongoDB authentication failed"

**Solution**: Verify `MONGO_URI` in `.env` matches backup source:
```bash
# Check .env
cat .env | grep MONGO_URI

# Test connection
mongosh "$MONGO_URI" --eval "db.adminCommand('ping')"
```

### Issue: "Restore overwrote production data"

**Prevention**: Always use `--dry-run` first:
```bash
./scripts/restore.sh --backup <backup_file> --dry-run
```

---

## Best Practices

1. **Test backups regularly**: Run `test_backup.sh` monthly
2. **Verify backups**: Check backup files exist and are non-empty
3. **Offsite backups**: Use `push_offsite.sh` for disaster recovery
4. **Retention policy**: Configure `BACKUP_RETENTION_DAYS` appropriately
5. **Encryption**: Always encrypt backups containing sensitive data
6. **Document restore procedures**: Keep this guide updated
7. **Regular drills**: Practice restore procedures in test environment

---

## Backup Retention

Backups are automatically rotated based on retention policy:
- **Daily**: Kept for `BACKUP_RETENTION_DAYS` (default: 14 days)
- **Weekly**: First backup of each week kept for `BACKUP_RETENTION_WEEKS` (default: 12 weeks)
- **Monthly**: First backup of each month kept for `BACKUP_RETENTION_MONTHS` (default: 12 months)

Run rotation manually:
```bash
./scripts/rotate_backups.sh
```

---

## Offsite Backups

Configure offsite backup push in `.env`:
```bash
OFFSITE_HOST=backup.example.com
OFFSITE_USER=backup_user
OFFSITE_PATH=/backups/miniecom
OFFSITE_SSH_KEY=/home/user/.ssh/id_rsa
```

Push backups manually:
```bash
./scripts/push_offsite.sh
```

Or automate via cron:
```bash
# Add to crontab: 30 2 * * * cd /opt/miniecom && ./scripts/push_offsite.sh
```

---

For additional help, check `docs/monitoring.md` and `docs/maintenance.md`.

