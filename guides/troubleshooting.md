# Troubleshooting Guide - Membership Management System

## 🔍 Quick Diagnostic Commands

### System Health Check
```bash
# Check all services
docker-compose ps

# Check system resources
df -h && free -h

# Check logs
docker-compose logs --tail=50

# Run health check
./scripts/health-check.sh
```

## 🚨 Common Issues & Solutions

### 1. Docker Installation Issues

#### Problem: "Permission denied" when running Docker
**Solution:**
```bash
# Add user to docker group
sudo usermod -aG docker $USER
# Log out and back in
exit && login
```

#### Problem: Docker daemon not running
**Solution:**
```bash
# Start Docker service
sudo systemctl start docker
sudo systemctl enable docker
```

### 2. Application Won't Start

#### Problem: Port already in use
**Solution:**
```bash
# Check what's using port 3000
sudo lsof -i :3000
# Kill process if needed
sudo kill -9 <PID>
# Or change port in docker-compose.yml
```

#### Problem: Database connection failed
**Solution:**
```bash
# Check database container
docker-compose logs db
# Reset database if needed
docker-compose down -v
docker-compose up -d
```

### 3. SSL Certificate Issues

#### Problem: SSL certificate expired
**Solution:**
```bash
# Renew certificate
sudo certbot renew --dry-run
sudo certbot renew
```

#### Problem: Mixed content warnings
**Solution:**
```bash
# Check nginx configuration
sudo nginx -t
# Ensure all URLs use HTTPS
```

### 4. Email Delivery Issues

#### Problem: Emails not sending
**Solution:**
```bash
# Check email service logs
docker-compose logs api | grep -i email
# Verify API keys
echo $RESEND_API_KEY
```

#### Problem: Emails going to spam
**Solution:**
- Verify DNS records (SPF, DKIM, DMARC)
- Check sender reputation
- Use authenticated domain

### 5. Payment Processing Issues

#### Problem: Stripe webhook not working
**Solution:**
```bash
# Check webhook endpoint
curl -X POST http://localhost:3001/webhooks/stripe
# Verify webhook secret
echo $STRIPE_WEBHOOK_SECRET
```

#### Problem: Payment failures
**Solution:**
- Check Stripe dashboard for errors
- Verify payment method validity
- Check currency and amount limits

## 📊 Performance Issues

### High Memory Usage
```bash
# Check memory usage
docker stats

# Identify memory leaks
docker-compose logs --tail=1000 | grep -i memory
```

### High CPU Usage
```bash
# Check CPU usage
top -p $(pgrep dockerd)

# Profile application
docker exec membership-api node --prof app.js
```

### Database Performance
```bash
# Check slow queries
docker exec membership-db psql -U postgres -c "SELECT query, calls, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"

# Analyze database
docker exec membership-db psql -U postgres -c "ANALYZE;"
```

## 🔧 Database Issues

### Database Connection Lost
```bash
# Check database status
docker-compose ps db

# Restart database
docker-compose restart db

# Check logs
docker-compose logs db
```

### Data Corruption
```bash
# Restore from backup
./scripts/restore.sh --backup-id=BACKUP_ID

# Verify data integrity
docker exec membership-db psql -U postgres -c "CHECK TABLE users;"
```

### Slow Queries
```bash
# Enable query logging
docker exec membership-db psql -U postgres -c "ALTER SYSTEM SET log_statement = 'all';"
docker exec membership-db psql -U postgres -c "SELECT pg_reload_conf();"
```

## 📱 Mobile App Issues

### PWA Not Working
```bash
# Check service worker
curl -I http://localhost:3000/sw.js

# Clear browser cache
# Chrome: F12 → Application → Service Workers → Unregister
```

### Push Notifications Not Working
```bash
# Check notification permissions
# Chrome: F12 → Application → Service Worker → Push → Test
```

## 🔒 Security Issues

### SSL/TLS Configuration
```bash
# Test SSL configuration
curl -v https://yourdomain.com

# Check SSL grade
nmap --script ssl-enum-ciphers -p 443 yourdomain.com
```

### Firewall Configuration
```bash
# Check UFW status
sudo ufw status

# Allow specific ports
sudo ufw allow 3000/tcp
```

### Security Headers
```bash
# Test security headers
curl -I https://yourdomain.com | grep -E "X-Frame-Options|X-Content-Type-Options|X-XSS-Protection"
```

## 🌐 Network Issues

### Port Forwarding
```bash
# Check listening ports
sudo netstat -tulpn | grep :3000

# Test connectivity
telnet localhost 3000
```

### DNS Issues
```bash
# Check DNS resolution
nslookup yourdomain.com
dig yourdomain.com
```

