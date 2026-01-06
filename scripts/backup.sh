#!/bin/bash

# Vidisto Backup Script
# Usage: ./scripts/backup.sh
# Add to crontab for automated backups: 0 2 * * * /path/to/vidsto1/scripts/backup.sh

set -e

# Configuration
BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d-%H%M%S)
RETENTION_DAYS=30

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting Vidisto backup...${NC}"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Backup database
if [ -f "data/vidsto.db" ]; then
    echo -e "${YELLOW}Backing up database...${NC}"
    cp "data/vidsto.db" "$BACKUP_DIR/vidsto-db-$DATE.db"
    echo -e "${GREEN}Database backed up to: $BACKUP_DIR/vidsto-db-$DATE.db${NC}"
else
    echo -e "${RED}Warning: Database file not found!${NC}"
fi

# Backup environment file (if exists)
if [ -f ".env" ]; then
    echo -e "${YELLOW}Backing up .env file...${NC}"
    cp ".env" "$BACKUP_DIR/env-$DATE.backup"
    echo -e "${GREEN}Environment file backed up${NC}"
fi

# Backup service account file (if exists)
if [ -f "vertex-sa.json" ]; then
    echo -e "${YELLOW}Backing up service account file...${NC}"
    cp "vertex-sa.json" "$BACKUP_DIR/vertex-sa-$DATE.json"
    echo -e "${GREEN}Service account file backed up${NC}"
fi

# Create full backup archive
echo -e "${YELLOW}Creating backup archive...${NC}"
tar -czf "$BACKUP_DIR/vidsto-full-$DATE.tar.gz" \
    data/vidsto.db \
    .env \
    vertex-sa.json \
    2>/dev/null || true

echo -e "${GREEN}Full backup archive created: $BACKUP_DIR/vidsto-full-$DATE.tar.gz${NC}"

# Clean up old backups
echo -e "${YELLOW}Cleaning up old backups (older than $RETENTION_DAYS days)...${NC}"
find "$BACKUP_DIR" -type f -name "*.db" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -type f -name "*.backup" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -type f -name "*.json" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -type f -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete

echo -e "${GREEN}Backup completed successfully!${NC}"

# Optional: Upload to cloud storage
# Uncomment and configure if you want automatic cloud backup
# echo -e "${YELLOW}Uploading to cloud storage...${NC}"
# aws s3 cp "$BACKUP_DIR/vidsto-full-$DATE.tar.gz" s3://your-bucket/backups/ || true
# echo -e "${GREEN}Cloud backup completed${NC}"



