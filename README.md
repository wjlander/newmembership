# Membership Management System - Rebuilt Edition

A comprehensive, single-organization membership management system built with modern technologies and enhanced features. This rebuilt version maintains all the functionality of the original multi-tenant system while simplifying deployment and adding 30+ new features.

## 🚀 Key Features

### Core Functionality (Preserved from Original)
- ✅ User registration and authentication
- ✅ Membership management and renewals
- ✅ Event creation and registration
- ✅ Digital membership cards (Google/Apple Wallet)
- ✅ Email campaigns and communications
- ✅ Committee management
- ✅ Document management
- ✅ Attendance tracking
- ✅ Admin dashboard and reporting
- ✅ Custom forms and surveys

### 30 New Enhanced Features

#### Phase 1: User Experience Enhancements
1. **Advanced Member Directory** - Searchable with filters and export
2. **Public Member Profiles** - Optional public visibility with privacy controls
3. **Event Calendar View** - Visual calendar with month/week/day views
4. **Member Tags System** - Flexible categorization and filtering
5. **Bulk Email Composer** - One-off emails to filtered groups
6. **Attendance Certificates** - PDF generation for event participants

#### Phase 2: Operational Efficiency
7. **QR Code Event Check-In** - Mobile-friendly scanner system
8. **Two-Factor Authentication** - TOTP-based security enhancement
9. **Advanced Analytics Dashboard** - Trends, retention, engagement metrics
10. **Member Communication History** - Complete interaction timeline
11. **Member Onboarding Workflow** - Guided checklist system
12. **Custom Branding** - Logo, colors, fonts customization

#### Phase 3: Community Building
13. **Member Referral Program** - Incentivized growth system
14. **Multi-Language Support** - i18n with RTL language support
15. **Advanced Document Management** - Version control and approval workflows
16. **Survey & Feedback System** - Custom survey builder and analytics
17. **Volunteer Management** - Shift scheduling and hour tracking
18. **Enhanced Digital Wallet** - Improved Google/Apple Wallet integration

#### Phase 4: Automation & Intelligence
19. **Automated Member Journeys** - Visual workflow builder
20. **Advanced Reporting BI** - Custom report builder with SQL interface
21. **Predictive Analytics** - Membership renewal predictions
22. **Smart Notifications** - Intelligent timing and personalization
23. **Integration Webhooks** - External system connectivity
24. **API Rate Limiting** - Enhanced security and performance

#### Phase 5: Mobile & Accessibility
25. **Progressive Web App** - Mobile-optimized with offline support
26. **Voice Navigation** - Accessibility enhancements
27. **Dark Mode** - Theme switching capability
28. **Mobile Push Notifications** - Browser-based notifications
29. **Geolocation Features** - Location-based event suggestions
30. **Social Media Integration** - Share events and achievements

## 🏗️ Architecture

### Technology Stack
- **Frontend**: Next.js 14 with App Router
- **Backend**: Node.js/Express API
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: JWT-based auth
- **File Storage**: Local filesystem with CDN support
- **Email**: Nodemailer with SMTP configuration
- **Styling**: Tailwind CSS + shadcn/ui components
- **Deployment**: Ubuntu/Debian with Nginx + PM2

### Key Improvements from Original
1. **Single Organization**: Removed multi-tenant complexity
2. **Local Storage**: Replaced Supabase Storage with filesystem
3. **JWT Auth**: Replaced Supabase Auth with custom implementation
4. **Simplified Deployment**: No external service dependencies
5. **Local Email**: Replaced Resend with SMTP configuration

## 🚀 Quick Start

### Prerequisites
- Ubuntu 20.04+ or Debian 11+
- Node.js 18+
- PostgreSQL 14+
- Nginx
- Redis (optional but recommended)

### One-Command Deployment
```bash
# Download and run the deployment script
wget https://raw.githubusercontent.com/yourusername/membership-system-rebuild/main/deploy.sh
chmod +x deploy.sh
sudo ./deploy.sh --domain yourdomain.com --port 3000
```

### Manual Installation
```bash
# 1. Clone the repository
git clone https://github.com/yourusername/membership-system-rebuild.git
cd membership-system-rebuild

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# 4. Set up the database
npm run db:migrate

# 5. Create admin user
npm run create-admin

# 6. Build the application
npm run build

# 7. Start the application
npm start
```

## 📚 Documentation

### Comprehensive Guides
- **[Superuser Guide](docs/SUPERUSER_GUIDE.md)** - Complete system administration
- **[Administrator Guide](docs/ADMINISTRATOR_GUIDE.md)** - Daily operations management
- **[User Guide](docs/USER_GUIDE.md)** - End-user functionality and features

