# Monitoring Guide

This document describes the monitoring setup for MiniEcom, including service health checks, disk space monitoring, and alerting.

## Table of Contents
1. [Monitoring Overview](#monitoring-overview)
2. [Service Monitoring](#service-monitoring)
3. [Disk Space Monitoring](#disk-space-monitoring)
4. [Log Collection](#log-collection)
5. [Alerting](#alerting)
6. [Automation](#automation)

---

## Monitoring Overview

The MiniEcom monitoring system tracks:
- **Container Health**: Docker container status and restart
- **Service Endpoints**: Backend API and frontend health checks
- **Database Connectivity**: MongoDB connection status
- **Disk Space**: Filesystem usage and alerts
- **Logs**: Application and container log collection

---

## Service Monitoring

### Manual Monitoring

Run the monitoring script:

```bash
cd /opt/miniecom
./scripts/monitor_services.sh
```

### What It Checks

1. **Container Status**: Verifies all services (api, frontend, mongo) are running
2. **Backend Health**: Checks `/api/health` endpoint
3. **Frontend Health**: Checks `/health` or root endpoint
4. **MongoDB Connection**: Tests database connectivity

### Automatic Restart

If a service is unhealthy, the script will:
1. Log the issue
2. Attempt automatic restart
3. Send email alert (if configured)
4. Verify restart success

### Health Endpoints

#### Backend Health

```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "status": "ok",
  "mongoConnected": true,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### Frontend Health

```bash
curl http://localhost/health
```

Or check root:
```bash
curl http://localhost/
```

---

## Disk Space Monitoring

### Manual Check

```bash
./scripts/disk_alert.sh
```

### Thresholds

Configured in `.env`:
- `DISK_WARN_PCT=80`: Warning threshold (default: 80%)
- `DISK_CRITICAL_PCT=90`: Critical threshold (default: 90%)

### Automatic Cleanup

When disk usage exceeds critical threshold, the script can:
- Clean Docker system (prune unused images/volumes)
- Remove old logs (older than 30 days)
- Remove old backups (older than 7 days)

Enable cleanup:
```bash
CLEANUP_TEMP=true  # in .env
```

### Manual Cleanup

```bash
# Docker cleanup
docker system prune -f --volumes

# Log cleanup
find storage/logs -name "*.log" -mtime +30 -delete

# Backup cleanup
find storage/backups -type f -mtime +7 -delete
```

---

## Log Collection

### Manual Collection

```bash
./scripts/logs_collect.sh
```

### What It Does

1. **Collects Docker Logs**: Exports logs from all containers
2. **Rotates Logs**: Compresses large log files
3. **Removes Old Logs**: Deletes logs older than retention period
4. **Creates Summary**: Generates log summary report

### Log Retention

Configured in `.env`:
- `LOG_RETENTION_DAYS=30`: Keep logs for 30 days
- `MAX_LOG_SIZE=100M`: Rotate logs larger than 100MB

### Log Locations

- **Application Logs**: `storage/logs/ops.log`
- **Backup Logs**: `storage/logs/backups.log`
- **Alert Logs**: `storage/logs/alerts.log`
- **Security Audit**: `storage/logs/security_audit.log`
- **Docker Logs**: `storage/logs/docker_<container>_<date>.log`

---

## Alerting

### Email Alerts

Configure email alerts in `.env`:
```bash
ALERT_EMAIL=admin@example.com
SMTP_FROM=noreply@yourdomain.com
```

### Alert Types

1. **Service Down**: Container not running
2. **Service Restart**: Automatic restart attempted
3. **Health Check Failed**: Endpoint not responding
4. **MongoDB Connection Issue**: Database connectivity problem
5. **Disk Space Warning**: Disk usage exceeds threshold
6. **Disk Space Critical**: Disk usage critical, cleanup attempted

### Email Delivery

The monitoring scripts use:
1. **sendmail** (if available)
2. **mail** command (fallback)

For SMTP-based email, configure in `.env`:
```bash
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_username
SMTP_PASS=your_password
SMTP_FROM=noreply@yourdomain.com
```

### Testing Alerts

Test email delivery:
```bash
echo "Test alert" | mail -s "Test" admin@example.com
```

---

## Automation

### Using Cron (Recommended for Simple Setups)

Install cron jobs:

```bash
# Copy example cron file
sudo cp cron/miniecom-cron-example /etc/cron.d/miniecom

# Or add to user crontab
crontab -e
# Add lines from cron/miniecom-cron-example
```

### Cron Schedule Examples

```bash
# Hourly monitoring
0 * * * * cd /opt/miniecom && ./scripts/monitor_services.sh

# Daily disk check at 6 AM
0 6 * * * cd /opt/miniecom && ./scripts/disk_alert.sh

# Daily log rotation at 1 AM
0 1 * * * cd /opt/miniecom && ./scripts/logs_collect.sh

# Weekly maintenance (Sunday 3 AM)
0 3 * * 0 cd /opt/miniecom && ./scripts/run_maintenance_tasks.sh
```

### Using systemd Timer

For more robust scheduling, use systemd timers (see `systemd/miniecom-backup.timer` as example).

---

## Monitoring Dashboard (Optional)

### Simple Status Page

Create a simple status page at `public/status.html`:

```html
<!DOCTYPE html>
<html>
<head>
    <title>MiniEcom Status</title>
    <meta http-equiv="refresh" content="60">
</head>
<body>
    <h1>MiniEcom Service Status</h1>
    <div id="status"></div>
    <script>
        fetch('/api/health')
            .then(r => r.json())
            .then(data => {
                document.getElementById('status').innerHTML = 
                    JSON.stringify(data, null, 2);
            });
    </script>
</body>
</html>
```

### External Monitoring Tools

Consider using:
- **Uptime Kuma**: Self-hosted uptime monitoring
- **Prometheus + Grafana**: Advanced metrics and dashboards
- **Nagios**: Enterprise monitoring solution

---

## Troubleshooting

### Issue: "Service keeps restarting"

**Check logs:**
```bash
docker compose logs api
docker compose logs frontend
```

**Check resource limits:**
```bash
docker stats
```

### Issue: "Health check fails but service is running"

**Possible causes:**
1. Health endpoint not implemented
2. Network/firewall issue
3. Service not fully started

**Solution:**
```bash
# Check service directly
docker compose exec api curl localhost:3000/api/health

# Check network
docker compose ps
docker network ls
```

### Issue: "Email alerts not working"

**Test email:**
```bash
echo "Test" | mail -s "Test" admin@example.com
```

**Check sendmail:**
```bash
which sendmail
systemctl status postfix  # or sendmail
```

**Use SMTP instead:**
Configure SMTP settings in `.env` and use a mail library in scripts.

### Issue: "Disk alert false positives"

**Adjust thresholds:**
```bash
DISK_WARN_PCT=85
DISK_CRITICAL_PCT=95
```

**Exclude specific filesystems:**
Modify `disk_alert.sh` to check specific mount points.

---

## Best Practices

1. **Monitor Regularly**: Set up automated monitoring (cron or systemd)
2. **Review Logs**: Check logs weekly for patterns
3. **Test Alerts**: Verify email delivery works
4. **Set Appropriate Thresholds**: Adjust based on your server capacity
5. **Document Incidents**: Keep a log of issues and resolutions
6. **Regular Maintenance**: Run maintenance tasks weekly

---

For backup and restore procedures, see `docs/backup_restore.md`.
For maintenance tasks, see `docs/maintenance.md`.

