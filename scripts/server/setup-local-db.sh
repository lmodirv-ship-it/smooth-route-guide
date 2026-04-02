#!/bin/bash
#═══════════════════════════════════════════════════════════════
# HN-Driver Local PostgreSQL Setup
# Sets up a local database on VPS as backup/mirror
#═══════════════════════════════════════════════════════════════
set -euo pipefail

DB_NAME="hn_driver"
DB_USER="hn_admin"

echo "═══════════════════════════════════════"
echo "  HN-Driver Local Database Setup"
echo "═══════════════════════════════════════"

# 1. Install PostgreSQL if not present
if ! command -v psql &> /dev/null; then
  echo "[1/5] Installing PostgreSQL..."
  apt-get update -qq
  apt-get install -y postgresql postgresql-client
else
  echo "[1/5] PostgreSQL already installed ✅"
fi

# 2. Start PostgreSQL
echo "[2/5] Starting PostgreSQL..."
systemctl enable postgresql
systemctl start postgresql

# 3. Create database and user
echo "[3/5] Creating database '$DB_NAME' and user '$DB_USER'..."
sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD 'CHANGE_THIS_PASSWORD';" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>/dev/null || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"

# 4. Create backup env file
echo "[4/5] Creating backup configuration..."
if [ ! -f /etc/hn-driver-backup.env ]; then
  cat > /etc/hn-driver-backup.env << 'EOF'
# Lovable Cloud Database URL
# Get this from Lovable Cloud → Database → Connection String
SUPABASE_DB_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres"

# Local database
LOCAL_DB_NAME="hn_driver"
LOCAL_DB_USER="hn_admin"
EOF
  chmod 600 /etc/hn-driver-backup.env
  echo "  ⚠️  Edit /etc/hn-driver-backup.env with your Lovable Cloud DB URL"
else
  echo "  Config already exists ✅"
fi

# 5. Setup daily cron backup
echo "[5/5] Setting up daily backup cron job..."
CRON_CMD="0 3 * * * /var/www/hn-driver/scripts/server/backup-database.sh >> /var/backups/hn-driver/cron.log 2>&1"
(crontab -l 2>/dev/null | grep -v "backup-database.sh"; echo "$CRON_CMD") | crontab -

echo ""
echo "═══════════════════════════════════════"
echo "  ✅ Setup Complete!"
echo "═══════════════════════════════════════"
echo ""
echo "Next steps:"
echo "  1. Edit /etc/hn-driver-backup.env with your DB URL"
echo "  2. Run first backup: bash /var/www/hn-driver/scripts/server/backup-database.sh"
echo "  3. Daily backups will run at 3:00 AM automatically"
echo ""
echo "Manual restore:"
echo "  gunzip -c /var/backups/hn-driver/latest.sql.gz | psql -U $DB_USER -d $DB_NAME"
