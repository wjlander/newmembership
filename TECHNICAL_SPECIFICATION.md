# Technical Specification - Membership Management System Rebuild

## System Overview

### Architecture Philosophy
The rebuilt membership management system adopts a **single-organization, simplified deployment** approach while maintaining enterprise-grade features and security. The system eliminates external dependencies (Supabase, Resend) in favor of self-hosted solutions, making it ideal for organizations that prefer complete control over their data and infrastructure.

### Key Architectural Decisions

1. **Single Organization Design**: Removed multi-tenant complexity to simplify deployment and management
2. **Local File Storage**: Replaced cloud storage with local filesystem for data sovereignty
3. **JWT Authentication**: Custom authentication system replacing external auth providers
4. **SMTP Email Integration**: Local email delivery replacing third-party email services
5. **Simplified Deployment**: One-command deployment script for Ubuntu/Debian servers
6. **Enhanced Security**: Built-in rate limiting, input validation, and audit logging

## Technology Stack

### Core Technologies
```
Frontend: Next.js 14 (React 18, App Router)
Backend: Node.js 18+ with Express.js
Database: PostgreSQL 14+ with Drizzle ORM
Authentication: JWT with refresh tokens
File Storage: Local filesystem with Sharp optimization
Email: Nodemailer with SMTP configuration
Caching: Redis (optional but recommended)
Styling: Tailwind CSS + Radix UI components
Deployment: PM2 + Nginx + SSL (Let's Encrypt)
```

### Development Tools
```
TypeScript: Full type safety
ESLint: Code linting and quality
Prettier: Code formatting
Drizzle Kit: Database migrations and schema management
Nodemon: Development server auto-restart
Concurrently: Run multiple processes
```

## Database Architecture

### Schema Design Principles
1. **Referential Integrity**: Comprehensive foreign key constraints
2. **Index Strategy**: Strategic indexing for performance optimization
3. **Data Normalization**: Proper normalization to 3NF where appropriate
4. **Audit Trail**: Change tracking for critical data
5. **Soft Deletes**: Data preservation with `isActive` flags
6. **Extensibility**: JSONB fields for flexible data storage

### Core Entity Relationships

```
Users (1) → (N) Memberships
Users (1) → (N) EventRegistrations
Users (1) → (N) UserRoles
Users (1) → (N) CommunicationLogs
Users (1) → (N) DigitalCards
Users (1) → (N) VolunteerAssignments
Users (1) → (N) SurveyResponses

Memberships (N) → (1) MembershipTypes
Events (1) → (N) EventRegistrations
Committees (1) → (N) CommitteePositions
CommitteePositions (1) → (N) CommitteeAssignments
Surveys (1) → (N) SurveyResponses
VolunteerOpportunities (1) → (N) VolunteerAssignments
```

### Database Performance Optimization

#### Indexing Strategy
```sql
-- High-frequency query optimization
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_referral_code ON users(referral_code);
CREATE INDEX idx_memberships_user_status ON memberships(user_id, status);
CREATE INDEX idx_events_start_date ON events(start_date);
CREATE INDEX idx_event_registrations_event_user ON event_registrations(event_id, user_id);

-- Composite indexes for complex queries
CREATE INDEX idx_communication_log_user_type ON communication_log(user_id, type);
CREATE INDEX idx_analytics_events_user_event ON analytics_events(user_id, event);
CREATE INDEX idx_workflow_executions_workflow_status ON workflow_executions(workflow_id, status);
```

#### Query Optimization
- **Pagination**: Cursor-based pagination for large datasets
- **Selective Queries**: Specific column selection instead of SELECT *
- **Join Optimization**: Strategic use of INNER vs LEFT joins
- **Subquery Minimization**: CTE usage for complex queries
- **Connection Pooling**: PostgreSQL connection pool management

## API Architecture

### RESTful Design Principles
1. **Resource-Based URLs**: `/api/users`, `/api/events`, `/api/memberships`
2. **HTTP Method Semantics**: Proper use of GET, POST, PUT, DELETE
3. **Status Code Usage**: Appropriate HTTP status codes
4. **Consistent Response Format**: Standardized JSON response structure
5. **Versioning**: API versioning through URL path
6. **Pagination**: Consistent pagination across list endpoints

### Authentication & Authorization

#### JWT Token Structure
```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "userId": 123,
    "email": "user@example.com",
    "roles": ["member", "volunteer"],
    "iat": 1640995200,
    "exp": 1640996100
  }
}
```

