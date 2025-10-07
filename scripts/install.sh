#!/bin/bash

# Membership Management System - Production Installation Script
# This script installs Docker, Docker Compose, and sets up the entire system

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$PROJECT_DIR/install.log"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

# Function to check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        print_error "This script should not be run as root for security reasons"
        print_error "Please run as a regular user with sudo privileges"
        exit 1
    fi
}

# Function to check system requirements
check_requirements() {
    print_status "Checking system requirements..."
    
    # Check OS
    if [[ ! -f /etc/os-release ]]; then
        print_error "Cannot determine OS version"
        exit 1
    fi
    
    source /etc/os-release
    if [[ "$ID" != "ubuntu" && "$ID" != "debian" ]]; then
        print_warning "This script is designed for Ubuntu/Debian. Continuing anyway..."
    fi
    
    # Check minimum Ubuntu version (18.04) or Debian version (10)
    if [[ "$ID" == "ubuntu" && $(echo "$VERSION_ID < 18.04" | bc -l) -eq 1 ]]; then
        print_error "Ubuntu 18.04 or higher is required"
        exit 1
    fi
    
    if [[ "$ID" == "debian" && $(echo "$VERSION_ID < 10" | bc -l) -eq 1 ]]; then
        print_error "Debian 10 or higher is required"
        exit 1
    fi
    
    # Check available memory (minimum 2GB)
    MEMORY_GB=$(free -g | awk '/^Mem:/{print $2}')
    if [[ $MEMORY_GB -lt 2 ]]; then
        print_warning "Minimum 2GB RAM recommended. Current: ${MEMORY_GB}GB"
    fi
    
    # Check available disk space (minimum 10GB)
    DISK_GB=$(df -BG . | awk 'NR==2{print $4}' | sed 's/G//')
    if [[ $DISK_GB -lt 10 ]]; then
        print_warning "Minimum 10GB free disk space recommended. Current: ${DISK_GB}GB"
    fi
    
    print_success "System requirements check completed"
}

# Function to update system packages
update_system() {
    print_status "Updating system packages..."
    
    sudo apt-get update -y
    sudo apt-get upgrade -y
    
    print_success "System packages updated"
}

# Function to install essential packages
install_essentials() {
    print_status "Installing essential packages..."
    
    sudo apt-get install -y \
        curl \
        wget \
        git \
        nano \
        htop \
        unzip \
        apt-transport-https \
        ca-certificates \
        gnupg \
        lsb-release \
        bc
    
    print_success "Essential packages installed"
}

# Function to install Docker
install_docker() {
    print_status "Installing Docker..."
    
    # Remove old Docker versions
    sudo apt-get remove -y docker docker-engine docker.io containerd runc
    
    # Add Docker's official GPG key
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    
    # Add Docker repository
    echo \
        "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
        $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Update package index
    sudo apt-get update -y
    
    # Install Docker Engine
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    
    # Add current user to docker group
    sudo usermod -aG docker $USER
    
    # Enable Docker service
    sudo systemctl enable docker
    sudo systemctl start docker
    
    print_success "Docker installed successfully"
    print_warning "Please log out and log back in for group changes to take effect"
}

# Function to install Docker Compose
install_docker_compose() {
    print_status "Installing Docker Compose..."
    
    # Install Docker Compose v2
    DOCKER_COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep '"tag_name":' | sed -E 's/.*"v([^"]+)".*/\1/')
    sudo curl -L "https://github.com/docker/compose/releases/download/v${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    
    # Create symbolic link for docker-compose v2
    sudo ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose
    
    print_success "Docker Compose installed successfully"
}

# Function to create directory structure
create_directories() {
    print_status "Creating directory structure..."
    
    # Create necessary directories
    mkdir -p "$PROJECT_DIR/logs/{web,api,nginx,db}"
    mkdir -p "$PROJECT_DIR/backups/{daily,weekly,monthly}"
    mkdir -p "$PROJECT_DIR/monitoring"
    mkdir -p "$PROJECT_DIR/ssl"
    mkdir -p "$PROJECT_DIR/uploads"
    
    # Set proper permissions
    chmod 755 "$PROJECT_DIR/logs"
    chmod 755 "$PROJECT_DIR/backups"
    chmod 755 "$PROJECT_DIR/uploads"
    
    print_success "Directory structure created"
}

# Function to setup environment file
setup_environment() {
    print_status "Setting up environment configuration..."
    
    if [[ ! -f "$PROJECT_DIR/docker/.env" ]]; then
        cp "$PROJECT_DIR/docker/.env.example" "$PROJECT_DIR/docker/.env"
        print_warning "Environment file created. Please edit $PROJECT_DIR/docker/.env with your actual values"
        print_warning "Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, STRIPE_SECRET_KEY"
    else
        print_warning "Environment file already exists. Please review the settings."
    fi
}

