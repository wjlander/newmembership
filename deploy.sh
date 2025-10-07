#!/bin/bash

# Membership Management System Deployment Script
# For Ubuntu/Debian servers without Docker
# Version: 2.0 - Single Organization Edition

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="membership-system"
APP_USER="membership"
APP_DIR="/opt/$APP_NAME"
NGINX_CONFIG_DIR="/etc/nginx/sites-available"
SYSTEMD_DIR="/etc/systemd/system"
LOG_DIR="/var/log/$APP_NAME"
BACKUP_DIR="/opt/$APP_NAME-backups"

# Default values (can be overridden)
DOMAIN="${DOMAIN:-localhost}"
PORT="${PORT:-3000}"
NODE_VERSION="${NODE_VERSION:-18}"
POSTGRES_VERSION="${POSTGRES_VERSION:-14}"

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root"
        exit 1
    fi
}

check_os() {
    if [[ ! -f /etc/os-release ]]; then
        log_error "Cannot detect OS version"
        exit 1
    fi
    
    . /etc/os-release
    if [[ "$ID" != "ubuntu" && "$ID" != "debian" ]]; then
        log_error "This script is designed for Ubuntu/Debian only"
        exit 1
    fi
    
    log_info "Detected OS: $PRETTY_NAME"
}

update_system() {
    log_info "Updating system packages..."
    apt update && apt upgrade -y
    log_success "System updated"
}

install_dependencies() {
    log_info "Installing system dependencies..."
    
    # Basic dependencies
    apt install -y curl wget git build-essential software-properties-common
    
    # Node.js setup
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
    apt install -y nodejs
    
    # PostgreSQL
    if [[ "$ID" == "ubuntu" ]]; then
        sh -c 'echo "deb https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
        wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
    fi
    apt update
    apt install -y postgresql-${POSTGRES_VERSION} postgresql-client-${POSTGRES_VERSION}
    
    # Redis
    apt install -y redis-server
    
    # Nginx
    apt install -y nginx certbot python3-certbot-nginx
    
    # Other dependencies
    apt install -y pm2 imagemagick ufw fail2ban
    
    log_success "Dependencies installed"
}

create_user() {
    if ! id "$APP_USER" &>/dev/null; then
        log_info "Creating application user..."
        useradd -r -m -s /bin/bash $APP_USER
        log_success "User $APP_USER created"
    else
        log_warning "User $APP_USER already exists"
    fi
}

setup_directories() {
    log_info "Setting up application directories..."
    
    # Create application directory
    mkdir -p $APP_DIR
    mkdir -p $APP_DIR/{src,public,uploads,backups,logs}
    mkdir -p $LOG_DIR
    mkdir -p $BACKUP_DIR
    
    # Set permissions
    chown -R $APP_USER:$APP_USER $APP_DIR
    chown -R $APP_USER:$APP_USER $LOG_DIR
    chown -R $APP_USER:$APP_USER $BACKUP_DIR
    
    log_success "Directories created"
}

setup_postgresql() {
    log_info "Setting up PostgreSQL database..."
    
    # Start PostgreSQL service
    systemctl start postgresql
    systemctl enable postgresql
    
    # Create database and user
    sudo -u postgres psql << EOF
CREATE USER $APP_USER WITH PASSWORD '$APP_USER$(date +%s)';
CREATE DATABASE ${APP_NAME}_db OWNER $APP_USER;
GRANT ALL PRIVILEGES ON DATABASE ${APP_NAME}_db TO $APP_USER;
EOF
    
    log_success "PostgreSQL database created"
}

setup_redis() {
    log_info "Setting up Redis..."
    
    # Configure Redis
    sed -i 's/^# requirepass/requirepass/' /etc/redis/redis.conf
    sed -i "s/^requirepass .*/requirepass $(openssl rand -base64 32)/" /etc/redis/redis.conf
    
    # Start Redis
    systemctl start redis-server
    systemctl enable redis-server
    
    log_success "Redis configured"
}

