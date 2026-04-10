#!/bin/bash
#═══════════════════════════════════════════════════════════════
# HN-Driver — Advanced Database Backup Script v2.0
# Full/incremental backup with compression, rotation,
# integrity verification, and local mirror restore
#═══════════════════════════════════════════════════════════════
set -euo pipefail

# ─── Load Config ──────────────────────────────────────────
ENV_FILE="/etc/hn-driver-backup.env"
[ -f "$ENV_FILE" ] && source "$ENV_FILE"

REMOTE_DB_URL="${SUPABASE_DB_URL:-}"
LOCAL_DB="${LOCAL_DB_NAME:-hn_driver}"
LOCAL_USER="${LOCAL_DB_USER:-hn_admin}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/hn-driver}"
KEEP_DAYS="${KEEP_DAYS:-30}"
KEEP_WEEKLY="${KEEP_WEEKLY:-12}"
ENABLE_SYNC="${ENABLE_SYNC:-true}"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DATE_STR=$(date +"%Y-%m-%d %H:%M:%S")
IS_WEEKLY=false
START_TIME=$(date +%s)

# Check for --weekly flag
if [[ "${1:-}" == "--weekly" ]]; then
  IS_WEEKLY=true
fi

if $IS_WEEKLY; then
  BACKUP_FILE="${BACKUP_DIR}/weekly/hn_weekly_${TIMESTAMP}.sql"
else
  BACKUP_FILE="${BACKUP_DIR}/daily/hn_backup_${TIMESTAMP}.sql"
fi

LOG_DIR="${BACKUP_DIR}/logs"
LOG_FILE="${LOG_DIR}/backup.log"
mkdir -p "$BACKUP_DIR"/{daily,weekly,logs}

# ─── Logging ─────────────────────────────────────────────
log() { echo "[${DATE_STR}] $1" | tee -a "$LOG_FILE"; }
log_ok()   { log "✅ $1"; }
log_fail() { log "❌ $1"; }

# ─── Validation ──────────────────────────────────────────
if [ -z "$REMOTE_DB_URL" ]; then
  log_fail "SUPABASE_DB_URL not configured in ${ENV_FILE}"
  exit 1
fi

log "═══════════════════════════════════════════════════"
if $IS_WEEKLY; then
  log "Starting WEEKLY backup..."
else
  log "Starting DAILY backup..."
fi

# ─── Step 1: Export from Lovable Cloud ───────────────────
log "📥 Exporting from Lovable Cloud..."

TABLES_COUNT=0
ROWS_TOTAL=0
BACKUP_STATUS="success"
ERROR_MSG=""

# Get table count before backup
TABLES_COUNT=$(psql "$REMOTE_DB_URL" -t -A -c \
  "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';" 2>/dev/null || echo "0")

# Get total rows
ROWS_TOTAL=$(psql "$REMOTE_DB_URL" -t -A -c \
  "SELECT COALESCE(SUM(n_live_tup),0) FROM pg_stat_user_tables WHERE schemaname='public';" 2>/dev/null || echo "0")

