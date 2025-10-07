# Production Installation Guide - Membership Management System

## 🎯 Overview

This guide provides step-by-step instructions for installing and configuring the membership management system on an Ubuntu or Debian server using Docker and Docker Compose.

## 📋 Prerequisites

### System Requirements
- **Operating System**: Ubuntu 20.04+ or Debian 10+
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 50GB minimum, 100GB recommended
- **Network**: Internet connection for initial setup
- **Domain**: Public domain name (optional but recommended)

### Knowledge Requirements
- Basic Linux command line knowledge
- Understanding of Docker containers
- Familiarity with web server concepts
- Basic networking knowledge

## 🚀 Quick Installation (Automated)

### Step 1: Download and Run Installation Script

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install curl if not present
sudo apt install curl -y

# Download and run installation script
curl -fsSL https://raw.githubusercontent.com/wjlander/newmembership/main/production-setup/scripts/install.sh | sudo bash

# Follow the interactive prompts
```

### Step 2: Configure Environment Variables

```bash
# Navigate to project directory
cd /opt/membership-system

# Copy environment template
cp docker/.env.example docker/.env

# Edit environment variables
nano docker/.env
```

### Step 3: Start the System

```bash
# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

## 🔧 Manual Installation (Detailed)

### Step 1: System Preparation

#### Update System Packages
```bash
sudo apt update && sudo apt upgrade -y
```

#### Install Required Packages
```bash
sudo apt install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    git \
    unzip \
    htop \
    fail2ban \
    ufw
```

#### Configure Firewall
```bash
# Enable UFW firewall
sudo ufw enable

# Allow SSH
sudo ufw allow ssh

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow Docker
sudo ufw allow 2376/tcp
sudo ufw allow 2377/tcp
sudo ufw allow 7946/tcp
sudo ufw allow 7946/udp
sudo ufw allow 4789/udp

# Check status
sudo ufw status verbose
```

### Step 2: Install Docker

#### Remove Old Docker Versions
```bash
sudo apt remove docker docker-engine docker.io containerd runc
```

#### Add Docker Repository
```bash
# Add Docker's official GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Add Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```

#### Install Docker Engine
```bash
# Update package index
sudo apt update

# Install Docker Engine
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Add user to docker group
sudo usermod -aG docker $USER

# Verify installation
docker --version
docker run hello-world
```

### Step 3: Install Docker Compose

#### Download Docker Compose
```bash
# Download latest version
DOCKER_COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d'"' -f4)

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# Make executable
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker-compose --version
```

### Step 4: System Configuration

#### Create System User
```bash
# Create membership system user
sudo useradd -m -s /bin/bash membership

# Add to docker group
sudo usermod -aG docker membership

# Create directories
sudo mkdir -p /opt/membership-system/{data,logs,backups,config}

# Set permissions
sudo chown -R membership:membership /opt/membership-system
sudo chmod 755 /opt/membership-system
```

#### Configure System Limits
```bash
# Edit system limits
sudo nano /etc/security/limits.conf

# Add these lines:
membership soft nofile 65536
membership hard nofile 65536
membership soft nproc 32768
membership hard nproc 32768

# Edit system control
sudo nano /etc/sysctl.conf

# Add these lines:
vm.max_map_count=262144
fs.file-max=65536
```

### Step 5: Application Setup

#### Clone Repository
```bash
# Switch to membership user
sudo su - membership

# Clone repository
git clone https://github.com/wjlander/newmembership.git /opt/membership-system/source

# Navigate to production setup
cd /opt/membership-system/source/production-setup
```

#### Configure Environment
```bash
# Copy environment template
cp docker/.env.example docker/.env

# Edit environment variables
nano docker/.env
```

#### Environment Variables Configuration
```bash
# Required Environment Variables
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
RESEND_API_KEY=re_your-resend-api-key
STRIPE_SECRET_KEY=sk_your-stripe-secret-key
DATABASE_URL=postgresql://user:password@db:5432/membership

# Application Settings
NODE_ENV=production
PORT=3000
API_PORT=3001
JWT_SECRET=your-jwt-secret-key

# Security Settings
BCRYPT_ROUNDS=12
SESSION_SECRET=your-session-secret
CORS_ORIGIN=https://yourdomain.com

# Email Settings
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=Your Organization
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASS=your-resend-api-key

# Database Settings
DB_HOST=db
DB_PORT=5432
DB_NAME=membership
DB_USER=membership
DB_PASSWORD=your-secure-db-password

# Redis Settings (if using Redis)
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# Monitoring Settings
SENTRY_DSN=your-sentry-dsn
LOG_LEVEL=info
```

