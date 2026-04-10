#!/bin/bash
#═══════════════════════════════════════════════════════════════
# HN-Driver — Complete Local Database System Setup
# Installs PostgreSQL, creates mirror DB, configures automated
# backup, sync, health-check, and restore capabilities
#═══════════════════════════════════════════════════════════════
set -euo pipefail

DB_NAME="hn_driver"
DB_USER="hn_admin"
DB_PASS="${HN_DB_PASSWORD:-$(openssl rand -base64 16)}"
BACKUP_DIR="/var/backups/hn-driver"
SCRIPTS_DIR="/var/www/hn-driver/scripts/server"
ENV_FILE="/etc/hn-driver-backup.env"

C_GREEN="\033[0;32m"
C_YELLOW="\033[1;33m"
C_RED="\033[0;31m"
C_RESET="\033[0m"

ok()   { echo -e "${C_GREEN}✅ $1${C_RESET}"; }
warn() { echo -e "${C_YELLOW}⚠️  $1${C_RESET}"; }
fail() { echo -e "${C_RED}❌ $1${C_RESET}"; }

echo "╔═══════════════════════════════════════════════════╗"
echo "║   HN-Driver — Local Database System Setup v2.0   ║"
echo "╚═══════════════════════════════════════════════════╝"
echo ""

# ─── 1. Install PostgreSQL ────────────────────────────────
echo "[1/8] PostgreSQL..."
if ! command -v psql &>/dev/null; then
  apt-get update -qq
  apt-get install -y postgresql postgresql-client
  ok "PostgreSQL installed"
else
  ok "PostgreSQL already installed ($(psql --version | head -1))"
fi

# ─── 2. Start & Enable ───────────────────────────────────
echo "[2/8] Starting PostgreSQL service..."
systemctl enable postgresql --quiet
systemctl start postgresql
ok "PostgreSQL running"

# ─── 3. Create Database & User ────────────────────────────
echo "[3/8] Creating database '$DB_NAME' and user '$DB_USER'..."
sudo -u postgres psql -v ON_ERROR_STOP=0 <<SQL 2>/dev/null || true
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${DB_USER}') THEN
    CREATE ROLE ${DB_USER} WITH LOGIN PASSWORD '${DB_PASS}';
  END IF;
END\$\$;
SQL
sudo -u postgres psql -c "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1 \
  || sudo -u postgres createdb -O "$DB_USER" "$DB_NAME"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};"
sudo -u postgres psql -d "$DB_NAME" -c "GRANT ALL ON SCHEMA public TO ${DB_USER};"
ok "Database ready"

# ─── 4. Create Extensions ────────────────────────────────
echo "[4/8] Installing extensions..."
sudo -u postgres psql -d "$DB_NAME" -c "CREATE EXTENSION IF NOT EXISTS pg_trgm;" 2>/dev/null || true
sudo -u postgres psql -d "$DB_NAME" -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;" 2>/dev/null || true
ok "Extensions installed"

# ─── 5. Create Metadata Table ────────────────────────────
echo "[5/8] Creating sync metadata table..."
sudo -u postgres psql -d "$DB_NAME" <<'SQL'
CREATE TABLE IF NOT EXISTS _sync_meta (
  id         SERIAL PRIMARY KEY,
  key        TEXT UNIQUE NOT NULL,
  value      TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);
INSERT INTO _sync_meta (key, value) VALUES
  ('last_full_backup',   ''),
  ('last_sync',          ''),
  ('last_health_check',  ''),
  ('backup_count',       '0'),
  ('sync_status',        'pending'),
  ('schema_version',     '1.0')
ON CONFLICT (key) DO NOTHING;
SQL
ok "Metadata table ready"

