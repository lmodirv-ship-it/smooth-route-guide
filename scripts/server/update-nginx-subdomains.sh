#!/bin/bash
# ═══════════════════════════════════════════════════════════
# HN Driver — Add ride & delivery subdomains to Nginx
# Run on VPS: bash update-nginx-subdomains.sh
# ═══════════════════════════════════════════════════════════
set -e

echo "🔧 Adding ride.hn-driver.com & delivery.hn-driver.com to Nginx..."

# Create web roots if missing
sudo mkdir -p /var/www/driver-ride /var/www/driver-delivery

# Check if blocks already exist
CONF="/etc/nginx/sites-available/hn-driver"
if grep -q "ride.hn-driver.com" "$CONF" 2>/dev/null; then
  echo "⚠ ride.hn-driver.com already in config, skipping..."
else
  echo "Adding ride & delivery server blocks..."
  
  # Append before closing (add new blocks)
  sudo tee -a "$CONF" > /dev/null << 'NGINX'

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
fi

# Test & reload
echo "Testing Nginx config..."
sudo nginx -t

echo "Reloading Nginx..."
sudo systemctl reload nginx

# Setup SSL for new subdomains
echo ""
echo "✅ Done! Now setup SSL:"
echo "   sudo certbot --nginx -d ride.hn-driver.com -d delivery.hn-driver.com"
echo ""
