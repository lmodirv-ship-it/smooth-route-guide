#!/bin/bash
# ═══════════════════════════════════════════════════════════
# HN Driver — Auto Deploy Script (runs on your VPS)
# Triggered by GitHub Webhook on every push
# ═══════════════════════════════════════════════════════════
set -e

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

# 1. Pull latest from GitHub
log "[1/5] Pulling latest code..."
git fetch origin main
git reset --hard origin/main

# 2. Install dependencies
log "[2/5] Installing dependencies..."
npm install --legacy-peer-deps 2>&1 | tail -5
if [ $? -ne 0 ]; then
  log "❌ npm install failed! Aborting deploy."
  exit 1
fi

# 3. Build all modules
log "[3/5] Building modules..."

# Main client app
npx vite build 2>&1 | tail -2
log "  ✓ Client built"

# Admin panel
npx vite build --config vite.config.admin.ts 2>&1 | tail -2
log "  ✓ Admin built"

# Call Center
npx vite build --config vite.config.call-center.ts 2>&1 | tail -2
log "  ✓ Call Center built"

# Supervisor
npx vite build --config vite.config.supervisor.ts 2>&1 | tail -2
log "  ✓ Supervisor built"

# Driver Ride
npx vite build --config vite.config.driver-ride.ts 2>&1 | tail -2
log "  ✓ Driver Ride built"

# Driver Delivery
npx vite build --config vite.config.driver-delivery.ts 2>&1 | tail -2
log "  ✓ Driver Delivery built"

# 4. Copy to web roots
log "[4/6] Deploying to web roots..."
mkdir -p /var/www/driver-ride /var/www/driver-delivery
rsync -a --delete dist/             /var/www/html/
rsync -a --delete dist-admin/       /var/www/admin/
rsync -a --delete dist-call-center/ /var/www/call-center/ 2>/dev/null || true
rsync -a --delete dist-supervisor/  /var/www/supervisor/  2>/dev/null || true
rsync -a --delete dist-driver-ride/ /var/www/driver-ride/ 2>/dev/null || true
rsync -a --delete dist-driver-delivery/ /var/www/driver-delivery/ 2>/dev/null || true

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
