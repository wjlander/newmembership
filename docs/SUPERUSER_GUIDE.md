# Superuser Guide - Membership Management System

## Overview
This guide is for system administrators who manage the entire membership management platform. Superusers have full access to all system features, user management, and system configuration.

## Table of Contents
1. [Getting Started](#getting-started)
2. [System Configuration](#system-configuration)
3. [User Management](#user-management)
4. [Organization Settings](#organization-settings)
5. [System Maintenance](#system-maintenance)
6. [Backup & Recovery](#backup--recovery)
7. [Monitoring & Analytics](#monitoring--analytics)
8. [Security Management](#security-management)
9. [Troubleshooting](#troubleshooting)

## Getting Started

### Initial Setup
1. **Access the System**
   - Navigate to your domain (e.g., `https://yourdomain.com`)
   - Use the superuser credentials created during installation
   - Default superuser: `admin@yourdomain.com`

2. **Dashboard Overview**
   - **System Stats**: Total users, active memberships, recent activities
   - **Quick Actions**: Common administrative tasks
   - **Alerts**: System notifications and issues
   - **Analytics**: Key performance indicators

### Navigation
- **Dashboard**: System overview and key metrics
- **Users**: Manage all user accounts
- **Memberships**: Oversee membership programs
- **Settings**: Configure system-wide settings
- **Reports**: Generate system reports
- **Maintenance**: System health and updates

## System Configuration

### General Settings
Navigate to **Settings > General**

- **Organization Name**: Your organization's legal name
- **Contact Email**: Primary contact email
- **Timezone**: System-wide timezone setting
- **Language**: Default system language
- **Date Format**: Preferred date display format

### Email Configuration
Navigate to **Settings > Email**

```bash
# SMTP Configuration
SMTP_HOST=smtp.yourdomain.com
SMTP_PORT=587
SMTP_USER=your-email@domain.com
SMTP_PASS=your-password
SMTP_FROM="Your Organization <noreply@yourdomain.com>"
```

**Email Templates Available:**
- Welcome email
- Membership confirmation
- Event registration
- Password reset
- Newsletter templates

### Security Settings
Navigate to **Settings > Security**

- **Password Requirements**: Minimum length, complexity rules
- **Two-Factor Authentication**: Enable/disable system-wide
- **Session Timeout**: Auto-logout duration
- **IP Whitelisting**: Restrict admin access
- **Rate Limiting**: API request limits

### Payment Settings (if applicable)
Navigate to **Settings > Payment**

- **Currency**: Default currency for transactions
- **Payment Gateway**: Stripe, PayPal configuration
- **Tax Settings**: Tax rates and rules
- **Invoice Settings**: Invoice templates and numbering

## User Management

### Creating Users
1. Navigate to **Users > Create User**
2. Fill in required information:
   - Name (first and last)
   - Email address
   - Phone number (optional)
   - Role assignment
3. Set initial password or send invitation
4. Configure user permissions
5. Assign to groups/committees if applicable

**Bulk User Import:**
```csv
email,first_name,last_name,phone,role
user1@email.com,John,Doe,555-0123,member
user2@email.com,Jane,Smith,555-0124,admin
```

### Role Management
Available roles:
- **Superuser**: Full system access
- **Admin**: Administrative privileges
- **Member**: Standard member access
- **Guest**: Limited read-only access

**Custom Roles:**
1. Navigate to **Settings > Roles**
2. Click "Create Role"
3. Define role name and description
4. Select permissions from available options
5. Save role configuration

### User Status Management
- **Active**: Normal user access
- **Inactive**: Login disabled, data preserved
- **Suspended**: Temporary access restriction
- **Deleted**: Account removed (data anonymized)

### Permission Management
Permissions are granular and can be assigned per role:

**User Permissions:**
- `users.create` - Create new users
- `users.read` - View user profiles
- `users.update` - Edit user information
- `users.delete` - Remove user accounts

**Membership Permissions:**
- `memberships.create` - Create memberships
- `memberships.read` - View membership data
- `memberships.update` - Update membership status
- `memberships.delete` - Cancel memberships

**Event Permissions:**
- `events.create` - Create events
- `events.read` - View events
- `events.update` - Edit events
- `events.delete` - Cancel events

## Organization Settings

### Branding Configuration
Navigate to **Settings > Branding**

- **Logo**: Upload organization logo (PNG, JPG, max 2MB)
- **Colors**: Primary and secondary brand colors
- **Fonts**: Select from available font options
- **Favicon**: Upload favicon (ICO format)
- **Email Header/Footer**: Customize email appearance

### Membership Types
Navigate to **Memberships > Types**

**Creating Membership Types:**
1. Click "Create Membership Type"
2. Enter type name and description
3. Set pricing and duration
4. Define benefits and features
5. Configure renewal settings
6. Save membership type

**Example Membership Types:**
- **Individual**: Standard personal membership
- **Family**: Multiple family members
- **Student**: Discounted student rate
- **Senior**: Senior citizen discount
- **Corporate**: Business organization membership

### Custom Fields
Navigate to **Settings > Custom Fields**

Add custom fields to:
- User profiles
- Membership applications
- Event registrations
- Contact forms

**Field Types Available:**
- Text input
- Textarea
- Select dropdown
- Checkbox
- Radio buttons
- Date picker
- File upload

## System Maintenance

### Database Maintenance
**Regular Tasks:**
- Database optimization (monthly)
- Index rebuilding (quarterly)
- Data integrity checks (weekly)
- Backup verification (daily)

**Performance Monitoring:**
- Query performance analysis
- Slow query identification
- Index usage statistics
- Storage space monitoring

### File Management
**Upload Directory Structure:**
```
/opt/membership-system/
├── uploads/
│   ├── documents/
│   ├── images/
│   ├── avatars/
│   └── exports/
```

**Cleanup Tasks:**
- Remove temporary files (daily)
- Compress old logs (weekly)
- Archive inactive user files (monthly)
- Clean export directory (weekly)

### Cache Management
**Redis Cache:**
- Session storage
- Frequently accessed data
- Email queue
- Temporary file storage

**Cache Commands:**
```bash
# Clear all cache
redis-cli FLUSHALL

# Check cache stats
redis-cli INFO

# Remove specific keys
redis-cli DEL "key_name"
```

## Backup & Recovery

### Automated Backups
Backups run daily at 2:00 AM and include:

1. **Database Backup**
   - Full PostgreSQL dump
   - 30-day retention
   - Compressed storage

2. **File Backup**
   - Upload directory
   - Configuration files
   - Log files (last 7 days)

3. **System Backup**
   - Application code
   - Environment files
   - SSL certificates

### Manual Backup
```bash
# Create manual backup
sudo /opt/backup-membership-system.sh

# Backup specific components
pg_dump membership_db > manual_backup.sql
tar -czf uploads_backup.tar.gz /opt/membership-system/uploads/
```

### Recovery Procedures

**Database Recovery:**
```bash
# Restore from backup
sudo -u postgres psql membership_db < backup_file.sql

# Restore specific tables
pg_restore -d membership_db -t users backup_file.sql
```

**File Recovery:**
```bash
# Restore uploads
sudo tar -xzf uploads_backup.tar.gz -C /opt/membership-system/
```

**Full System Recovery:**
1. Restore database
2. Restore files
3. Restart services
4. Verify functionality

## Monitoring & Analytics

### System Health Dashboard
Navigate to **Dashboard > System Health**

**Key Metrics:**
- Server CPU usage
- Memory consumption
- Database performance
- Application response time
- Error rates
- Active user count

### User Analytics
Navigate to **Analytics > Users**

**Available Reports:**
- User registration trends
- Login activity
- Membership retention
- User engagement metrics
- Geographic distribution

### Email Analytics
Navigate to **Analytics > Communications**

**Email Metrics:**
- Send volume
- Open rates
- Click rates
- Bounce rates
- Unsubscribe rates

### Event Analytics
Navigate to **Analytics > Events**

**Event Reports:**
- Registration trends
- Attendance rates
- Popular events
- Revenue tracking
- Member participation

## Security Management

### Security Audit Log
Navigate to **Settings > Security > Audit Log**

**Logged Events:**
- User logins
- Password changes
- Role assignments
- System configuration changes
- Data exports
- Failed authentication attempts

### Security Settings
**Password Policy:**
- Minimum length: 8 characters
- Complexity requirements
- Password history
- Expiration period

**Session Management:**
- Session timeout: 30 minutes
- Concurrent session limits
- IP address tracking
- Device fingerprinting

### Data Protection
**Encryption:**
- Database encryption at rest
- SSL/TLS for data in transit
- Password hashing with bcrypt
- Sensitive data encryption

**Access Control:**
- Role-based permissions
- IP whitelisting for admins
- Two-factor authentication
- API rate limiting

## Troubleshooting

### Common Issues

**1. Users Cannot Login**
- Check user status (active/inactive)
- Verify password reset token
- Check email verification status
- Review authentication logs

**2. Emails Not Sending**
- Verify SMTP configuration
- Check email queue status
- Review email logs
- Test email connectivity

**3. Database Connection Issues**
- Check PostgreSQL service status
- Verify connection credentials
- Review connection pool settings
- Check database logs

**4. File Upload Problems**
- Verify upload directory permissions
- Check file size limits
- Review file type restrictions
- Check disk space availability

**5. Performance Issues**
- Monitor server resources
- Check database query performance
- Review application logs
- Analyze traffic patterns

### Log Files
**Application Logs:**
```
/var/log/membership-system/
├── app.log          # Application events
├── error.log        # Error messages
├── access.log       # HTTP access logs
├── email.log        # Email activity
└── audit.log        # Security events
```

**System Logs:**
```bash
# View application logs
sudo journalctl -u membership-system

# View Nginx logs
sudo tail -f /var/log/nginx/error.log

# View database logs
sudo tail -f /var/log/postgresql/postgresql-*.log
```

### Performance Optimization

**Database Optimization:**
```sql
-- Check slow queries
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Update table statistics
ANALYZE;

-- Rebuild indexes
REINDEX DATABASE membership_db;
```

**Application Optimization:**
- Enable caching for frequently accessed data
- Optimize image sizes and formats
- Implement database query caching
- Use CDN for static assets
- Enable gzip compression

### Support Contacts

**Technical Support:**
- Email: support@yourdomain.com
- Phone: +1-555-SUPPORT
- Hours: Monday-Friday, 9 AM - 5 PM EST

**Emergency Contact:**
- Phone: +1-555-EMERGENCY (24/7)
- Email: emergency@yourdomain.com

### Documentation Resources

**Additional Guides:**
- [Administrator Guide](ADMINISTRATOR_GUIDE.md)
- [User Guide](USER_GUIDE.md)
- [API Documentation](API_DOCUMENTATION.md)
- [Deployment Guide](DEPLOYMENT_GUIDE.md)

**External Resources:**
- System architecture documentation
- Database schema reference
- API endpoint reference
- Code repository and version control

---

**Last Updated:** October 2025  
**Version:** 2.0  
**Document ID:** MMS-SUPERUSER-GUIDE-2025