# Scripts Documentation

Complete reference for all automation scripts in the Handmade Harmony project.

## 📋 Table of Contents

- [Database Scripts](database-scripts.md) - Schema, migrations, seeding
- [Backup & Restore](backup-restore.md) - Data protection scripts
- [Maintenance Scripts](maintenance-scripts.md) - System maintenance
- [Deployment Scripts](deployment-scripts.md) - Deployment automation

## 🚀 Quick Reference

### Database Operations

| Script | Purpose | Platform |
|--------|---------|----------|
| `init_schema.sh` / `init_schema.ps1` | Initialize MongoDB schema | Linux/Windows |
| `migrate.sh` | Run database migrations | Linux/Windows (bash) |
| `seed_admin.js` | Create admin user | All |
| `seed_sample_data.sh` | Add sample products | Linux/Windows (bash) |

### Backup & Restore

| Script | Purpose | Platform |
|--------|---------|----------|
| `backup.sh` | Create backup | Linux/Windows (bash) |
| `restore.sh` | Restore from backup | Linux/Windows (bash) |
| `encrypt_backup.sh` | Encrypt backup file | Linux/Windows (bash) |
| `decrypt_backup.sh` | Decrypt backup file | Linux/Windows (bash) |

### Maintenance

| Script | Purpose | Platform |
|--------|---------|----------|
| `healthcheck.sh` | Check service health | Linux/Windows (bash) |
| `monitor_services.sh` | Monitor all services | Linux/Windows (bash) |
| `run_maintenance_tasks.sh` | Run maintenance | Linux/Windows (bash) |
| `fix-perms.sh` | Fix file permissions | Linux only |

### Deployment

| Script | Purpose | Platform |
|--------|---------|----------|
| `deploy.sh` | Deploy to remote server | Linux/Windows (bash) |
| `quick_start.sh` | Complete setup | Linux/Windows (bash) |
| `setup_github.sh` | Setup GitHub integration | Linux/Windows (bash) |

## 💻 Platform-Specific Execution

### Linux/Mac

Most scripts are bash scripts (.sh files):

```bash
# Make executable (first time only)
chmod +x scripts/scriptname.sh

# Run script
./scripts/scriptname.sh [arguments]
```

### Windows

**Option 1: Git Bash (Recommended)**
```bash
# Run bash scripts
bash scripts/scriptname.sh [arguments]
```

**Option 2: WSL (Windows Subsystem for Linux)**
```powershell
# Run bash scripts through WSL
wsl bash scripts/scriptname.sh [arguments]
```

**Option 3: PowerShell (If .ps1 version available)**
```powershell
# Run PowerShell scripts
.\scripts\scriptname.ps1 [arguments]
```

**Option 4: Node.js Scripts**
```powershell
# JavaScript/TypeScript scripts work on all platforms
node scripts/scriptname.js [arguments]
npx ts-node scripts/scriptname.ts [arguments]
```

## 🔧 Common Script Patterns

### Database Scripts

**Linux/Mac:**
```bash
# Initialize schema
bash scripts/init_schema.sh

# Run migrations
bash scripts/migrate.sh

# Create admin
node scripts/seed_admin.js
```

**Windows (PowerShell):**
```powershell
# Initialize schema
.\scripts\init_schema.ps1

# Run migrations
bash scripts/migrate.sh
# OR
wsl bash scripts/migrate.sh

# Create admin
node scripts/seed_admin.js
```

### Backup Scripts

**Linux/Mac:**
```bash
# Create backup
./scripts/backup.sh

# Restore backup
./scripts/restore.sh --backup storage/backups/20240101_120000.tar.gz --confirm
```

**Windows (PowerShell):**
```powershell
# Create backup
bash scripts/backup.sh

# Restore backup
bash scripts/restore.sh --backup storage/backups/20240101_120000.tar.gz --confirm
```

### Maintenance Scripts

**Linux/Mac:**
```bash
# Health check
./scripts/healthcheck.sh

# Monitor services
./scripts/monitor_services.sh

# Run maintenance
./scripts/run_maintenance_tasks.sh
```

**Windows (PowerShell):**
```powershell
# Health check
bash scripts/healthcheck.sh

# Monitor services
bash scripts/monitor_services.sh

# Run maintenance
bash scripts/run_maintenance_tasks.sh
```

