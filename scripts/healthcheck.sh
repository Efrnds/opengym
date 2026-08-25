#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "============================================"
echo "          🏥 openGym Health Check           "
echo "============================================"

# 1. Check Docker Containers
echo ""
echo "🐳 [Containers Status]"
if command -v docker >/dev/null 2>&1; then
  docker compose -f "${ROOT_DIR}/docker-compose.yml" ps
else
  echo "⚠️ Docker is not installed or not in PATH."
fi

# 2. Check Disk Space
echo ""
echo "💾 [Disk Space]"
df -h "${ROOT_DIR}" | awk 'NR==1 || NR==2'

# 3. Check Memory Usage
echo ""
echo "🧠 [RAM Memory]"
free -h

# 4. Check Latest Backup
echo ""
echo "📦 [Latest Backup]"
BACKUP_DIR="${ROOT_DIR}/backups"
if [ -d "$BACKUP_DIR" ] && [ "$(ls -A "$BACKUP_DIR" 2>/dev/null)" ]; then
  ls -lht "$BACKUP_DIR"/opengym_data_*.tar.gz 2>/dev/null | head -n 3
else
  echo "⚠️ No backups found in $BACKUP_DIR."
fi

# 5. Check HTTPS & Domain
echo ""
echo "🔒 [Domain & SSL Status]"
DOMAIN=$(grep '^RP_ID=' "${ROOT_DIR}/.env" 2>/dev/null | cut -d '=' -f2 || echo "opengym-eduardo.duckdns.org")
if command -v curl >/dev/null 2>&1; then
  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "https://${DOMAIN}" || echo "FAILED")
  if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "302" ] || [ "$HTTP_STATUS" = "301" ]; then
    echo "✅ https://${DOMAIN} is reachable (HTTP ${HTTP_STATUS})"
  else
    echo "❌ https://${DOMAIN} returned status: ${HTTP_STATUS}"
  fi
fi

echo ""
echo "============================================"
echo "✨ Health check completed."
