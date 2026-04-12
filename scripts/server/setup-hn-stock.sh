#!/bin/bash
# ═══════════════════════════════════════════════════════════
# HN-STOCK — Fully Isolated Server Setup
# Domain: hn-driver.site | Admin: admin.hn-driver.site
# API Port: 5050 | DB: hn_stock_db (local PostgreSQL)
# 100% isolated from hn-driver.com and hn-driver.online
# ═══════════════════════════════════════════════════════════
set -e

echo "═══════════════════════════════════════"
echo "  HN-STOCK — Full Isolation Setup"
echo "═══════════════════════════════════════"

# ─── 1. Create isolated directories ───
echo "[1/6] Creating isolated directories..."
sudo mkdir -p /var/www/hn-stock/frontend    # React frontend
sudo mkdir -p /var/www/hn-stock/admin       # Admin panel (separate build)
sudo mkdir -p /var/www/hn-stock/server      # Express API
sudo mkdir -p /var/www/hn-stock/backups     # DB backups (isolated)
echo "  ✓ /var/www/hn-stock/{frontend,admin,server,backups}"

# ─── 2. PostgreSQL — fully isolated database ───
echo "[2/6] Setting up isolated PostgreSQL database..."
if ! command -v psql &>/dev/null; then
  echo "  Installing PostgreSQL..."
  sudo apt update && sudo apt install -y postgresql postgresql-contrib
  sudo systemctl enable postgresql
  sudo systemctl start postgresql
fi

if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw hn_stock_db; then
  echo "  ✓ Database hn_stock_db already exists"
else
  HN_STOCK_DB_PASS=$(openssl rand -hex 16)
  sudo -u postgres psql <<SQL
    CREATE USER hn_stock_user WITH PASSWORD '$HN_STOCK_DB_PASS';
    CREATE DATABASE hn_stock_db OWNER hn_stock_user;
    GRANT ALL PRIVILEGES ON DATABASE hn_stock_db TO hn_stock_user;
SQL
  echo "  ✓ Database: hn_stock_db"
  echo "  ✓ User: hn_stock_user"
  echo "  🔑 Password: $HN_STOCK_DB_PASS"
  echo ""
  echo "  ⚠  SAVE THIS! Creating .env file..."

  # Create isolated .env
  cat > /var/www/hn-stock/.env << ENVFILE
# ═══════════════════════════════════════
# HN-STOCK — Isolated Environment
# DO NOT mix with hn-driver.com settings
# ═══════════════════════════════════════
DATABASE_URL=postgresql://hn_stock_user:${HN_STOCK_DB_PASS}@localhost:5432/hn_stock_db
PORT=5050
NODE_ENV=production
ADMIN_SECRET=$(openssl rand -hex 32)
JWT_SECRET=$(openssl rand -hex 32)
CORS_ORIGIN=https://www.hn-driver.site,https://admin.hn-driver.site
ENVFILE
  chmod 600 /var/www/hn-stock/.env
  echo "  ✓ .env created with secure permissions"
fi

# ─── 3. PM2 — isolated process ───
echo "[3/6] Setting up PM2..."
if ! command -v pm2 &>/dev/null; then
  sudo npm install -g pm2
fi
echo "  ✓ PM2 ready"

# ─── 4. Nginx — Frontend (hn-driver.site) ───
echo "[4/6] Configuring Nginx for frontend..."
sudo tee /etc/nginx/sites-available/hn-stock > /dev/null << 'NGINX'
# ═══════════════════════════════════════════════════════════
# HN-STOCK Frontend — hn-driver.site
# ISOLATED: Separate config file, no shared blocks
# ═══════════════════════════════════════════════════════════
server {
    listen 80;
    server_name hn-driver.site www.hn-driver.site;

    root /var/www/hn-stock/frontend;
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

    # Static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2|woff|ttf)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;
}
NGINX