### Step 6: Docker Compose Configuration

#### Create Docker Compose File
```bash
# Create docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  # PostgreSQL Database
  db:
    image: postgres:15-alpine
    container_name: membership-db
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_INITDB_ARGS: "--auth-host=scram-sha-256"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    ports:
      - "5432:5432"
    networks:
      - membership-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER} -d ${DB_NAME}"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Redis Cache (Optional)
  redis:
    image: redis:7-alpine
    container_name: membership-redis
    restart: unless-stopped
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    networks:
      - membership-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

  # API Server
  api:
    build:
      context: ../membership-app-v2/apps/api
      dockerfile: Dockerfile
    container_name: membership-api
    restart: unless-stopped
    environment:
      NODE_ENV: ${NODE_ENV}
      PORT: ${API_PORT}
      DATABASE_URL: ${DATABASE_URL}
      SUPABASE_URL: ${SUPABASE_URL}
      SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY}
      RESEND_API_KEY: ${RESEND_API_KEY}
      STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY}
      JWT_SECRET: ${JWT_SECRET}
      CORS_ORIGIN: ${CORS_ORIGIN}
      EMAIL_FROM: ${EMAIL_FROM}
      EMAIL_FROM_NAME: ${EMAIL_FROM_NAME}
    ports:
      - "3001:3001"
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./logs/api:/app/logs
    networks:
      - membership-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Web Application
  web:
    build:
      context: ../membership-app-v2/apps/web
      dockerfile: Dockerfile
    container_name: membership-web
    restart: unless-stopped
    environment:
      NODE_ENV: ${NODE_ENV}
      PORT: ${PORT}
      NEXT_PUBLIC_API_URL: http://api:3001
      NEXT_PUBLIC_SUPABASE_URL: ${SUPABASE_URL}
      NEXT_PUBLIC_SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY}
    ports:
      - "3000:3000"
    depends_on:
      api:
        condition: service_healthy
    volumes:
      - ./logs/web:/app/logs
    networks:
      - membership-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Nginx Reverse Proxy
  nginx:
    image: nginx:alpine
    container_name: membership-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - ./logs/nginx:/var/log/nginx
    depends_on:
      - web
      - api
    networks:
      - membership-network

volumes:
  postgres_data:
  redis_data:

networks:
  membership-network:
    driver: bridge
EOF
```

### Step 7: SSL Certificate Setup

#### Generate SSL Certificate
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Generate SSL certificate
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Create SSL directory
mkdir -p nginx/ssl

# Copy certificates
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/

