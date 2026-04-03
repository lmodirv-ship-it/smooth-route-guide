#!/bin/bash
# ═══════════════════════════════════════════════════════════
# HN Driver — Server Setup Script (run ONCE on your VPS)
# Sets up: webhook listener, nginx, auto-deploy
# ═══════════════════════════════════════════════════════════
set -e

echo "═══════════════════════════════════════"
echo "  HN Driver — Server Setup"
echo "═══════════════════════════════════════"

# 1. Install required packages
echo "[1/6] Installing packages..."
sudo apt update
sudo apt install -y nginx webhook git rsync curl

# 2. Install Node.js 20
echo "[2/6] Installing Node.js 20..."
if ! command -v node &>/dev/null || [[ "$(node -v)" != v20* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt install -y nodejs
fi
echo "  Node: $(node -v)"

# 3. Clone repo
echo "[3/6] Setting up repository..."
REPO_DIR="/var/www/hn-driver"
if [ ! -d "$REPO_DIR/.git" ]; then
  echo "  Enter your GitHub repo URL:"
  read -r REPO_URL
  sudo git clone "$REPO_URL" "$REPO_DIR"
  sudo chown -R $USER:$USER "$REPO_DIR"
else
  echo "  ✓ Repository already exists"
fi

# 4. Create web root directories
echo "[4/6] Creating web directories..."
sudo mkdir -p /var/www/html /var/www/admin /var/www/call-center /var/www/supervisor /var/www/driver-ride /var/www/driver-delivery

# 5. Setup webhook as systemd service
echo "[5/6] Setting up webhook service..."

# Generate a webhook secret
WEBHOOK_SECRET=$(openssl rand -hex 32)
echo "  🔑 Webhook Secret: $WEBHOOK_SECRET"
echo "  ⚠  Save this! Add it to GitHub → Repo Settings → Webhooks → Secret"

# Update webhook config with the secret
sed -i "s/YOUR_WEBHOOK_SECRET_HERE/$WEBHOOK_SECRET/" "$REPO_DIR/scripts/server/webhook-handler.json"

sudo tee /etc/systemd/system/hn-webhook.service > /dev/null << EOF
[Unit]
Description=HN Driver GitHub Webhook
After=network.target

[Service]
Type=simple
User=$USER
ExecStart=/usr/bin/webhook -hooks $REPO_DIR/scripts/server/webhook-handler.json -port 9000 -verbose
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable hn-webhook
sudo systemctl start hn-webhook

# 6. Setup Nginx
echo "[6/6] Configuring Nginx..."
sudo tee /etc/nginx/sites-available/hn-driver > /dev/null << 'NGINX'
# ═══════════════════════════════════════════════════════════
# Supports BOTH hn-driver.com AND hn-driver.net
# ═══════════════════════════════════════════════════════════

# ─── Main App ───
server {
    listen 80;
    server_name hn-driver.com www.hn-driver.com hn-driver.net www.hn-driver.net;
    root /var/www/html;
    index index.html;
    location / { try_files $uri $uri/ /index.html; }
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2|woff|ttf)$ {
        expires 1y; add_header Cache-Control "public, immutable";
    }
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;
}

# ─── Admin Panel ───
server {
    listen 80;
    server_name admin.hn-driver.com admin.hn-driver.net;
    root /var/www/admin;
    index admin.html;
    location / { try_files $uri $uri/ /admin.html; }
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2|woff|ttf)$ {
        expires 1y; add_header Cache-Control "public, immutable";
    }
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;
}

# ─── Call Center ───
server {
    listen 80;
    server_name call.hn-driver.com call.hn-driver.net;
    root /var/www/call-center;
    index call-center.html;
    location / { try_files $uri $uri/ /call-center.html; }
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2|woff|ttf)$ {
        expires 1y; add_header Cache-Control "public, immutable";
    }
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;
}

# ─── Supervisor ───
server {
    listen 80;
    server_name supervisor.hn-driver.com supervisor.hn-driver.net;
    root /var/www/supervisor;
    index supervisor.html;
    location / { try_files $uri $uri/ /supervisor.html; }
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2|woff|ttf)$ {
        expires 1y; add_header Cache-Control "public, immutable";
    }
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;
}

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
NGINX

sudo ln -sf /etc/nginx/sites-available/hn-driver /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

echo ""
echo "═══════════════════════════════════════"
echo "  ✅ Server setup complete!"
echo ""
echo "  Next steps:"
echo "  1. Go to GitHub → Repo Settings → Webhooks → Add webhook"
echo "     URL: http://YOUR_SERVER_IP:9000/hooks/deploy"
echo "     Secret: $WEBHOOK_SECRET"
echo "     Events: Just the push event"
echo ""
echo "  2. Setup SSL (BOTH domains):"
echo "     sudo apt install certbot python3-certbot-nginx"
echo "     sudo certbot --nginx -d hn-driver.com -d www.hn-driver.com -d admin.hn-driver.com -d call.hn-driver.com -d supervisor.hn-driver.com -d hn-driver.net -d www.hn-driver.net -d admin.hn-driver.net -d call.hn-driver.net -d supervisor.hn-driver.net"
echo ""
echo "  3. Add DNS A records pointing to your server IP"
echo "═══════════════════════════════════════"
