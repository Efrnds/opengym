#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$ROOT_DIR"

echo "🚀 Deploying / Updating openGym..."

# Step 1: Backup current data before update
if [ -f "${SCRIPT_DIR}/backup.sh" ]; then
  bash "${SCRIPT_DIR}/backup.sh" || true
fi

# Step 2: Pull latest container images
echo "📥 Pulling latest Docker images..."
docker compose pull

# Step 3: Up with latest containers
echo "🔄 Starting services..."
docker compose up -d

# Step 4: Verify health
echo "🔍 Checking container status..."
docker compose ps

echo "🎉 openGym is up and running!"
