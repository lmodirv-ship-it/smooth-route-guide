#!/bin/bash
# ═══════════════════════════════════════════════════════════
# HN Driver — Auto Deploy Script (runs on your VPS)
# Triggered by GitHub Webhook on every push
# ═══════════════════════════════════════════════════════════
set -euo pipefail

LOG_FILE="/var/log/hn-deploy.log"
REPO_DIR="/var/www/hn-driver"
LOCK_FILE="/tmp/hn-deploy.lock"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"; }

# Prevent concurrent deploys
if [ -f "$LOCK_FILE" ]; then
  log "⚠ Deploy already running. Skipping."
  exit 0
fi
trap 'rm -f "$LOCK_FILE"' EXIT
touch "$LOCK_FILE"

log "═══════════════════════════════════════"
log "🚀 Starting auto-deploy..."

cd "$REPO_DIR"

# 0. Ensure pnpm is available
if ! command -v pnpm &>/dev/null; then
  log "[0] Installing pnpm globally..."
  npm install -g pnpm@latest
fi

# 1. Pull latest from GitHub
log "[1/6] Pulling latest code..."
git fetch origin main
git reset --hard origin/main

# 2. Install dependencies (pnpm enforced by project)
log "[2/6] Installing dependencies..."
pnpm install --frozen-lockfile 2>&1 | tail -5
log "  ✓ Dependencies installed"

# 3. Build all modules using project scripts
log "[3/6] Building modules..."

pnpm build 2>&1 | tail -3
log "  ✓ Client built"

pnpm build:admin 2>&1 | tail -3
log "  ✓ Admin built"

pnpm build:client 2>&1 | tail -3
log "  ✓ Call Center / Supervisor built"

pnpm build:driver-ride 2>&1 | tail -3
log "  ✓ Driver Ride built"

pnpm build:driver-delivery 2>&1 | tail -3
log "  ✓ Driver Delivery built"

pnpm build:hn-stock 2>&1 | tail -3
log "  ✓ HN Stock built"

# 4. Copy to web roots
log "[4/6] Deploying to web roots..."
mkdir -p /var/www/html /var/www/admin /var/www/call-center /var/www/supervisor /var/www/driver-ride /var/www/driver-delivery /var/www/hn-stock

rsync -a --delete dist/             /var/www/html/
rsync -a --delete dist-admin/       /var/www/admin/
rsync -a --delete dist-call-center/ /var/www/call-center/ 2>/dev/null || true
rsync -a --delete dist-supervisor/  /var/www/supervisor/  2>/dev/null || true
rsync -a --delete dist-driver-ride/ /var/www/driver-ride/ 2>/dev/null || true
rsync -a --delete dist-driver-delivery/ /var/www/driver-delivery/ 2>/dev/null || true

# HN-Stock: entry file is hn-stock.html — copy and rename to index.html for Nginx
rsync -a --delete dist-hn-stock/    /var/www/hn-stock/
if [ -f /var/www/hn-stock/hn-stock.html ] && [ ! -f /var/www/hn-stock/index.html ]; then
  cp /var/www/hn-stock/hn-stock.html /var/www/hn-stock/index.html
  log "  ✓ Created index.html from hn-stock.html"
fi

# 5. Ensure Nginx has ride & delivery subdomains
log "[5/6] Checking Nginx subdomains..."
NGINX_CONF="/etc/nginx/sites-available/hn-driver"
if [ -f "$NGINX_CONF" ] && ! grep -q "ride.hn-driver.com" "$NGINX_CONF"; then
  log "  Adding ride & delivery server blocks..."
  cat >> "$NGINX_CONF" << 'BLOCK'

# ─── Driver Ride ───
server {
    listen 80;
    server_name ride.hn-driver.com;
    root /var/www/driver-ride;
    index driver-ride.html;
    location / { try_files $uri $uri/ /driver-ride.html; }
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2|woff|ttf)$ {
        expires 1y; add_header Cache-Control "public, immutable";
    }
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;
}

# ─── Driver Delivery ───
server {
    listen 80;
    server_name delivery.hn-driver.com;
    root /var/www/driver-delivery;
    index driver-delivery.html;
    location / { try_files $uri $uri/ /driver-delivery.html; }
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2|woff|ttf)$ {
        expires 1y; add_header Cache-Control "public, immutable";
    }
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;
}
BLOCK
  log "  ✓ Nginx blocks added"
else
  log "  ✓ Nginx blocks already present"
fi

# 6. Reload Nginx
log "[6/6] Reloading Nginx..."
sudo nginx -t && sudo systemctl reload nginx

log "✅ Deploy complete!"
log "═══════════════════════════════════════"