# Set proper permissions
sudo chown membership:membership nginx/ssl/*
sudo chmod 600 nginx/ssl/*
```

#### Create Nginx Configuration
```bash
mkdir -p nginx

# Create nginx.conf
cat > nginx/nginx.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    upstream web {
        server web:3000;
    }

    upstream api {
        server api:3001;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=web:10m rate=30r/s;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Main website
    server {
        listen 80;
        server_name yourdomain.com www.yourdomain.com;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name yourdomain.com www.yourdomain.com;

        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;

        # Security
        limit_req zone=web burst=50 nodelay;

        # Proxy to web application
        location / {
            proxy_pass http://web;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # API endpoints
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://api;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Health check
        location /health {
            access_log off;
            proxy_pass http://web/health;
        }
    }
}
EOF
```

### Step 8: Start the System

#### Start Services
```bash
# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f

# Check health
curl -f http://localhost:3000/health
curl -f http://localhost:3001/health
```

## 🔄 Automated Backup Setup

### Create Backup Script
```bash
cat > scripts/backup.sh << 'EOF'
#!/bin/bash

# Configuration
BACKUP_DIR="/opt/membership-system/backups"
RETENTION_DAYS=30
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Database backup
echo "Backing up database..."
docker exec membership-db pg_dump -U ${DB_USER} ${DB_NAME} > $BACKUP_DIR/database_$DATE.sql

# Files backup
echo "Backing up files..."
tar -czf $BACKUP_DIR/files_$DATE.tar.gz -C /opt/membership-system/data .

# Configuration backup
echo "Backing up configuration..."
tar -czf $BACKUP_DIR/config_$DATE.tar.gz -C /opt/membership-system/config .

# Create backup manifest
echo "Creating backup manifest..."
cat > $BACKUP_DIR/manifest_$DATE.txt << EOL
Backup Date: $(date)
Database Size: $(du -h $BACKUP_DIR/database_$DATE.sql | cut -f1)
Files Size: $(du -h $BACKUP_DIR/files_$DATE.tar.gz | cut -f1)
Config Size: $(du -h $BACKUP_DIR/config_$DATE.tar.gz | cut -f1)
Total Size: $(du -h $BACKUP_DIR | tail -1 | cut -f1)
EOL

# Clean old backups
echo "Cleaning old backups..."
find $BACKUP_DIR -name "*.sql" -mtime +$RETENTION_DAYS -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete
find $BACKUP_DIR -name "*.txt" -mtime +$RETENTION_DAYS -delete

echo "Backup completed successfully!"
EOF

chmod +x scripts/backup.sh
```

### Schedule Automated Backups
```bash
# Edit crontab
sudo crontab -e

# Add backup schedule (daily at 2 AM)
0 2 * * * /opt/membership-system/source/production-setup/scripts/backup.sh >> /var/log/membership-backup.log 2>&1

# Add weekly full backup (Sundays at 3 AM)
0 3 * * 0 /opt/membership-system/source/production-setup/scripts/backup.sh full >> /var/log/membership-backup.log 2>&1
```

## 📊 Monitoring Setup

### System Monitoring Script
```bash
cat > scripts/monitor.sh << 'EOF'
#!/bin/bash

# System monitoring script
LOG_FILE="/var/log/membership-monitor.log"
ALERT_EMAIL="admin@yourdomain.com"

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a $LOG_FILE
}

# Check disk space
check_disk_space() {
    DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ $DISK_USAGE -gt 80 ]; then
        log "WARNING: Disk usage is ${DISK_USAGE}%"
        echo "High disk usage: ${DISK_USAGE}%" | mail -s "Membership System Alert" $ALERT_EMAIL
    fi
}

# Check memory usage
check_memory_usage() {
    MEMORY_USAGE=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100}')
    if [ $MEMORY_USAGE -gt 85 ]; then
        log "WARNING: Memory usage is ${MEMORY_USAGE}%"
        echo "High memory usage: ${MEMORY_USAGE}%" | mail -s "Membership System Alert" $ALERT_EMAIL
    fi
}

# Check Docker containers
check_docker_containers() {
    FAILED_CONTAINERS=$(docker ps --filter "status=exited" --format "{{.Names}}" | wc -l)
    if [ $FAILED_CONTAINERS -gt 0 ]; then
        log "ERROR: $FAILED_CONTAINERS containers are not running"
        docker ps --filter "status=exited" --format "{{.Names}}" | mail -s "Membership System Alert" $ALERT_EMAIL
    fi
}

# Check API health
check_api_health() {
    if ! curl -f http://localhost:3001/health > /dev/null 2>&1; then
        log "ERROR: API health check failed"
        echo "API is not responding" | mail -s "Membership System Alert" $ALERT_EMAIL
    fi
}

# Check web health
check_web_health() {
    if ! curl -f http://localhost:3000/health > /dev/null 2>&1; then
        log "ERROR: Web health check failed"
        echo "Web application is not responding" | mail -s "Membership System Alert" $ALERT_EMAIL
    fi
}

# Run all checks
log "Starting system health check..."
check_disk_space
check_memory_usage
check_docker_containers
check_api_health
check_web_health
log "Health check completed"
EOF

chmod +x scripts/monitor.sh
```

### Schedule Monitoring
```bash
# Add monitoring schedule (every 5 minutes)
*/5 * * * * /opt/membership-system/source/production-setup/scripts/monitor.sh
```

## 🔧 Maintenance Scripts

### Health Check Script
```bash
cat > scripts/health-check.sh << 'EOF'
#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔍 Membership System Health Check"
echo "=================================="