# Function to create systemd service
create_systemd_service() {
    print_status "Creating systemd service..."
    
    sudo tee /etc/systemd/system/membership-app.service > /dev/null <<EOF
[Unit]
Description=Membership Management System
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$PROJECT_DIR/docker
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

    sudo systemctl daemon-reload
    sudo systemctl enable membership-app.service
    
    print_success "Systemd service created and enabled"
}

# Function to setup log rotation
setup_log_rotation() {
    print_status "Setting up log rotation..."
    
    sudo tee /etc/logrotate.d/membership-app > /dev/null <<EOF
$PROJECT_DIR/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 $USER $USER
    postrotate
        docker-compose -f $PROJECT_DIR/docker/docker-compose.yml restart web api > /dev/null 2>&1 || true
    endscript
}
EOF

    print_success "Log rotation configured"
}

# Function to setup firewall
setup_firewall() {
    print_status "Configuring firewall..."
    
    # Install UFW if not present
    sudo apt-get install -y ufw
    
    # Reset UFW to default
    sudo ufw --force reset
    
    # Set default policies
    sudo ufw default deny incoming
    sudo ufw default allow outgoing
    
    # Allow SSH
    sudo ufw allow ssh
    
    # Allow web traffic
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    
    # Allow application ports
    sudo ufw allow 3000/tcp
    sudo ufw allow 3001/tcp
    sudo ufw allow 3003/tcp
    
    # Allow monitoring ports
    sudo ufw allow 9090/tcp
    
    # Enable UFW
    sudo ufw --force enable
    
    print_success "Firewall configured"
}

# Function to create backup script
create_backup_script() {
    print_status "Creating backup script..."
    
    cat > "$PROJECT_DIR/scripts/backup.sh" <<'EOF'
#!/bin/bash

# Membership System Backup Script
# Usage: ./backup.sh [daily|weekly|monthly|full]

set -e

BACKUP_TYPE=${1:-daily}
BACKUP_DIR="/backups/$BACKUP_TYPE"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="/var/log/membership-backup.log"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Function to log messages
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Database backup
backup_database() {
    log "Starting database backup..."
    docker exec membership-db pg_dump -U postgres membership_db > "$BACKUP_DIR/db_backup_$TIMESTAMP.sql"
    log "Database backup completed"
}

# Application data backup
backup_app_data() {
    log "Starting application data backup..."
    # Backup uploaded files
    tar -czf "$BACKUP_DIR/uploads_$TIMESTAMP.tar.gz" -C /path/to/uploads .
    log "Application data backup completed"
}

# Configuration backup
backup_config() {
    log "Starting configuration backup..."
    tar -czf "$BACKUP_DIR/config_$TIMESTAMP.tar.gz" -C /path/to/config .
    log "Configuration backup completed"
}

# Cleanup old backups
cleanup_old_backups() {
    log "Cleaning up old backups..."
    find "$BACKUP_DIR" -name "*.sql" -mtime +30 -delete
    find "$BACKUP_DIR" -name "*.tar.gz" -mtime +30 -delete
    log "Old backups cleaned up"
}

# Main backup process
main() {
    log "Starting $BACKUP_TYPE backup..."
    
    case $BACKUP_TYPE in
        daily)
            backup_database
            ;;
        weekly)
            backup_database
            backup_app_data
            ;;
        monthly|full)
            backup_database
            backup_app_data
            backup_config
            ;;
        *)
            echo "Usage: $0 [daily|weekly|monthly|full]"
            exit 1
            ;;
    esac
    
    cleanup_old_backups
    log "Backup process completed successfully"
}

main "$@"
EOF

    chmod +x "$PROJECT_DIR/scripts/backup.sh"
    print_success "Backup script created"
}

