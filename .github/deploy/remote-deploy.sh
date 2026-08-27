#!/usr/bin/env bash
# Production deploy on the host: git pull + rebuild web with streaming build output.
# Invoked by .github/workflows/deploy.yml over SSH (after git pull bootstraps this file).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$ROOT_DIR"

echo "==> Updating repository..."
git pull

echo "==> Rebuilding web service (plain progress for long builds)..."
export DOCKER_BUILDKIT=1

docker compose --progress=plain up -d --build web

echo "==> Web service status:"
docker compose ps web
