#!/usr/bin/env bash
set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

BACKUP_DIR="${ROOT_DIR}/backups"
DATA_DIR="${ROOT_DIR}/data"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/opengym_data_${TIMESTAMP}.tar.gz"
RETENTION_DAYS=14

mkdir -p "$BACKUP_DIR"

if [ ! -d "$DATA_DIR" ]; then
  echo "⚠️ Warning: Data directory ($DATA_DIR) does not exist yet. Nothing to backup."
  exit 0
fi

echo "📦 Creating backup of openGym data..."
sudo tar -czf "$BACKUP_FILE" -C "$ROOT_DIR" data
sudo chown $(id -u):$(id -g) "$BACKUP_FILE" 2>/dev/null || true

BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "✅ Backup created successfully: $BACKUP_FILE ($BACKUP_SIZE)"

# Prune backups older than RETENTION_DAYS
echo "🧹 Cleaning up backups older than ${RETENTION_DAYS} days..."
find "$BACKUP_DIR" -name "opengym_data_*.tar.gz" -type f -mtime +"$RETENTION_DAYS" -delete 2>/dev/null || true
echo "✨ Current backups in $BACKUP_DIR:"
ls -lh "$BACKUP_DIR"
