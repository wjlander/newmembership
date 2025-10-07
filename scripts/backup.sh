#!/bin/bash

# Membership Management System - Backup Script
# Usage: ./backup.sh [daily|weekly|monthly|full]

set -e

# Configuration
BACKUP_DIR="/opt/membership-system/backups"
RETENTION_DAYS=30
DATE=$(date +%Y%m%d_%H%M%S)
LOG_FILE="/var/log/membership-backup.log"

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

# Function to log messages
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function to backup database
backup_database() {
    local backup_type=$1
    local backup_path="$BACKUP_DIR/${backup_type}/database_${DATE}.sql"
    
    mkdir -p "$(dirname "$backup_path")"
    
    log "Starting database backup for $backup_type..."
    
    # Check if container is running
    if docker ps --filter "name=membership-db" --format "{{.Names}}" | grep -q "membership-db"; then
        docker exec membership-db pg_dump -U postgres membership_db > "$backup_path"
        gzip "$backup_path"
        log "Database backup completed: ${backup_path}.gz"
    else
        log "ERROR: Database container is not running"
        exit 1
    fi
}

# Function to backup uploaded files
backup_uploads() {
    local backup_type=$1
    local backup_path="$BACKUP_DIR/${backup_type}/uploads_${DATE}.tar.gz"
    
    mkdir -p "$(dirname "$backup_path")"
    
    log "Starting uploads backup for $backup_type..."
    
    # Backup uploaded files
    if [ -d "/opt/membership-system/uploads" ]; then
        tar -czf "$backup_path" -C /opt/membership-system uploads
        log "Uploads backup completed: $backup_path"
    else
        log "WARNING: Uploads directory not found, skipping"
    fi
}

# Function to backup configuration
backup_configuration() {
    local backup_type=$1
    local backup_path="$BACKUP_DIR/${backup_type}/config_${DATE}.tar.gz"
    
    mkdir -p "$(dirname "$backup_path")"
    
    log "Starting configuration backup for $backup_type..."
    
    # Backup configuration files
    tar -czf "$backup_path" \
        -C /opt/membership-system \
        docker/.env \
        docker/docker-compose.yml \
        nginx/nginx.conf
    
    log "Configuration backup completed: $backup_path"
}

# Function to backup logs
backup_logs() {
    local backup_type=$1
    local backup_path="$BACKUP_DIR/${backup_type}/logs_${DATE}.tar.gz"
    
    mkdir -p "$(dirname "$backup_path")"
    
    log "Starting logs backup for $backup_type..."
    
    # Backup logs (last 7 days)
    find /opt/membership-system/logs -name "*.log" -mtime -7 -exec tar -czf "$backup_path" {} +
    
    log "Logs backup completed: $backup_path"
}

# Function to create backup manifest
create_manifest() {
    local backup_type=$1
    
    cat > "$BACKUP_DIR/${backup_type}/manifest_${DATE}.txt" <<EOF
Membership System Backup Report
================================
Backup Type: $backup_type
Date: $(date)
Backup ID: ${DATE}
Files:
$(ls -la "$BACKUP_DIR/${backup_type}/" | grep -E "\.sql\.gz$|\.tar\.gz$")

Disk Usage:
$(du -sh "$BACKUP_DIR/${backup_type}/")

System Information:
OS: $(lsb_release -d | cut -f2-)
Kernel: $(uname -r)
Docker Version: $(docker --version)
Docker Compose Version: $(docker-compose --version)
EOF
    
    log "Backup manifest created: $BACKUP_DIR/${backup_type}/manifest_${DATE}.txt"
}

# Function to cleanup old backups
cleanup_old_backups() {
    local backup_type=$1
    
    log "Cleaning up old $backup_type backups..."
    
    # Remove backups older than retention period
    find "$BACKUP_DIR/${backup_type}" -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete
    find "$BACKUP_DIR/${backup_type}" -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete
    find "$BACKUP_DIR/${backup_type}" -name "manifest_*.txt" -mtime +$RETENTION_DAYS -delete
    
    log "Old $backup_type backups cleaned up"
}

# Function to upload to cloud storage (optional)
upload_to_cloud() {
    local backup_type=$1
    
    # AWS S3 upload (configure AWS CLI first)
    if command -v aws &> /dev/null && [ -n "$AWS_S3_BUCKET" ]; then
        log "Uploading $backup_type backup to AWS S3..."
        aws s3 sync "$BACKUP_DIR/${backup_type}/" "s3://$AWS_S3_BUCKET/$backup_type/" --delete
        log "Upload to S3 completed"
    fi
    
    # Google Cloud Storage upload (configure gcloud first)
    if command -v gsutil &> /dev/null && [ -n "$GCS_BUCKET" ]; then
        log "Uploading $backup_type backup to Google Cloud Storage..."
        gsutil -m rsync -r "$BACKUP_DIR/${backup_type}/" "gs://$GCS_BUCKET/$backup_type/"
        log "Upload to GCS completed"
    fi
}

# Main backup process
main() {
    local backup_type=${1:-daily}
    
    log "Starting $backup_type backup..."
    
    case $backup_type in
        daily)
            backup_database "daily"
            ;;
        weekly)
            backup_database "weekly"
            backup_uploads "weekly"
            backup_configuration "weekly"
            ;;
        monthly)
            backup_database "monthly"
            backup_uploads "monthly"
            backup_configuration "monthly"
            backup_logs "monthly"
            ;;
        full)
            backup_database "full"
            backup_uploads "full"
            backup_configuration "full"
            backup_logs "full"
            ;;
        *)
            echo "Usage: $0 [daily|weekly|monthly|full]"
            echo "Available backup types:"
            echo "  daily   - Database only"
            echo "  weekly  - Database, uploads, config"
            echo "  monthly - Full system backup"
            echo "  full    - Complete system backup"
            exit 1
            ;;
    esac
    
    create_manifest "$backup_type"
    cleanup_old_backups "$backup_type"
    upload_to_cloud "$backup_type"
    
    log "$backup_type backup completed successfully"
}

# Run backup
main "$@"
EOF

chmod +x production-setup/scripts/backup.sh