## 🔐 Required Permissions

### Linux

```bash
# Make scripts executable
chmod +x scripts/*.sh

# Fix permissions for specific script
chmod +x scripts/backup.sh

# Grant ownership
sudo chown -R $USER:$USER scripts/
```

### Windows

PowerShell scripts may require execution policy adjustment:

```powershell
# Check current policy
Get-ExecutionPolicy

# Allow script execution (run as Administrator)
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser

# Or for single script
PowerShell -ExecutionPolicy Bypass -File .\scripts\scriptname.ps1
```

## 🔄 Automated Execution

### Cron Jobs (Linux)

```bash
# Edit crontab
crontab -e

# Daily backup at 2 AM
0 2 * * * /opt/miniecom/scripts/backup.sh

# Hourly health check
0 * * * * /opt/miniecom/scripts/healthcheck.sh

# Weekly maintenance (Sunday 3 AM)
0 3 * * 0 /opt/miniecom/scripts/run_maintenance_tasks.sh
```

### Systemd Timers (Linux)

```bash
# Create timer
sudo nano /etc/systemd/system/miniecom-backup.timer

# Enable timer
sudo systemctl enable miniecom-backup.timer
sudo systemctl start miniecom-backup.timer
```

### Windows Task Scheduler

```powershell
# Create scheduled task
$action = New-ScheduledTaskAction -Execute 'bash' -Argument 'C:\miniecom\scripts\backup.sh'
$trigger = New-ScheduledTaskTrigger -Daily -At 2am
Register-ScheduledTask -TaskName "MiniEcom Backup" -Action $action -Trigger $trigger
```

## 📝 Script Output and Logs

### Log Locations

- **Script logs:** `storage/logs/`
- **Application logs:** `storage/logs/app.log`
- **Error logs:** `storage/logs/error.log`
- **Backup logs:** `storage/logs/backup.log`

### View Logs

**Linux/Mac:**
```bash
# Tail logs
tail -f storage/logs/backup.log

# View specific log
cat storage/logs/healthcheck.log

# Search logs
grep "ERROR" storage/logs/app.log
```

**Windows (PowerShell):**
```powershell
# Tail logs
Get-Content storage/logs/backup.log -Wait -Tail 50

# View specific log
Get-Content storage/logs/healthcheck.log

# Search logs
Select-String -Path storage/logs/app.log -Pattern "ERROR"
```

## ⚠️ Safety Tips

1. **Test Before Production**: Always test scripts in development first
2. **Backup Before Major Operations**: Create backup before migrations or updates
3. **Check Logs**: Review script output for errors
4. **Dry Run**: Use `--dry-run` flag when available
5. **Verify Permissions**: Ensure scripts have correct permissions
6. **Environment Variables**: Verify `.env` is configured correctly
7. **Dependencies**: Check required tools are installed

## 🆘 Troubleshooting

### "Permission Denied"

**Linux:**
```bash
chmod +x scripts/scriptname.sh
```

**Windows:**
```powershell
# Run as Administrator or adjust execution policy
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### "Command Not Found"

**Cause:** Script not in PATH or missing executable permissions

**Solution:**
```bash
# Use full path
./scripts/scriptname.sh

# Or add to PATH
export PATH=$PATH:/path/to/scripts
```

### "Syntax Error" (Windows)

**Cause:** Trying to run bash script without bash

**Solution:**
```powershell
# Use bash
bash scripts/scriptname.sh

# Or use WSL
wsl bash scripts/scriptname.sh
```

### Scripts Hang or Timeout

**Causes:**
- Long-running operation
- Waiting for user input
- Service not responding

**Solution:**
- Check script logs
- Verify services are running
- Run with verbose flag: `bash -x scripts/scriptname.sh`

## 📚 Detailed Guides

- [Database Scripts](database-scripts.md) - Complete database operations
- [Backup & Restore](backup-restore.md) - Data protection procedures
- [Maintenance Scripts](maintenance-scripts.md) - System maintenance
- [Deployment Scripts](deployment-scripts.md) - Deployment automation

---

**Need help?** Check the [Troubleshooting Guide](../operations/troubleshooting.md) or specific script documentation.