#### Permission System
```
Role-Based Access Control (RBAC) with granular permissions:
- users.create, users.read, users.update, users.delete
- memberships.create, memberships.read, memberships.update
- events.create, events.read, events.update, events.delete
- documents.read, documents.create, documents.update
- email.read, email.create, email.send
- analytics.read, reports.generate
- settings.read, settings.update
```

### Rate Limiting Strategy
```
Global API: 100 requests per 15 minutes per IP
Authentication: 5 requests per 15 minutes per IP
Password Reset: 3 requests per hour per email
Registration: 5 requests per hour per IP
File Upload: 10 requests per minute per user
```

## Security Architecture

### Multi-Layer Security Model

#### 1. Network Security
- **Firewall Configuration**: UFW with restrictive rules
- **SSL/TLS**: Let's Encrypt certificates with auto-renewal
- **HTTP Security Headers**: HSTS, CSP, X-Frame-Options, etc.
- **DDoS Protection**: Rate limiting and connection throttling
- **IP Whitelisting**: Admin panel access restrictions

#### 2. Application Security
- **Input Validation**: Comprehensive server-side validation
- **SQL Injection Prevention**: Parameterized queries with Drizzle ORM
- **XSS Protection**: Output encoding and CSP headers
- **CSRF Protection**: Token-based protection for state-changing operations
- **File Upload Security**: Type validation, size limits, malware scanning
- **Session Management**: Secure JWT implementation with refresh tokens

#### 3. Data Security
- **Encryption at Rest**: Database encryption for sensitive fields
- **Encryption in Transit**: TLS 1.3 for all communications
- **Password Security**: bcrypt with salt rounds of 12
- **API Security**: Rate limiting, authentication, authorization
- **Audit Logging**: Comprehensive security event logging

### Security Monitoring
```
Failed Login Attempts: Tracked and analyzed
Suspicious Activity: Automated detection and alerting
Data Access Logs: Complete audit trail
Permission Changes: Administrative action logging
System Events: Security-relevant system activities
```

## Performance Architecture

### Caching Strategy

#### Redis Caching Layers
```
L1: Session Storage (TTL: 7 days)
- User sessions
- Authentication tokens
- Temporary data

L2: Application Data (TTL: 1 hour)
- User profiles
- Membership data
- Event information
- Configuration settings

L3: Computed Data (TTL: 15 minutes)
- Analytics results
- Report data
- Dashboard metrics
- Search results
```

#### Application-Level Caching
- **Database Query Caching**: Frequently accessed queries
- **API Response Caching**: Static and semi-static endpoints
- **Template Caching**: Email templates and documents
- **Image Optimization**: On-the-fly image processing and caching

### Database Performance

#### Connection Pooling
```
Min Connections: 5
Max Connections: 20
Idle Timeout: 30 seconds
Connection Timeout: 2 seconds
Max Retries: 3
```

#### Query Optimization Techniques
- **Index Usage**: Strategic index creation and maintenance
- **Query Planning**: EXPLAIN ANALYZE for query optimization
- **Batch Operations**: Bulk insert/update operations
- **Read Replicas**: Scaling read operations (future enhancement)
- **Partitioning**: Large table partitioning strategy

### Frontend Performance

#### Next.js Optimizations
- **Static Generation**: Pre-rendering of static pages
- **Incremental Static Regeneration**: Dynamic content updates
- **Image Optimization**: Automatic WebP conversion and responsive images
- **Code Splitting**: Automatic bundle splitting
- **Tree Shaking**: Dead code elimination

#### Asset Optimization
- **CDN Integration**: Static asset delivery optimization
- **Compression**: Gzip/Brotli compression for all assets
- **Minification**: CSS and JavaScript minification
- **Font Optimization**: Web font loading optimization

## Scalability Architecture

### Horizontal Scaling Readiness
```
Stateless Application Design:
- No server-side session storage
- JWT-based authentication
- External cache storage (Redis)
- File storage abstraction
- Database connection pooling

Microservices-Ready:
- Modular API structure
- Service separation boundaries
- Event-driven architecture support
- Message queue integration points
- API gateway compatibility
```

