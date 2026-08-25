#!/usr/bin/env bash
set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_SCRIPT="${SCRIPT_DIR}/backup.sh"

chmod +x "${SCRIPT_DIR}"/*.sh

CRON_JOB="0 3 * * * /usr/bin/env bash ${BACKUP_SCRIPT} >> /tmp/opengym_backup.log 2>&1"

# Get existing crontab safely (ignore non-zero exit code if empty)
EXISTING_CRON=$(crontab -l 2>/dev/null || true)

# Check if job already exists
if echo "$EXISTING_CRON" | grep -F "$BACKUP_SCRIPT" >/dev/null 2>&1; then
  echo "ℹ️ Cron job already configured."
else
  # Append new cron job
  (echo "$EXISTING_CRON"; echo "$CRON_JOB") | sed '/^$/d' | crontab -
  echo "✅ Cron job installed successfully! Backup will run automatically every day at 03:00 AM."
fi

crontab -l | grep "$BACKUP_SCRIPT" || true