# ─── 5. Nginx — Admin Panel (admin.hn-driver.site) ───
echo "[5/6] Configuring Nginx for admin panel..."
sudo tee /etc/nginx/sites-available/hn-stock-admin > /dev/null << 'NGINX'
# ═══════════════════════════════════════════════════════════
# HN-STOCK Admin Panel — admin.hn-driver.site
# ISOLATED: Separate config, separate directory
# ═══════════════════════════════════════════════════════════
server {
    listen 80;
    server_name admin.hn-driver.site;

    root /var/www/hn-stock/admin;
    index index.html;

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Admin API — same Express backend, port 5050
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
    }

    # Static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2|woff|ttf)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;
}
NGINX

# Enable both sites
sudo ln -sf /etc/nginx/sites-available/hn-stock /etc/nginx/sites-enabled/
sudo ln -sf /etc/nginx/sites-available/hn-stock-admin /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# ─── 6. Automated backup (isolated) ───
echo "[6/6] Setting up isolated backup cron..."
sudo tee /var/www/hn-stock/backup.sh > /dev/null << 'BACKUP'
#!/bin/bash
# HN-STOCK isolated backup — runs independently
BACKUP_DIR="/var/www/hn-stock/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
pg_dump -U hn_stock_user -h localhost hn_stock_db > "$BACKUP_DIR/hn_stock_$TIMESTAMP.sql"
# Keep only last 7 days
find "$BACKUP_DIR" -name "*.sql" -mtime +7 -delete
BACKUP
chmod +x /var/www/hn-stock/backup.sh

# Add daily cron (3:30 AM — offset from hn-driver backup at 3:00 AM)
(crontab -l 2>/dev/null | grep -v "hn-stock/backup"; echo "30 3 * * * /var/www/hn-stock/backup.sh") | crontab -

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  ✅ HN-STOCK — Full Isolation Setup Complete!"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "  📁 Structure:"
echo "     /var/www/hn-stock/"
echo "     ├── frontend/     ← React build (hn-driver.site)"
echo "     ├── admin/        ← Admin build (admin.hn-driver.site)"
echo "     ├── server/       ← Express API (port 5050)"
echo "     ├── backups/      ← Daily PostgreSQL backups"
echo "     └── .env          ← Isolated config"
echo ""
echo "  🔗 Domains:"
echo "     Frontend: hn-driver.site / www.hn-driver.site"
echo "     Admin:    admin.hn-driver.site"
echo ""
echo "  📋 Next steps:"
echo ""
echo "  1. Upload & extract code:"
echo "     scp hn-stock.zip root@213.156.132.166:/tmp/"
echo "     cd /var/www/hn-stock && unzip /tmp/hn-stock.zip"
echo ""
echo "  2. Install dependencies & build:"
echo "     cd /var/www/hn-stock"
echo "     npm install"
echo "     npm run build          # → copies to frontend/"
echo "     npm run build:admin    # → copies to admin/"
echo ""
echo "  3. Push database schema:"
echo "     cd /var/www/hn-stock && npm run db:push"
echo ""
echo "  4. Start API:"
echo "     cd /var/www/hn-stock"
echo "     pm2 start server/index.js --name hn-stock-api --env-file .env"
echo "     pm2 save && pm2 startup"
echo ""
echo "  5. DNS — Add A records:"
echo "     hn-driver.site      → 213.156.132.166"
echo "     www.hn-driver.site  → 213.156.132.166"
echo "     admin.hn-driver.site → 213.156.132.166"
echo ""
echo "  6. SSL certificates:"
echo "     sudo certbot --nginx -d hn-driver.site -d www.hn-driver.site -d admin.hn-driver.site"
echo ""
echo "  ⚠  ISOLATION GUARANTEE:"
echo "     - Separate Nginx configs (hn-stock, hn-stock-admin)"
echo "     - Separate database (hn_stock_db — NOT shared)"
echo "     - Separate PM2 process (hn-stock-api on port 5050)"
echo "     - Separate backup cron (3:30 AM)"
echo "     - Zero dependency on hn-driver.com or hn-driver.online"
echo "═══════════════════════════════════════════════════════"
