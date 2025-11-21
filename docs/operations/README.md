# Operations Documentation

Guides for monitoring, maintaining, and troubleshooting your e-commerce store.

## 📋 Contents

- [Monitoring](monitoring.md) - System monitoring and alerts
- [Backup & Restore](backup-restore.md) - Data protection
- [Maintenance](maintenance.md) - Regular maintenance tasks
- [Troubleshooting](troubleshooting.md) - Common issues and solutions

## 🎯 Daily Operations

### Health Checks

**Check Application Status:**
```bash
# All platforms
curl https://yourstore.com/api/health
curl https://yourstore.com/health
```

**Check Services:**

**Docker:**
```bash
docker compose ps
docker compose logs --tail=50
```

**Native (Linux):**
```bash
pm2 status
sudo systemctl status mongod
sudo systemctl status nginx
```

**Native (Windows):**
```powershell
pm2 status
Get-Service MongoDB
Get-Service "World Wide Web Publishing Service"
```

### Monitor Key Metrics

- **Server Resources**: CPU, RAM, Disk
- **Application**: Response times, error rates
- **Database**: Connection pool, query performance
- **Orders**: New orders, failed payments
- **Errors**: Application logs, error counts

## 🔧 Regular Maintenance

### Daily

- [ ] Check error logs
- [ ] Review new orders
- [ ] Monitor server resources
- [ ] Verify backup completed

### Weekly

- [ ] Review performance metrics
- [ ] Check disk space
- [ ] Test backup restore
- [ ] Update content (if needed)
- [ ] Review security logs

### Monthly

- [ ] Update dependencies
- [ ] Security audit
- [ ] Performance optimization
- [ ] Database maintenance
- [ ] Review and rotate logs
- [ ] Test disaster recovery

## 📚 Detailed Guides

- **[Monitoring](monitoring.md)** - Set up monitoring and alerts
- **[Backup & Restore](backup-restore.md)** - Protect your data
- **[Maintenance](maintenance.md)** - Keep your store healthy
- **[Troubleshooting](troubleshooting.md)** - Fix common issues

## 🆘 Emergency Procedures

### Site Down

1. Check server status
2. Check Docker/PM2 status  
3. Review error logs
4. Restart services if needed
5. Check MongoDB connection
6. Verify network/DNS

### Database Issues

1. Check MongoDB status
2. Review MongoDB logs
3. Check disk space
4. Restart MongoDB if needed
5. Restore from backup if corrupted

### Performance Issues

1. Check resource usage (CPU, RAM, Disk)
2. Review slow queries
3. Clear cache
4. Restart services
5. Scale resources if needed

## 📞 Getting Help

1. Check [Troubleshooting Guide](troubleshooting.md)
2. Review [FAQ](../FAQ.md)
3. Search [GitHub Issues](https://github.com/aswathm786/mini-ecom/issues)
4. Open new issue with details