### Technical Documentation
- **[System Architecture](SYSTEM_ARCHITECTURE.md)** - Technical specifications
- **[API Documentation](docs/API_DOCUMENTATION.md)** - API endpoints and usage
- **[Deployment Guide](docs/DEPLOYMENT_GUIDE.md)** - Detailed deployment instructions

## 🔧 Configuration

### Environment Variables
```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/membership_db

# JWT Secrets
JWT_SECRET=your-super-secret-jwt-key
REFRESH_SECRET=your-refresh-token-secret

# Email
SMTP_HOST=smtp.yourdomain.com
SMTP_PORT=587
SMTP_USER=your-email@domain.com
SMTP_PASS=your-password
SMTP_FROM="Your Organization <noreply@yourdomain.com>"

# Application
NODE_ENV=production
PORT=3000
DOMAIN=yourdomain.com
FRONTEND_URL=https://yourdomain.com

# Optional
REDIS_URL=redis://localhost:6379
ENCRYPTION_KEY=your-encryption-key
```

### Email Templates
The system includes customizable email templates for:
- Welcome emails
- Membership confirmations
- Event notifications
- Password resets
- Newsletter templates
- Survey invitations

## 🔒 Security Features

### Built-in Security
- JWT-based authentication with refresh tokens
- Rate limiting on all API endpoints
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CSRF token validation
- File upload security
- Audit logging for sensitive operations

### Two-Factor Authentication
- TOTP-based 2FA support
- SMS backup codes
- Recovery codes
- Optional enforcement by role

### Data Protection
- Database encryption at rest
- SSL/TLS for data in transit
- Password hashing with bcrypt
- GDPR compliance features
- Privacy controls for members

## 📊 Database Schema

### Core Tables
- `users` - User accounts and profiles
- `memberships` - Membership records
- `events` - Event information
- `event_registrations` - Event attendee records
- `email_campaigns` - Email marketing campaigns
- `documents` - File and document management
- `committees` - Committee organization
- `digital_cards` - Digital membership cards

### New Enhanced Tables
- `member_tags` - Flexible member categorization
- `member_referrals` - Referral program tracking
- `communication_log` - Complete interaction history
- `onboarding_tasks` - Guided member onboarding
- `surveys` and `survey_responses` - Feedback system
- `volunteer_opportunities` - Volunteer management
- `workflows` and `workflow_steps` - Automation system
- `analytics_events` - Enhanced tracking

## 🚀 Deployment

### System Requirements
- **OS**: Ubuntu 20.04+ or Debian 11+
- **RAM**: 2GB minimum, 4GB recommended
- **Storage**: 10GB minimum, 50GB recommended
- **CPU**: 2 cores minimum, 4 cores recommended

### Automated Deployment
The included `deploy.sh` script handles:
- System updates and dependency installation
- PostgreSQL and Redis setup
- Nginx configuration with SSL
- Firewall and security setup
- Application deployment
- Backup configuration
- Service management

### Manual Deployment Steps
1. **Server Setup**: Install dependencies and configure firewall
2. **Database Setup**: Install PostgreSQL and create database
3. **Application Setup**: Deploy code and configure environment
4. **Web Server Setup**: Configure Nginx with SSL
5. **Service Setup**: Configure PM2 and systemd services
6. **Backup Setup**: Configure automated backups

## 📈 Monitoring & Maintenance

### Health Monitoring
- Built-in health check endpoint (`/health`)
- Database connection monitoring
- Memory and CPU usage tracking
- Error rate monitoring
- Uptime tracking

### Backup Strategy
- Daily automated database backups
- File storage backups with incremental updates
- Configuration backups
- 30-day retention policy
- Automated backup verification

### Log Management
- Application logs in `/var/log/membership-system/`
- Structured logging with different levels
- Log rotation and archival
- Error tracking and alerting

## 🤝 Contributing

We welcome contributions to improve the system:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

### Development Setup
```bash
# Install development dependencies
npm install

# Run in development mode
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Documentation
- Comprehensive guides for all user types
- Video tutorials and walkthroughs
- API documentation for developers
- Troubleshooting guides

### Community Support
- GitHub Issues for bug reports
- Community forum for discussions
- Regular updates and improvements

### Professional Support
- Installation assistance available
- Customization services
- Training and onboarding
- Ongoing maintenance contracts

## 🔄 Updates & Maintenance

### Regular Updates
- Security patches and bug fixes
- Feature enhancements
- Performance improvements
- Dependency updates

### Version Management
- Semantic versioning
- Detailed changelog
- Migration guides for updates
- Rollback capabilities

---

**Built with ❤️ for organizations that value their members**

**Last Updated:** October 2025  
**Version:** 2.0.0  
**Status:** Production Ready