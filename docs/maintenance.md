# Maintenance Guide

This document describes routine maintenance tasks for MiniEcom, including scheduled maintenance, security audits, and system optimization.

## Table of Contents
1. [Maintenance Overview](#maintenance-overview)
2. [Routine Maintenance Tasks](#routine-maintenance-tasks)
3. [Maintenance Mode](#maintenance-mode)
4. [Security Audits](#security-audits)
5. [Database Maintenance](#database-maintenance)
6. [Performance Optimization](#performance-optimization)

---

## Maintenance Overview

Regular maintenance ensures:
- **System Stability**: Prevent issues before they occur
- **Security**: Keep system secure and up-to-date
- **Performance**: Optimize database and application
- **Data Integrity**: Regular backups and verification

---

## Routine Maintenance Tasks

### Automated Maintenance

Run all maintenance tasks:

```bash
cd /opt/miniecom
./scripts/run_maintenance_tasks.sh
```

This script runs:
1. Docker system cleanup
2. Log rotation
3. Backup rotation
4. Disk space check
5. Database maintenance
6. Security audit

### Schedule Maintenance

**Weekly (Recommended)**:
```bash
# Add to crontab (Sunday 3 AM)
0 3 * * 0 cd /opt/miniecom && ./scripts/run_maintenance_tasks.sh
```

**Or use systemd timer** (create similar to backup timer).

---

## Maintenance Mode

### Entering Maintenance Mode

Place the application in maintenance mode:

```bash
./scripts/enter_maintenance.sh "Scheduled maintenance - database optimization"
```

This:
- Creates a maintenance flag file
- Logs the maintenance reason
- Optionally stops services (commented out by default)

### During Maintenance

While in maintenance mode:
- Users may see maintenance page (if configured in Nginx)
- API may return maintenance status
- Admin can still access system

### Exiting Maintenance Mode

```bash
./scripts/exit_maintenance.sh
```

This:
- Removes maintenance flag
- Restarts services
- Runs health check

### Check Maintenance Status

```bash
if [ -f storage/.maintenance ]; then
    echo "In maintenance mode"
    cat storage/.maintenance
else
    echo "Not in maintenance mode"
fi
```

---

## Security Audits

### Run Security Audit

```bash
./scripts/sec_audit.sh
```

### What It Checks

1. **File Permissions**: `.env` file should be 600 or 400
2. **World-Writable Directories**: No directories should be world-writable
3. **Sensitive Files**: Check for world-readable secret files
4. **Hardcoded Secrets**: Basic check for passwords in code
5. **Docker Socket**: Verify Docker socket permissions
6. **Exposed Ports**: List all exposed Docker ports

### Fixing Issues

#### Fix .env Permissions

```bash
chmod 600 .env
```

#### Fix World-Writable Directories

```bash
find . -type d -perm -002 ! -path "*/node_modules/*" -exec chmod 755 {} \;
```

#### Remove Hardcoded Secrets

Review code and move secrets to `.env`.

### Schedule Security Audits

```bash
# Weekly security audit (Monday 4 AM)
0 4 * * 1 cd /opt/miniecom && ./scripts/sec_audit.sh
```

---

## Database Maintenance

### MongoDB Maintenance

#### Compact Collections

```bash
docker compose exec mongo mongosh "$MONGO_URI" --eval "
  db.runCommand({compact: 'users'});
  db.runCommand({compact: 'products'});
  db.runCommand({compact: 'orders'});
"
```

#### Rebuild Indexes

```bash
docker compose exec mongo mongosh "$MONGO_URI" --eval "
  db.users.reIndex();
  db.products.reIndex();
  db.orders.reIndex();
"
```

#### Check Database Stats

```bash
docker compose exec mongo mongosh "$MONGO_URI" --eval "
  db.stats();
  db.users.stats();
  db.products.stats();
  db.orders.stats();
"
```

#### Remove Orphaned Data

Check for orphaned records:
```bash
# Example: Remove orders without users
docker compose exec mongo mongosh "$MONGO_URI" --eval "
  db.orders.deleteMany({ userId: { \$nin: db.users.distinct('_id') } });
"
```

### Database Backup Before Maintenance

**Always backup before major maintenance:**

```bash
./scripts/backup.sh
```

---

## Performance Optimization

### Docker Optimization

#### Clean Docker System

```bash
docker system prune -f --volumes
```

#### Remove Unused Images

```bash
docker image prune -a -f
```

#### Remove Unused Volumes

```bash
docker volume prune -f
```

### Application Optimization

#### Update Dependencies

```bash
# Backend
cd backend
npm update
npm audit fix

# Frontend
cd frontend
npm update
npm audit fix
```

#### Rebuild Docker Images

```bash
docker compose build --no-cache
```

### Log Optimization

#### Rotate Logs

```bash
./scripts/logs_collect.sh
```

#### Compress Old Logs

```bash
find storage/logs -name "*.log" -mtime +7 -exec gzip {} \;
```

---

## Maintenance Checklist

### Daily

- [ ] Check service health: `./scripts/monitor_services.sh`
- [ ] Review error logs: `tail -f storage/logs/ops.log`
- [ ] Check disk space: `./scripts/disk_alert.sh`

### Weekly

- [ ] Run full maintenance: `./scripts/run_maintenance_tasks.sh`
- [ ] Security audit: `./scripts/sec_audit.sh`
- [ ] Review backup logs: `tail storage/logs/backups.log`
- [ ] Check for updates: `docker compose pull`

### Monthly

- [ ] Test backup restore: `./scripts/test_backup.sh`
- [ ] Review and update dependencies
- [ ] Database optimization (compact, reindex)
- [ ] Review security audit results
- [ ] Update documentation

### Quarterly

- [ ] Disaster recovery drill
- [ ] Performance review
- [ ] Security review
- [ ] Update system packages

---

## Troubleshooting

### Issue: "Maintenance mode not working"

**Check flag file:**
```bash
ls -la storage/.maintenance
cat storage/.maintenance
```

**Check Nginx config:**
If using Nginx, ensure maintenance page is configured.

### Issue: "Security audit finds many issues"

**Prioritize fixes:**
1. Fix `.env` permissions immediately
2. Fix world-writable directories
3. Review hardcoded secrets
4. Document and plan fixes for others

### Issue: "Database maintenance takes too long"

**Run during low-traffic hours:**
```bash
# Schedule for 2 AM
0 2 * * * cd /opt/miniecom && ./scripts/run_maintenance_tasks.sh
```

**For large databases:**
- Run maintenance on replica/secondary
- Use `background: true` option for compact

### Issue: "Docker cleanup removes needed data"

**Be careful with:**
- `docker system prune --volumes`: Removes all unused volumes
- `docker volume prune`: Removes unused volumes

**Safe cleanup:**
```bash
# Only remove stopped containers
docker container prune -f

# Only remove unused images
docker image prune -f
```

---

## Best Practices

1. **Schedule Regular Maintenance**: Weekly automated tasks
2. **Backup Before Changes**: Always backup before major operations
3. **Test in Staging**: Test maintenance procedures in staging first
4. **Document Changes**: Keep a maintenance log
5. **Monitor After Maintenance**: Check services after maintenance
6. **Review Logs**: Regularly review maintenance logs
7. **Update Regularly**: Keep dependencies and system updated

---

## Maintenance Log Template

Keep a maintenance log:

```markdown
# Maintenance Log

## 2024-01-01
- Ran weekly maintenance
- Security audit: 0 issues
- Database compacted
- Logs rotated

## 2024-01-08
- Updated dependencies
- Rebuilt Docker images
- Tested backup restore
```

---

For backup and restore procedures, see `docs/backup_restore.md`.
For monitoring setup, see `docs/monitoring.md`.

