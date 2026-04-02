#!/bin/bash
#═══════════════════════════════════════════════════════════════
# HN-Driver Database Backup Script
# Exports all data from Lovable Cloud to local PostgreSQL backup
#═══════════════════════════════════════════════════════════════
set -euo pipefail

BACKUP_DIR="/var/backups/hn-driver"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/hn_backup_${TIMESTAMP}.sql"
LATEST_LINK="${BACKUP_DIR}/latest.sql"
LOG_FILE="${BACKUP_DIR}/backup.log"
KEEP_DAYS=30

# Lovable Cloud (Supabase) connection
# Set these in /etc/hn-driver-backup.env
if [ -f /etc/hn-driver-backup.env ]; then
  source /etc/hn-driver-backup.env
fi

REMOTE_DB_URL="${SUPABASE_DB_URL:-}"

if [ -z "$REMOTE_DB_URL" ]; then
  echo "[ERROR] SUPABASE_DB_URL not set. Create /etc/hn-driver-backup.env with:"
  echo '  SUPABASE_DB_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres"'
  exit 1
fi

mkdir -p "$BACKUP_DIR"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "═══ Starting backup ═══"

# Export schema + data from Lovable Cloud
log "Exporting from Lovable Cloud..."
pg_dump "$REMOTE_DB_URL" \
  --no-owner \
  --no-privileges \
  --schema=public \
  --format=plain \
  --file="$BACKUP_FILE" \
  2>> "$LOG_FILE"

if [ $? -eq 0 ]; then
  FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  log "✅ Backup saved: $BACKUP_FILE ($FILE_SIZE)"
  
  # Update latest symlink
  ln -sf "$BACKUP_FILE" "$LATEST_LINK"
  
  # Compress
  gzip -f "$BACKUP_FILE"
  log "✅ Compressed: ${BACKUP_FILE}.gz"
  
  # Clean old backups
  find "$BACKUP_DIR" -name "hn_backup_*.sql.gz" -mtime +$KEEP_DAYS -delete
  log "🧹 Cleaned backups older than ${KEEP_DAYS} days"
else
  log "❌ Backup FAILED!"
  exit 1
fi

log "═══ Backup complete ═══"
echo ""
echo "To restore on local PostgreSQL:"
echo "  gunzip -c ${BACKUP_FILE}.gz | psql -U postgres -d hn_driver"