### Load Balancer Issues
```bash
# Check nginx configuration
sudo nginx -t
# Check nginx logs
sudo tail -f /var/log/nginx/error.log
```

## 🔄 Backup & Restore Issues

### Backup Script Not Running
```bash
# Check cron jobs
crontab -l

# Test backup script manually
./scripts/backup.sh daily
```

### Restore Issues
```bash
# List available backups
./scripts/restore.sh list

# Check backup integrity
gzip -t /backups/daily/database_*.sql.gz
```

## 📊 Monitoring & Alerts

### Health Check Failed
```bash
# Run health check manually
./scripts/health-check.sh

# Check individual services
curl -f http://localhost:3000/health
curl -f http://localhost:3001/health
```

### Log Analysis
```bash
# View recent logs
docker-compose logs --tail=100

# Search for errors
docker-compose logs | grep -i error

# Follow logs in real-time
docker-compose logs -f
```

## 🎯 Performance Optimization

### Database Optimization
```bash
# Optimize database
docker exec membership-db psql -U postgres -c "VACUUM ANALYZE;"
docker exec membership-db psql -U postgres -c "REINDEX DATABASE membership_db;"
```

### Application Optimization
```bash
# Check application performance
docker exec membership-api node --inspect app.js
```

### Caching Optimization
```bash
# Clear Redis cache
docker exec membership-redis redis-cli FLUSHALL
```

## 🛠️ Diagnostic Scripts

### System Diagnostic Script
```bash
cat > diagnose.sh << 'EOF'
#!/bin/bash
echo "=== System Diagnostic ==="
echo "Date: $(date)"
echo "OS: $(lsb_release -d)"
echo "Memory: $(free -h | grep Mem)"
echo "Disk: $(df -h /)"
echo "Docker: $(docker --version)"
echo "Docker Compose: $(docker-compose --version)"
echo "=== Service Status ==="
docker-compose ps
echo "=== Health Checks ==="
curl -f http://localhost:3000/health && echo "✓ Web OK" || echo "✗ Web FAIL"
curl -f http://localhost:3001/health && echo "✓ API OK" || echo "✗ API FAIL"
EOF
chmod +x diagnose.sh
```

## 📞 Support Contacts

### Technical Support
- **Email**: support@yourorganization.com
- **Documentation**: [docs/installation.md](docs/installation.md)
- **GitHub Issues**: [GitHub Issues](https://github.com/wjlander/newmembership/issues)

### Emergency Contacts
- **System Admin**: admin@yourorganization.com
- **On-call Engineer**: +1-555-123-4567
- **Discord/Slack**: #membership-support

## 🔄 Emergency Procedures

### System Down
1. **Check service status**: `docker-compose ps`
2. **Check logs**: `docker-compose logs`
3. **Restart services**: `docker-compose restart`
4. **Restore from backup**: `./scripts/restore.sh --backup-id=latest`

### Security Incident
1. **Isolate system**: `docker-compose down`
2. **Assess damage**: Check logs and files
3. **Restore from clean backup**: `./scripts/restore.sh --backup-id=pre-incident`
4. **Apply security patches**: Update and restart

### Data Loss
1. **Stop all services**: `docker-compose down`
2. **Restore from backup**: `./scripts/restore.sh --backup-id=latest`
3. **Verify data integrity**: Run health checks
4. **Resume services**: `docker-compose up -d`

## 📋 Maintenance Checklist

### Daily Tasks
- [ ] Check system health: `./scripts/health-check.sh`
- [ ] Review logs for errors
- [ ] Monitor disk space
- [ ] Check SSL certificate expiry

### Weekly Tasks
- [ ] Review backup logs
- [ ] Update system packages
- [ ] Check security alerts
- [ ] Review performance metrics

### Monthly Tasks
- [ ] Test backup restore process
- [ ] Review user feedback
- [ ] Update documentation
- [ ] Plan feature updates

## 🎯 Quick Fixes

### Most Common Issues
1. **Port conflicts**: Change ports in docker-compose.yml
2. **Memory issues**: Increase Docker memory limits
3. **Database issues**: Restart database container
4. **SSL issues**: Renew certificates with certbot
5. **Email issues**: Check API keys and DNS records

### Emergency Commands
```bash
# Full system restart
docker-compose down && docker-compose up -d

# Database reset (WARNING: Data loss)
docker-compose down -v && docker-compose up -d

# Check all logs
docker-compose logs --tail=1000 > debug.log

# System resource check
htop
df -h
```

---

**Need more help?** Check the [installation guide](docs/installation.md) or contact support.