# Perform pg_dump
if pg_dump "$REMOTE_DB_URL" \
  --no-owner \
  --no-privileges \
  --schema=public \
  --format=plain \
  --verbose \
  --file="$BACKUP_FILE" 2>>"$LOG_FILE"; then

  RAW_SIZE=$(stat --printf="%s" "$BACKUP_FILE" 2>/dev/null || echo "0")
  RAW_SIZE_H=$(du -h "$BACKUP_FILE" | cut -f1)
  log_ok "Dump complete: ${RAW_SIZE_H} (${TABLES_COUNT} tables, ~${ROWS_TOTAL} rows)"

  # ─── Step 2: Verify Backup Integrity ─────────────────
  log "🔍 Verifying backup integrity..."
  if grep -q "CREATE TABLE" "$BACKUP_FILE" && grep -q "COPY public\." "$BACKUP_FILE"; then
    TABLE_CREATES=$(grep -c "CREATE TABLE" "$BACKUP_FILE" || echo 0)
    COPY_STMTS=$(grep -c "^COPY public\." "$BACKUP_FILE" || echo 0)
    log_ok "Integrity OK: ${TABLE_CREATES} CREATE TABLE, ${COPY_STMTS} COPY statements"
  else
    log_fail "Backup file seems incomplete!"
    BACKUP_STATUS="warning"
  fi

  # ─── Step 3: Compress ───────────────────────────────────
  log "📦 Compressing..."
  gzip -9 -f "$BACKUP_FILE"
  COMPRESSED_SIZE=$(du -h "${BACKUP_FILE}.gz" | cut -f1)
  log_ok "Compressed: ${COMPRESSED_SIZE}"

  # ─── Step 4: Create checksum ────────────────────────────
  sha256sum "${BACKUP_FILE}.gz" > "${BACKUP_FILE}.gz.sha256"
  log_ok "Checksum saved"

  # ─── Step 5: Update latest symlink ──────────────────────
  ln -sf "${BACKUP_FILE}.gz" "${BACKUP_DIR}/latest.sql.gz"

  # ─── Step 6: Sync to local DB (if enabled) ─────────────
  if [ "$ENABLE_SYNC" = "true" ]; then
    log "🔄 Syncing to local PostgreSQL..."
    if sudo -u postgres psql -lqt | cut -d\| -f1 | grep -qw "$LOCAL_DB"; then
      # Drop and recreate public schema for clean sync
      sudo -u postgres psql -d "$LOCAL_DB" -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;" 2>>"$LOG_FILE"
      sudo -u postgres psql -d "$LOCAL_DB" -c "GRANT ALL ON SCHEMA public TO ${LOCAL_USER};" 2>>"$LOG_FILE"

      # Restore from backup
      if gunzip -c "${BACKUP_FILE}.gz" | sudo -u postgres psql -d "$LOCAL_DB" -q 2>>"$LOG_FILE"; then
        LOCAL_TABLES=$(sudo -u postgres psql -d "$LOCAL_DB" -t -A -c \
          "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';")
        LOCAL_ROWS=$(sudo -u postgres psql -d "$LOCAL_DB" -t -A -c \
          "SELECT COALESCE(SUM(n_live_tup),0) FROM pg_stat_user_tables WHERE schemaname='public';")
        log_ok "Local mirror synced: ${LOCAL_TABLES} tables, ~${LOCAL_ROWS} rows"

        # Update sync metadata
        sudo -u postgres psql -d "$LOCAL_DB" -c \
          "UPDATE _sync_meta SET value='${DATE_STR}', updated_at=now() WHERE key='last_sync';" 2>/dev/null || true
        sudo -u postgres psql -d "$LOCAL_DB" -c \
          "UPDATE _sync_meta SET value='synced', updated_at=now() WHERE key='sync_status';" 2>/dev/null || true
      else
        log_fail "Local mirror sync failed"
        BACKUP_STATUS="partial"
      fi
    else
      log "⚠️  Local DB '${LOCAL_DB}' not found. Run setup-local-db.sh first."
    fi
  fi

  # ─── Step 7: Record in backup history ───────────────────
  END_TIME=$(date +%s)
  DURATION=$((END_TIME - START_TIME))

  if sudo -u postgres psql -d "$LOCAL_DB" -c "SELECT 1 FROM _backup_history LIMIT 0" 2>/dev/null; then
    BACKUP_TYPE=$( $IS_WEEKLY && echo "weekly" || echo "daily" )
    sudo -u postgres psql -d "$LOCAL_DB" -c \
      "INSERT INTO _backup_history (backup_type, file_path, file_size, tables_count, rows_total, duration_sec, status)
       VALUES ('${BACKUP_TYPE}', '${BACKUP_FILE}.gz', ${RAW_SIZE}, ${TABLES_COUNT}, ${ROWS_TOTAL}, ${DURATION}, '${BACKUP_STATUS}');" 2>/dev/null || true
    sudo -u postgres psql -d "$LOCAL_DB" -c \
      "UPDATE _sync_meta SET value='${DATE_STR}', updated_at=now() WHERE key='last_full_backup';" 2>/dev/null || true
    sudo -u postgres psql -d "$LOCAL_DB" -c \
      "UPDATE _sync_meta SET value=(COALESCE(value::int,0)+1)::text, updated_at=now() WHERE key='backup_count';" 2>/dev/null || true
  fi

else
  log_fail "pg_dump FAILED!"
  BACKUP_STATUS="failed"
  ERROR_MSG="pg_dump returned non-zero exit code"

  # Record failure
  END_TIME=$(date +%s)
  DURATION=$((END_TIME - START_TIME))
  if sudo -u postgres psql -d "$LOCAL_DB" -c "SELECT 1 FROM _backup_history LIMIT 0" 2>/dev/null; then
    sudo -u postgres psql -d "$LOCAL_DB" -c \
      "INSERT INTO _backup_history (backup_type, file_path, file_size, tables_count, rows_total, duration_sec, status, error_msg)
       VALUES ('daily', '', 0, 0, 0, ${DURATION}, 'failed', '${ERROR_MSG}');" 2>/dev/null || true
  fi
  exit 1
fi

# ─── Step 8: Cleanup Old Backups ─────────────────────────
log "🧹 Cleaning old backups..."
DELETED_DAILY=$(find "${BACKUP_DIR}/daily" -name "*.gz" -mtime +${KEEP_DAYS} -delete -print | wc -l)
DELETED_WEEKLY=$(find "${BACKUP_DIR}/weekly" -name "*.gz" -mtime +$((KEEP_WEEKLY * 7)) -delete -print | wc -l)
log_ok "Cleaned: ${DELETED_DAILY} daily, ${DELETED_WEEKLY} weekly old backups"

# ─── Step 9: Notify (if configured) ──────────────────────
if [ -n "${NOTIFY_WEBHOOK:-}" ]; then
  curl -sf -X POST "$NOTIFY_WEBHOOK" \
    -H "Content-Type: application/json" \
    -d "{\"text\":\"✅ HN-Driver backup complete: ${COMPRESSED_SIZE}, ${TABLES_COUNT} tables, ${ROWS_TOTAL} rows, ${DURATION}s\"}" \
    2>/dev/null || true
fi

# ─── Summary ─────────────────────────────────────────────
log "═══════════════════════════════════════════════════"
log "Backup complete in ${DURATION}s"
log "  File: ${BACKUP_FILE}.gz (${COMPRESSED_SIZE})"
log "  Tables: ${TABLES_COUNT} | Rows: ~${ROWS_TOTAL}"
log "  Status: ${BACKUP_STATUS}"
log "═══════════════════════════════════════════════════"