### Database Scaling Strategy
```
Phase 1: Single Instance (Current)
- PostgreSQL on application server
- Read replica for reporting
- Connection pooling optimization

Phase 2: Read Scaling (Future)
- Multiple read replicas
- Query routing based on type
- Connection pooling service

Phase 3: Write Scaling (Future)
- Database sharding by organization
- Distributed transaction management
- Global replication
```

### Load Balancing Architecture
```
Layer 1: DNS Load Balancing
- Multiple A records
- Health check-based failover
- Geographic distribution

Layer 2: Application Load Balancing
- Nginx upstream configuration
- Session affinity (if required)
- Health check endpoints
- SSL termination

Layer 3: Database Load Balancing
- Read replica distribution
- Connection pooling
- Query routing optimization
```

## Deployment Architecture

### Infrastructure as Code
```bash
# Automated deployment script handles:
- System dependency installation
- Database setup and configuration
- Application deployment
- Web server configuration
- SSL certificate management
- Security hardening
- Backup configuration
- Monitoring setup
```

### Environment Management
```
Development:
- Local development environment
- Docker Compose support
- Hot reloading enabled
- Debug mode active

Staging:
- Production-like environment
- Test data population
- Performance testing
- Integration testing

Production:
- High availability setup
- Automated backups
- Monitoring and alerting
- Security hardening
```

### Backup and Recovery
```
Backup Strategy:
- Database: Daily full backups with 30-day retention
- Files: Incremental backups with versioning
- Configuration: Version-controlled configuration
- SSL Certificates: Automated renewal and backup

Recovery Procedures:
- Database point-in-time recovery
- File system restoration
- Application rollback capabilities
- Disaster recovery procedures
```

## Monitoring and Observability

### Application Monitoring
```
Metrics Collection:
- Request/response times
- Error rates and types
- User activity patterns
- Resource utilization
- Business metrics

Health Checks:
- Database connectivity
- Cache availability
- File system access
- External service dependencies
- SSL certificate validity
```

### Infrastructure Monitoring
```
System Metrics:
- CPU utilization
- Memory usage
- Disk space and I/O
- Network traffic
- Process monitoring

Service Monitoring:
- Nginx status
- PostgreSQL performance
- Redis availability
- Application uptime
- Backup success rates
```

### Logging Architecture
```
Log Levels:
ERROR: System errors and exceptions
WARN: Warning conditions and deprecations
INFO: General system information
DEBUG: Detailed debugging information

Log Aggregation:
Structured JSON logging
Centralized log collection
Log rotation and archival
Search and analysis capabilities
```

## Development Architecture

### Code Organization
```
src/
├── app/                    # Next.js App Router pages
├── components/             # Reusable React components
├── lib/                    # Utility libraries
│   ├── db/                # Database schema and connection
│   ├── auth/              # Authentication utilities
│   ├── utils/             # General utilities
│   └── hooks/             # Custom React hooks
├── server/                 # Backend API
│   ├── routes/            # API route handlers
│   ├── middleware/        # Express middleware
│   ├── services/          # Business logic services
│   └── utils/             # Server utilities
├── public/                 # Static assets
└── scripts/               # Utility scripts
```

### Development Workflow
```
1. Feature Development:
   - Branch from main
   - Implement feature with tests
   - Code review and testing
   - Merge to main

2. Release Process:
   - Version bumping
   - Changelog generation
   - Deployment to staging
   - Production deployment
   - Post-deployment verification
```

### Testing Strategy
```
Unit Tests:
- Component testing
- API endpoint testing
- Database function testing
- Utility function testing

Integration Tests:
- End-to-end user flows
- API integration testing
- Email delivery testing
- File upload testing

Performance Tests:
- Load testing
- Stress testing
- Database performance
- API response times
```

## Future Enhancement Roadmap

### Phase 1: Performance Optimization (Q1 2026)
- Database read replicas
- Advanced caching strategies
- CDN integration
- Query optimization tools

### Phase 2: Advanced Features (Q2 2026)
- Machine learning integration
- Advanced analytics dashboard
- Predictive modeling
- Automated workflow enhancements

### Phase 3: Enterprise Features (Q3 2026)
- Multi-organization support (optional)
- Advanced API integrations
- White-label capabilities
- Enterprise reporting

### Phase 4: Mobile & IoT (Q4 2026)
- Native mobile applications
- IoT device integration
- Advanced geolocation features
- Wearable device support

---

**Document Version:** 2.0.0  
**Last Updated:** October 2025  
**Status:** Production Ready  
**Next Review:** January 2026