# Function to create health check script
create_health_check_script() {
    print_status "Creating health check script..."
    
    cat > "$PROJECT_DIR/scripts/health-check.sh" <<'EOF'
#!/bin/bash

# Membership System Health Check Script

# Configuration
WEB_URL="http://localhost:3000"
API_URL="http://localhost:3001"
DB_CONTAINER="membership-db"
REDIS_CONTAINER="membership-redis"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Function to check service
check_service() {
    local name=$1
    local url=$2
    
    if curl -f -s "$url/health" > /dev/null; then
        echo -e "${GREEN}✓ $name is healthy${NC}"
        return 0
    else
        echo -e "${RED}✗ $name is down${NC}"
        return 1
    fi
}

# Function to check Docker container
check_container() {
    local container=$1
    
    if docker ps --filter "name=$container" --filter "status=running" | grep -q "$container"; then
        echo -e "${GREEN}✓ $container is running${NC}"
        return 0
    else
        echo -e "${RED}✗ $container is not running${NC}"
        return 1
    fi
}

# Function to check disk space
check_disk_space() {
    local threshold=80
    local usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    
    if [ "$usage" -lt "$threshold" ]; then
        echo -e "${GREEN}✓ Disk usage is ${usage}% (healthy)${NC}"
        return 0
    else
        echo -e "${RED}✗ Disk usage is ${usage}% (critical)${NC}"
        return 1
    fi
}

# Function to check memory usage
check_memory() {
    local threshold=90
    local usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
    
    if [ "$usage" -lt "$threshold" ]; then
        echo -e "${GREEN}✓ Memory usage is ${usage}% (healthy)${NC}"
        return 0
    else
        echo -e "${RED}✗ Memory usage is ${usage}% (critical)${NC}"
        return 1
    fi
}

# Main health check
main() {
    echo "Membership System Health Check"
    echo "=============================="
    
    local errors=0
    
    # Check containers
    echo -e "\n${YELLOW}Checking Docker containers:${NC}"
    check_container "$DB_CONTAINER" || ((errors++))
    check_container "$REDIS_CONTAINER" || ((errors++))
    
    # Check services
    echo -e "\n${YELLOW}Checking services:${NC}"
    check_service "Web Application" "$WEB_URL" || ((errors++))
    check_service "API" "$API_URL" || ((errors++))
    
    # Check system resources
    echo -e "\n${YELLOW}Checking system resources:${NC}"
    check_disk_space || ((errors++))
    check_memory || ((errors++))
    
    echo -e "\n=============================="
    
    if [ $errors -eq 0 ]; then
        echo -e "${GREEN}All systems are healthy!${NC}"
        exit 0
    else
        echo -e "${RED}System health check failed with $errors errors${NC}"
        exit 1
    fi
}

main "$@"
EOF

    chmod +x "$PROJECT_DIR/scripts/health-check.sh"
    print_success "Health check script created"
}

# Function to create restore script
create_restore_script() {
    print_status "Creating restore script..."
    
    cat > "$PROJECT_DIR/scripts/restore.sh" <<'EOF'
#!/bin/bash

# Membership System Restore Script
# Usage: ./restore.sh --backup-id=BACKUP_ID

set -e

# Parse arguments
BACKUP_ID=""
while [[ $# -gt 0 ]]; do
    case $1 in
        --backup-id=*)
            BACKUP_ID="${1#*=}"
            shift
            ;;
        *)
            echo "Unknown argument: $1"
            exit 1
            ;;
    esac
done

if [ -z "$BACKUP_ID" ]; then
    echo "Usage: $0 --backup-id=BACKUP_ID"
    echo "Available backups:"
    ls -la /backups/*/ | grep -E "\.sql$|\.tar\.gz$"
    exit 1
fi

# Restore database
restore_database() {
    echo "Restoring database from backup $BACKUP_ID..."
    docker exec -i membership-db psql -U postgres membership_db < "/backups/daily/db_backup_$BACKUP_ID.sql"
    echo "Database restored successfully"
}

# Restore application data
restore_app_data() {
    echo "Restoring application data from backup $BACKUP_ID..."
    tar -xzf "/backups/weekly/uploads_$BACKUP_ID.tar.gz" -C /path/to/uploads/
    echo "Application data restored successfully"
}

# Main restore process
main() {
    echo "Starting restore process for backup $BACKUP_ID..."
    
    # Stop services
    echo "Stopping services..."
    docker-compose stop web api
    
    # Restore data
    restore_database
    restore_app_data
    
    # Start services
    echo "Starting services..."
    docker-compose start web api
    
    echo "Restore process completed successfully"
}

main "$@"
EOF

    chmod +x "$PROJECT_DIR/scripts/restore.sh"
    print_success "Restore script created"
}

# Main installation function
main() {
    print_status "Starting Membership Management System installation..."
    
    # Create log file
    touch "$LOG_FILE"
    
    # Check if running as root
    check_root
    
    # Check system requirements
    check_requirements
    
    # Update system
    update_system
    
    # Install essential packages
    install_essentials
    
    # Install Docker
    install_docker
    
    # Install Docker Compose
    install_docker_compose
    
    # Create directory structure
    create_directories
    
    # Setup environment
    setup_environment
    
    # Create systemd service
    create_systemd_service
    
    # Setup log rotation
    setup_log_rotation
    
    # Setup firewall
    setup_firewall
    
    # Create backup script
    create_backup_script
    
    # Create health check script
    create_health_check_script
    
    # Create restore script
    create_restore_script
    
    print_success "Installation completed successfully!"
    print_status "Next steps:"
    print_status "1. Edit $PROJECT_DIR/docker/.env with your configuration"
    print_status "2. Run 'docker-compose up -d' to start the services"
    print_status "3. Run '$PROJECT_DIR/scripts/health-check.sh' to verify installation"
    print_status "4. Visit http://localhost:3000 to access the application"
    print_status ""
    print_warning "Remember to log out and log back in for Docker group changes to take effect"
}

# Run main function
main "$@"
EOF

chmod +x production-setup/scripts/install.sh