# Check Docker service
if systemctl is-active --quiet docker; then
    echo -e "${GREEN}✓ Docker service is running${NC}"
else
    echo -e "${RED}✗ Docker service is not running${NC}"
fi

# Check containers
echo -e "\n📦 Container Status:"
docker-compose ps

# Check disk space
echo -e "\n💾 Disk Space:"
df -h / | awk 'NR==2 {printf "Used: %s (%s)\n", $3, $5}'

# Check memory usage
echo -e "\n🧠 Memory Usage:"
free -h | awk 'NR==2{printf "Used: %s (%s)\n", $3, $3/$2*100"%"}'

# Check API health
echo -e "\n🌐 API Health:"
if curl -f http://localhost:3001/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ API is healthy${NC}"
else
    echo -e "${RED}✗ API is not responding${NC}"
fi

# Check web health
echo -e "\n🌐 Web Health:"
if curl -f http://localhost:3000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Web application is healthy${NC}"
else
    echo -e "${RED}✗ Web application is not responding${NC}"
fi

# Check SSL certificate expiry
echo -e "\n🔒 SSL Certificate:"
if [ -f /etc/letsencrypt/live/yourdomain.com/fullchain.pem ]; then
    expiry=$(openssl x509 -enddate -noout -in /etc/letsencrypt/live/yourdomain.com/fullchain.pem | cut -d= -f2)
    expiry_date=$(date -d "$expiry" +%s)
    current_date=$(date +%s)
    days_left=$(( (expiry_date - current_date) / 86400 ))
    
    if [ $days_left -gt 30 ]; then
        echo -e "${GREEN}✓ SSL certificate expires in $days_left days${NC}"
    elif [ $days_left -gt 7 ]; then
        echo -e "${YELLOW}⚠ SSL certificate expires in $days_left days${NC}"
    else
        echo -e "${RED}✗ SSL certificate expires in $days_left days${NC}"
    fi
fi

echo -e "\n✅ Health check completed!"
EOF

chmod +x scripts/health-check.sh
```

## 🔄 Update Process

### System Update Script
```bash
cat > scripts/update.sh << 'EOF'
#!/bin/bash

echo "🔄 Starting system update..."
cd /opt/membership-system/source/production-setup

# Pull latest changes
git pull origin main

# Update Docker images
docker-compose pull

# Restart services
docker-compose down
docker-compose up -d

# Verify update
sleep 30
./scripts/health-check.sh

echo "✅ System update completed!"
EOF

chmod +x scripts/update.sh
```

## 📋 Post-Installation Checklist

### ✅ Immediate Checks
- [ ] All services are running (`docker-compose ps`)
- [ ] Health endpoints respond (`curl -f http://localhost:3000/health`)
- [ ] SSL certificate is valid
- [ ] Database is accessible
- [ ] Email service is configured
- [ ] Payment processing works

### ✅ Security Checks
- [ ] Firewall is configured
- [ ] SSL is enabled
- [ ] Strong passwords are set
- [ ] API rate limiting is active
- [ ] Security headers are configured
- [ ] Fail2ban is installed

### ✅ Backup Configuration
- [ ] Automated backups are scheduled
- [ ] Backup retention is configured
- [ ] Restore process is tested
- [ ] Backup integrity is verified

### ✅ Monitoring Setup
- [ ] Health checks are scheduled
- [ ] Alert notifications are configured
- [ ] Log rotation is set up
- [ ] Performance monitoring is active

## 🎯 Next Steps

1. **Configure DNS**: Point your domain to the server IP
2. **Set up monitoring**: Configure alerts and notifications
3. **Create admin users**: Set up initial administrator accounts
4. **Test functionality**: Verify all features work correctly
5. **Train users**: Provide user guides to administrators
6. **Schedule maintenance**: Set up regular maintenance windows

## 📞 Support

For installation support:
1. Check the [troubleshooting guide](guides/troubleshooting.md)
2. Review system logs: `docker-compose logs`
3. Run health check: `./scripts/health-check.sh`
4. Contact support if needed