# ─── 6. Create Backup History Table ──────────────────────
echo "[6/8] Creating backup history table..."
sudo -u postgres psql -d "$DB_NAME" <<'SQL'
CREATE TABLE IF NOT EXISTS _backup_history (
  id          SERIAL PRIMARY KEY,
  backup_type TEXT NOT NULL DEFAULT 'full',
  file_path   TEXT,
  file_size   BIGINT DEFAULT 0,
  tables_count INTEGER DEFAULT 0,
  rows_total   BIGINT DEFAULT 0,
  duration_sec INTEGER DEFAULT 0,
  status      TEXT DEFAULT 'success',
  error_msg   TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_backup_hist_date ON _backup_history (created_at DESC);
SQL
ok "Backup history table ready"

# ─── 7. Environment File ─────────────────────────────────
echo "[7/8] Configuration..."
if [ ! -f "$ENV_FILE" ]; then
  cat > "$ENV_FILE" <<EOF
# ═══════════════════════════════════════════════════
# HN-Driver Database Configuration
# ═══════════════════════════════════════════════════

# Lovable Cloud (Remote) — REQUIRED
# Get the connection string from Lovable Cloud
SUPABASE_DB_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres"

# Local Database
LOCAL_DB_NAME="${DB_NAME}"
LOCAL_DB_USER="${DB_USER}"
LOCAL_DB_PASS="${DB_PASS}"

# Backup Settings
BACKUP_DIR="${BACKUP_DIR}"
KEEP_DAYS=30
KEEP_WEEKLY=12
ENABLE_SYNC=true
SYNC_INTERVAL_HOURS=6

# Cloud Reporting (sends backup status to admin dashboard)
SUPABASE_FUNCTIONS_URL="https://typamugwwatqmdkxkfof.supabase.co/functions/v1"
SERVER_BACKUP_KEY="CHANGE_THIS_TO_A_SECRET_KEY"

# Notifications (optional)
NOTIFY_EMAIL=""
NOTIFY_WEBHOOK=""
EOF
  chmod 600 "$ENV_FILE"
  warn "Edit ${ENV_FILE} with your Lovable Cloud DB URL"
else
  ok "Config already exists"
fi

# ─── 8. Setup Directories & Cron Jobs ────────────────────
echo "[8/8] Setting up directories and scheduled tasks..."
mkdir -p "$BACKUP_DIR"/{daily,weekly,logs}
chmod 700 "$BACKUP_DIR"

# Daily full backup at 3:00 AM
CRON_BACKUP="0 3 * * * ${SCRIPTS_DIR}/backup-database.sh >> ${BACKUP_DIR}/logs/cron-backup.log 2>&1"
# Sync every 6 hours
CRON_SYNC="0 */6 * * * ${SCRIPTS_DIR}/sync-database.sh >> ${BACKUP_DIR}/logs/cron-sync.log 2>&1"
# Weekly backup on Sunday at 2:00 AM
CRON_WEEKLY="0 2 * * 0 ${SCRIPTS_DIR}/backup-database.sh --weekly >> ${BACKUP_DIR}/logs/cron-weekly.log 2>&1"
# Health check every hour
CRON_HEALTH="30 * * * * ${SCRIPTS_DIR}/db-health-check.sh >> ${BACKUP_DIR}/logs/cron-health.log 2>&1"

(crontab -l 2>/dev/null | grep -v "backup-database.sh" | grep -v "sync-database.sh" | grep -v "db-health-check.sh"
echo "$CRON_BACKUP"
echo "$CRON_SYNC"
echo "$CRON_WEEKLY"
echo "$CRON_HEALTH"
) | crontab -

ok "Scheduled tasks configured"

echo ""
echo "╔═══════════════════════════════════════════════════╗"
echo "║              ✅ Setup Complete!                   ║"
echo "╠═══════════════════════════════════════════════════╣"
echo "║                                                   ║"
echo "║  Database: ${DB_NAME}                             ║"
echo "║  User:     ${DB_USER}                             ║"
echo "║  Config:   ${ENV_FILE}                            ║"
echo "║  Backups:  ${BACKUP_DIR}/                         ║"
echo "║                                                   ║"
echo "║  Scheduled Tasks:                                 ║"
echo "║  • Daily backup ─── 3:00 AM                      ║"
echo "║  • Weekly backup ── Sunday 2:00 AM               ║"
echo "║  • Sync ─────────── Every 6 hours                ║"
echo "║  • Health check ─── Every hour                   ║"
echo "║                                                   ║"
echo "╠═══════════════════════════════════════════════════╣"
echo "║  Next Steps:                                      ║"
echo "║  1. Edit ${ENV_FILE}                              ║"
echo "║  2. Run: bash ${SCRIPTS_DIR}/backup-database.sh  ║"
echo "║  3. Run: bash ${SCRIPTS_DIR}/sync-database.sh    ║"
echo "╚═══════════════════════════════════════════════════╝"
