#!/usr/bin/env bash
set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
DATA_DIR="${ROOT_DIR}/data"

if [ $# -eq 0 ]; then
  echo "Usage: $0 <path-to-backup-archive.tar.gz>"
  echo ""
  echo "Available backups in ./backups/:"
  ls -lh "${ROOT_DIR}/backups" 2>/dev/null || echo "No backups found."
  exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "❌ Error: Backup file '$BACKUP_FILE' not found!"
  exit 1
fi

echo "⚠️  WARNING: Restoring will overwrite existing files in $DATA_DIR!"
read -p "Are you sure you want to proceed? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 0
fi

# Create a temporary safety backup of current data if it exists
if [ -d "$DATA_DIR" ]; then
  SAFETY_FILE="${ROOT_DIR}/backups/safety_before_restore_$(date +%Y%m%d_%H%M%S).tar.gz"
  mkdir -p "${ROOT_DIR}/backups"
  echo "🛡️ Creating safety snapshot of current data at $SAFETY_FILE..."
  sudo tar -czf "$SAFETY_FILE" -C "$ROOT_DIR" data 2>/dev/null || true
  sudo chown $(id -u):$(id -g) "$SAFETY_FILE" 2>/dev/null || true
fi

echo "🔄 Restoring data from $BACKUP_FILE..."
sudo tar -xzf "$BACKUP_FILE" -C "$ROOT_DIR"

echo "✅ Restore completed successfully!"
