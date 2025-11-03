#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/var/www/pirate-api"
SERVICE="pirate-api"

command -v node >/dev/null 2>&1 || { echo "node not found"; exit 1; }
command -v npm  >/dev/null 2>&1 || { echo "npm not found"; exit 1; }
[ -d "$APP_DIR" ] || { echo "App dir $APP_DIR missing"; exit 1; }
[ -f "$APP_DIR/.env" ] || { echo ".env missing in $APP_DIR"; exit 1; }

cd "$APP_DIR"
umask 022

echo "==> pulling latest code"
git fetch --all
git reset --hard origin/main

echo "==> npm ci"
npm ci

echo "==> build"
npm run build

# Assets that aren't emitted by tsc:
[ -f src/swagger.yml ] && install -D -m 0644 src/swagger.yml dist/swagger.yml

echo "==> database migrations"
npm run db:migrate   # or db:push if that’s your workflow

echo "==> prune dev dependencies"
npm prune --omit=dev

echo "==> restart service"
sudo systemctl restart "$SERVICE"

echo "==> status (first lines)"
systemctl --no-pager --full status "$SERVICE" | sed -n '1,20p' || true

echo "==> last 50 log lines"
journalctl -u "$SERVICE" -n 50 --no-pager || true

echo "==> health check"
curl -fsS http://127.0.0.1:3001/ping | head -c 200 || true
