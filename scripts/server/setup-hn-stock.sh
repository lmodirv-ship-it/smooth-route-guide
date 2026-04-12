#!/bin/bash
# ═══════════════════════════════════════════════════════════
# HN-STOCK — Isolated Server Setup Script
# Domain: hn-driver.site | Port: 5050 | DB: hn_stock_db
# Fully isolated from hn-driver.com and hn-driver.online
# ═══════════════════════════════════════════════════════════
set -e

echo "═══════════════════════════════════════"
echo "  HN-STOCK — Isolated Server Setup"
echo "═══════════════════════════════════════"

# ─── 1. Create isolated directory ───
echo "[1/5] Creating isolated directory..."
sudo mkdir -p /var/www/hn-stock
echo "  ✓ /var/www/hn-stock/"

# ─── 2. PostgreSQL — isolated database ───
echo "[2/5] Setting up isolated PostgreSQL database..."
if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw hn_stock_db; then
  echo "  ✓ Database hn_stock_db already exists"
else
  HN_STOCK_DB_PASS=$(openssl rand -hex 16)
  sudo -u postgres psql -c "CREATE USER hn_stock_user WITH PASSWORD '$HN_STOCK_DB_PASS';"
  sudo -u postgres psql -c "CREATE DATABASE hn_stock_db OWNER hn_stock_user;"
  echo "  ✓ Database: hn_stock_db"
  echo "  ✓ User: hn_stock_user"
  echo "  🔑 Password: $HN_STOCK_DB_PASS"
  echo "  ⚠  Save this password! Add it to /var/www/hn-stock/.env"
fi

# ─── 3. PM2 process ───
echo "[3/5] Setting up PM2 process..."
if ! command -v pm2 &>/dev/null; then
  sudo npm install -g pm2
fi
echo "  ✓ PM2 ready (start after deploying code)"

# ─── 4. Nginx — isolated config file ───
echo "[4/5] Configuring Nginx (isolated config)..."
sudo tee /etc/nginx/sites-available/hn-stock > /dev/null << 'NGINX'
# ═══════════════════════════════════════════════════════════
# HN-STOCK — hn-driver.site (ISOLATED from other projects)
# ═══════════════════════════════════════════════════════════
server {
    listen 80;
    server_name hn-driver.site www.hn-driver.site;

    # React frontend (static files)
    root /var/www/hn-stock/dist;
    index index.html;

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API reverse proxy → Express on port 5050
    location /api/ {
        proxy_pass http://127.0.0.1:5050;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    # Static assets caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2|woff|ttf)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;
}
NGINX

sudo ln -sf /etc/nginx/sites-available/hn-stock /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# ─── 5. Done ───
echo ""
echo "═══════════════════════════════════════"
echo "  ✅ HN-STOCK isolated setup complete!"
echo ""
echo "  Next steps:"
echo "  1. Upload code to /var/www/hn-stock/"
echo "     scp hn-driver-full-project_1.zip root@213.156.132.166:/tmp/"
echo "     cd /var/www/hn-stock && unzip /tmp/hn-driver-full-project_1.zip"
echo ""
echo "  2. Install & build:"
echo "     cd /var/www/hn-stock && npm install && npm run build"
echo ""
echo "  3. Create .env file:"
echo "     DATABASE_URL=postgresql://hn_stock_user:PASSWORD@localhost:5432/hn_stock_db"
echo "     PORT=5050"
echo ""
echo "  4. Push database schema:"
echo "     cd /var/www/hn-stock && npm run db:push"
echo ""
echo "  5. Start API with PM2:"
echo "     pm2 start server/index.js --name hn-stock-api"
echo "     pm2 save"
echo ""
echo "  6. SSL certificate:"
echo "     sudo certbot --nginx -d hn-driver.site -d www.hn-driver.site"
echo ""
echo "  7. DNS: Add A records for hn-driver.site → 213.156.132.166"
echo "═══════════════════════════════════════"
