#!/bin/bash

# Backup Script
# Creates a backup of MongoDB database and uploads directory

set -e

BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="backup_${TIMESTAMP}"

# MongoDB connection details
MONGO_HOST="${MONGO_HOST:-localhost}"
MONGO_PORT="${MONGO_PORT:-27017}"
MONGO_DB="${MONGO_DB:-ecommerce}"

# Create backup directory
mkdir -p "${BACKUP_DIR}/${BACKUP_NAME}"

echo "Starting backup at $(date)"

# Backup MongoDB
echo "Backing up MongoDB..."
mongodump \
  --host="${MONGO_HOST}:${MONGO_PORT}" \
  --db="${MONGO_DB}" \
  --out="${BACKUP_DIR}/${BACKUP_NAME}/mongodb"

# Backup uploads directory
if [ -d "./uploads" ]; then
  echo "Backing up uploads directory..."
  tar -czf "${BACKUP_DIR}/${BACKUP_NAME}/uploads.tar.gz" ./uploads
fi

# Create backup manifest
cat > "${BACKUP_DIR}/${BACKUP_NAME}/manifest.json" <<EOF
{
  "timestamp": "${TIMESTAMP}",
  "date": "$(date -Iseconds)",
  "mongodb": {
    "host": "${MONGO_HOST}",
    "port": "${MONGO_PORT}",
    "database": "${MONGO_DB}"
  },
  "files": [
    "mongodb",
    "uploads.tar.gz"
  ]
}
EOF

# Compress backup
echo "Compressing backup..."
cd "${BACKUP_DIR}"
tar -czf "${BACKUP_NAME}.tar.gz" "${BACKUP_NAME}"
rm -rf "${BACKUP_NAME}"

echo "Backup completed: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"

# Optional: Upload to S3 or remote storage
if [ -n "${BACKUP_S3_BUCKET}" ]; then
  echo "Uploading to S3..."
  aws s3 cp "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" "s3://${BACKUP_S3_BUCKET}/backups/"
fi

# Cleanup old backups (keep last 30 days)
if [ -n "${BACKUP_RETENTION_DAYS}" ]; then
  find "${BACKUP_DIR}" -name "backup_*.tar.gz" -mtime +${BACKUP_RETENTION_DAYS} -delete
fi

echo "Backup process completed at $(date)"
