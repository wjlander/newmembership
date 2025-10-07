# Superadmin Guide - System Administrator Manual

## 🎯 Role Overview

As a **Superadmin**, you have complete system access including:
- System-wide configuration
- User management across all organizations
- Database administration
- Security settings
- System monitoring and maintenance
- Backup and disaster recovery

## 🔐 Superadmin Responsibilities

### Core Responsibilities
- **System Security**: Ensure overall system security
- **Performance Monitoring**: Monitor system health
- **User Management**: Manage all users across organizations
- **Backup Management**: Ensure data integrity
- **System Updates**: Apply security patches and updates
- **Disaster Recovery**: Handle system failures

## 🚀 System Setup

### Initial System Configuration

1. **Access Superadmin Panel**
   ```
   URL: https://your-domain.com/superadmin
   Login with superadmin credentials
   ```

2. **Configure System Settings**
   ```bash
   # Access admin panel
   docker exec -it membership-app bash
   npm run superadmin:setup
   ```

3. **Set Up System Parameters**
   - System name and branding
   - Email service configuration
   - Payment gateway setup
   - Security policies

### User Management

#### Creating Superadmin Users
```bash
# Create new superadmin
docker exec -it membership-app npm run create-superadmin --email=admin@company.com --name="System Admin"
```

#### Managing All Users
```bash
# List all users across organizations
docker exec -it membership-app npm run users:list

# Suspend user
docker exec -it membership-app npm run users:suspend --user-id=uuid

# Reactivate user
docker exec -it membership-app npm run users:reactivate --user-id=uuid
```

## 📊 System Monitoring

### Health Checks
```bash
# System health
curl -f http://localhost:3000/health

# Database health
curl -f http://localhost:3001/health/db

# Service health
docker-compose ps
```

### Performance Monitoring
```bash
# View system metrics
docker stats membership-app

# Check logs
docker-compose logs -f

# Monitor database
docker exec -it membership-db psql -U postgres -c "SELECT * FROM pg_stat_activity;"
```

## 🔧 System Maintenance

### Daily Tasks
1. **Check System Health**
   ```bash
   ./scripts/health-check.sh
   ```

2. **Review Logs**
   ```bash
   ./scripts/review-logs.sh
   ```

3. **Monitor Performance**
   ```bash
   ./scripts/monitor-performance.sh
   ```

### Weekly Tasks
1. **Security Updates**
   ```bash
   ./scripts/security-update.sh
   ```

2. **Backup Verification**
   ```bash
   ./scripts/verify-backup.sh
   ```

3. **Performance Report**
   ```bash
   ./scripts/generate-report.sh
   ```

## 💾 Backup Management

### Automated Backups
```bash
# Daily backup
./scripts/backup.sh daily

# Weekly full backup
./scripts/backup.sh weekly

# Monthly archive
./scripts/backup.sh monthly
```

### Manual Backup
```bash
# Full system backup
./scripts/backup.sh full

# Database only
./scripts/backup.sh database

# Files only
./scripts/backup.sh files
```

### Restore from Backup
```bash
# List available backups
./scripts/restore.sh list

# Restore from specific backup
./scripts/restore.sh --backup-id=20240101_120000
```

## 🚨 Emergency Procedures

### System Failure Recovery
1. **Identify the issue**
   ```bash
   ./scripts/diagnose-issue.sh
   ```

2. **Initiate emergency mode**
   ```bash
   ./scripts/emergency-mode.sh
   ```

3. **Restore from backup if needed**
   ```bash
   ./scripts/emergency-restore.sh
   ```

### Security Incident Response
1. **Immediate lockdown**
   ```bash
   ./scripts/security-lockdown.sh
   ```

2. **Investigate**
   ```bash
   ./scripts/security-investigate.sh
   ```

3. **Recovery**
   ```bash
   ./scripts/security-recovery.sh
   ```

## 🔍 System Configuration

### Environment Variables
```bash
# Edit environment file
nano production-setup/docker/.env

# Required variables:
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-key
RESEND_API_KEY=your-resend-key
STRIPE_SECRET_KEY=your-stripe-key
DATABASE_URL=your-database-url
```

### System Limits
- **Max Users**: 10,000 per organization
- **Max Organizations**: 100 per system
- **Max Events**: 1,000 per organization
- **Storage**: 100GB per organization
- **API Rate Limit**: 1000 requests/hour per user

## 📈 System Analytics

### Dashboard Access
```
https://your-domain.com/superadmin/analytics
```

### Key Metrics
- **System Uptime**: 99.9% target
- **Response Time**: <200ms average
- **Error Rate**: <0.1%
- **User Growth**: Monthly tracking
- **Revenue**: System-wide tracking

## 🔧 Troubleshooting

### Common Superadmin Issues

#### Issue: Database Connection Lost
**Solution:**
```bash
# Check database status
docker-compose ps db

# Restart database
docker-compose restart db

# Verify connection
docker exec -it membership-db pg_isready
```

#### Issue: High Memory Usage
**Solution:**
```bash
# Check memory usage
docker stats

# Restart services
docker-compose restart

# Optimize database
docker exec -it membership-db psql -U postgres -c "VACUUM ANALYZE;"
```

#### Issue: Email Service Down
**Solution:**
```bash
# Check email service
curl -f https://api.resend.com/health

# Verify API key
echo $RESEND_API_KEY

# Restart email service
docker-compose restart api
```

## 📞 Support and Escalation

### Level 1: Self-Service
- Check troubleshooting guide
- Review system logs
- Use diagnostic tools

### Level 2: Technical Support
- Contact system administrator
- Review system documentation
- Use monitoring tools

### Level 3: Emergency Response
- Contact development team
- Escalate to on-call engineer
- Activate disaster recovery

## 📚 Additional Resources

- [System Architecture](docs/architecture.md)
- [Security Guide](docs/security.md)
- [Performance Tuning](docs/performance.md)
- [Disaster Recovery](docs/disaster-recovery.md)
- [API Documentation](docs/api.md)