setup_nginx() {
    log_info "Setting up Nginx..."
    
    # Create Nginx configuration
    cat > $NGINX_CONFIG_DIR/$APP_NAME << EOF
server {
    listen 80;
    server_name $DOMAIN;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    
    # Rate limiting
    limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone \$binary_remote_addr zone=auth:10m rate=5r/s;
    
    # File upload size
    client_max_body_size 10M;
    
    # Static files
    location /static/ {
        alias $APP_DIR/public/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Uploads
    location /uploads/ {
        alias $APP_DIR/uploads/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # API routes with rate limiting
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://localhost:$PORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Auth routes with stricter rate limiting
    location /api/auth/ {
        limit_req zone=auth burst=10 nodelay;
        proxy_pass http://localhost:$PORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # WebSocket support
    location /ws {
        proxy_pass http://localhost:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # All other routes
    location / {
        proxy_pass http://localhost:$PORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
    
    # Enable site
    ln -sf $NGINX_CONFIG_DIR/$APP_NAME /etc/nginx/sites-enabled/
    
    # Test configuration
    nginx -t
    
    log_success "Nginx configured"
}

setup_ssl() {
    if [[ "$DOMAIN" != "localhost" ]]; then
        log_info "Setting up SSL with Let's Encrypt..."
        
        # Obtain SSL certificate
        certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m admin@$DOMAIN
        
        # Set up auto-renewal
        systemctl enable certbot.timer
        
        log_success "SSL certificate obtained"
    else
        log_warning "Skipping SSL setup for localhost"
    fi
}

setup_firewall() {
    log_info "Configuring firewall..."
    
    # Reset UFW
    ufw --force reset
    
    # Default policies
    ufw default deny incoming
    ufw default allow outgoing
    
    # Allow SSH
    ufw allow ssh
    
    # Allow HTTP and HTTPS
    ufw allow 80/tcp
    ufw allow 443/tcp
    
    # Enable firewall
    ufw --force enable
    
    log_success "Firewall configured"
}

setup_fail2ban() {
    log_info "Setting up fail2ban..."
    
    # Configure fail2ban for SSH
    cat > /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 3

[nginx-noscript]
enabled = true
port = http,https
filter = nginx-noscript
logpath = /var/log/nginx/access.log
maxretry = 6
EOF
    
    systemctl start fail2ban
    systemctl enable fail2ban
    
    log_success "Fail2ban configured"
}

create_systemd_service() {
    log_info "Creating systemd service..."
    
    cat > $SYSTEMD_DIR/$APP_NAME.service << EOF
[Unit]
Description=Membership Management System
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=$APP_USER
WorkingDirectory=$APP_DIR
Environment=NODE_ENV=production
Environment=PORT=$PORT
Environment=DATABASE_URL=postgresql://$APP_USER:$APP_USER$(date +%s)@localhost:5432/${APP_NAME}_db
Environment=REDIS_URL=redis://localhost:6379
Environment=JWT_SECRET=$(openssl rand -base64 32)
Environment=ENCRYPTION_KEY=$(openssl rand -base64 32)
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
StandardOutput=append:$LOG_DIR/app.log
StandardError=append:$LOG_DIR/error.log

[Install]
WantedBy=multi-user.target
EOF
    
    systemctl daemon-reload
    systemctl enable $APP_NAME.service
    
    log_success "Systemd service created"
}

setup_backup_cron() {
    log_info "Setting up backup cron jobs..."
    
    # Create backup script
    cat > /opt/backup-$APP_NAME.sh << EOF
#!/bin/bash
DATE=\$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/\${DATE}_backup.sql"

# Database backup
sudo -u postgres pg_dump ${APP_NAME}_db > \$BACKUP_FILE

# File backup
tar -czf "$BACKUP_DIR/\${DATE}_uploads.tar.gz" -C $APP_DIR uploads/

# Keep only last 30 days of backups
find $BACKUP_DIR -name "*.sql" -mtime +30 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

# Log backup completion
echo "\$(date): Backup completed - \$BACKUP_FILE" >> $LOG_DIR/backup.log
EOF
    
    chmod +x /opt/backup-$APP_NAME.sh
    
    # Add to crontab
    echo "0 2 * * * /opt/backup-$APP_NAME.sh" | crontab -
    
    log_success "Backup cron jobs configured"
}

install_node_dependencies() {
    log_info "Installing Node.js dependencies..."
    
    # Copy application files (assumes they're in current directory)
    if [[ -f package.json ]]; then
        cp -r . $APP_DIR/
        cd $APP_DIR
        
        # Install dependencies
        npm install --production
        
        # Build application
        npm run build
        
        # Set permissions
        chown -R $APP_USER:$APP_USER $APP_DIR
    else
        log_warning "No package.json found. Please ensure application files are available."
    fi
    
    log_success "Node.js dependencies installed"
}

start_services() {
    log_info "Starting services..."
    
    # Start PostgreSQL and Redis
    systemctl start postgresql redis-server
    
    # Start application
    systemctl start $APP_NAME
    
    # Start Nginx
    systemctl start nginx
    
    # Wait for application to start
    sleep 10
    
    # Check if application is running
    if systemctl is-active --quiet $APP_NAME; then
        log_success "Application started successfully"
    else
        log_error "Application failed to start. Check logs: journalctl -u $APP_NAME"
        exit 1
    fi
}

show_status() {
    log_info "Deployment Status:"
    echo ""
    echo "┌─────────────────────────────────────────────────────────────┐"
    echo "│                    DEPLOYMENT SUMMARY                       │"
    echo "├─────────────────────────────────────────────────────────────┤"
    echo "│ Application: $APP_NAME                                        │"
    echo "│ Domain: $DOMAIN                                              │"
    echo "│ Port: $PORT                                                  │"
    echo "│ User: $APP_USER                                              │"
    echo "│ Directory: $APP_DIR                                          │"
    echo "│ Database: ${APP_NAME}_db                                      │"
    echo "├─────────────────────────────────────────────────────────────┤"
    echo "│ Status Commands:                                            │"
    echo "│   systemctl status $APP_NAME                                 │"
    echo "│   systemctl status nginx                                     │"
    echo "│   systemctl status postgresql                                │"
    echo "├─────────────────────────────────────────────────────────────┤"
    echo "│ Log Locations:                                              │"
    echo "│   Application: $LOG_DIR/app.log                              │"
    echo "│   Errors: $LOG_DIR/error.log                                 │"
    echo "│   Nginx: /var/log/nginx/                                     │"
    echo "├─────────────────────────────────────────────────────────────┤"
    echo "│ Next Steps:                                                 │"
    echo "│   1. Configure email settings in $APP_DIR/.env              │"
    echo "│   2. Run database migrations                                 │"
    echo "│   3. Create admin user                                       │"
    echo "│   4. Configure SSL certificate (if not done)                 │"
    echo "└─────────────────────────────────────────────────────────────┘"
    echo ""
}

# Main deployment function
main() {
    log_info "Starting Membership Management System deployment..."
    log_info "Domain: $DOMAIN"
    log_info "Port: $PORT"
    
    check_root
    check_os
    update_system
    install_dependencies
    create_user
    setup_directories
    setup_postgresql
    setup_redis
    setup_nginx
    setup_ssl
    setup_firewall
    setup_fail2ban
    create_systemd_service
    setup_backup_cron
    install_node_dependencies
    start_services
    show_status
    
    log_success "Deployment completed successfully!"
    log_info "Your membership management system is now running at: http://$DOMAIN"
}

# Handle command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --domain)
            DOMAIN="$2"
            shift 2
            ;;
        --port)
            PORT="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --domain DOMAIN    Domain name (default: localhost)"
            echo "  --port PORT        Application port (default: 3000)"
            echo "  --help             Show this help message"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Run main function
main