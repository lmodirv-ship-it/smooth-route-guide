#!/bin/bash
#═══════════════════════════════════════════════════════════════
# HN-Driver — Incremental Database Sync
# Syncs recent changes from Lovable Cloud to local PostgreSQL
# Runs every 6 hours between full backups
#═══════════════════════════════════════════════════════════════
set -euo pipefail

ENV_FILE="/etc/hn-driver-backup.env"
[ -f "$ENV_FILE" ] && source "$ENV_FILE"

REMOTE_DB_URL="${SUPABASE_DB_URL:-}"
LOCAL_DB="${LOCAL_DB_NAME:-hn_driver}"
LOCAL_USER="${LOCAL_DB_USER:-hn_admin}"
LOG_DIR="${BACKUP_DIR:-/var/backups/hn-driver}/logs"
LOG_FILE="${LOG_DIR}/sync.log"
DATE_STR=$(date +"%Y-%m-%d %H:%M:%S")

mkdir -p "$LOG_DIR"

log() { echo "[${DATE_STR}] $1" | tee -a "$LOG_FILE"; }

if [ -z "$REMOTE_DB_URL" ]; then
  log "❌ SUPABASE_DB_URL not set"
  exit 1
fi

if ! sudo -u postgres psql -lqt | cut -d\| -f1 | grep -qw "$LOCAL_DB"; then
  log "❌ Local DB '${LOCAL_DB}' not found"
  exit 1
fi

log "═══ Incremental Sync Start ═══"
START_TIME=$(date +%s)

# ─── Tables with timestamps (sync recent records) ────────
# Get list of tables that have updated_at or created_at columns
SYNC_TABLES=$(psql "$REMOTE_DB_URL" -t -A -c "
  SELECT DISTINCT table_name FROM information_schema.columns
  WHERE table_schema='public' AND column_name IN ('updated_at','created_at')
  AND table_name IN (
    SELECT table_name FROM information_schema.tables
    WHERE table_schema='public' AND table_type='BASE TABLE'
  )
  ORDER BY table_name;
" 2>/dev/null)

SYNCED=0
ERRORS=0
TOTAL_ROWS=0

# Get last sync time from local DB
LAST_SYNC=$(sudo -u postgres psql -d "$LOCAL_DB" -t -A -c \
  "SELECT COALESCE(value,'2000-01-01') FROM _sync_meta WHERE key='last_sync';" 2>/dev/null || echo "2000-01-01")

log "Last sync: ${LAST_SYNC}"

for TABLE in $SYNC_TABLES; do
  # Skip system/meta tables
  [[ "$TABLE" == _* ]] && continue
  [[ "$TABLE" == pg_* ]] && continue

  # Determine the timestamp column to use
  HAS_UPDATED=$(psql "$REMOTE_DB_URL" -t -A -c \
    "SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='${TABLE}' AND column_name='updated_at';" 2>/dev/null || echo "0")

  if [ "$HAS_UPDATED" -gt 0 ]; then
    TS_COL="updated_at"
  else
    TS_COL="created_at"
  fi

  # Count recent changes
  CHANGE_COUNT=$(psql "$REMOTE_DB_URL" -t -A -c \
    "SELECT count(*) FROM public.\"${TABLE}\" WHERE ${TS_COL} > '${LAST_SYNC}'::timestamptz;" 2>/dev/null || echo "0")

  if [ "$CHANGE_COUNT" -gt 0 ]; then
    log "  📋 ${TABLE}: ${CHANGE_COUNT} changes since last sync"

    # Export changed rows to temp file
    TEMP_FILE="/tmp/sync_${TABLE}_${RANDOM}.csv"

    if psql "$REMOTE_DB_URL" -c \
      "\\COPY (SELECT * FROM public.\"${TABLE}\" WHERE ${TS_COL} > '${LAST_SYNC}'::timestamptz) TO '${TEMP_FILE}' WITH CSV HEADER;" 2>>"$LOG_FILE"; then

      # Get primary key column
      PK_COL=$(psql "$REMOTE_DB_URL" -t -A -c "
        SELECT kcu.column_name FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_schema='public' AND tc.table_name='${TABLE}' AND tc.constraint_type='PRIMARY KEY'
        LIMIT 1;
      " 2>/dev/null || echo "id")

      # Delete existing records that will be updated
      if [ -n "$PK_COL" ]; then
        IDS=$(psql "$REMOTE_DB_URL" -t -A -c \
          "SELECT string_agg(''''||${PK_COL}::text||'''', ',') FROM public.\"${TABLE}\" WHERE ${TS_COL} > '${LAST_SYNC}'::timestamptz;" 2>/dev/null || echo "")
        if [ -n "$IDS" ] && [ "$IDS" != "" ]; then
          sudo -u postgres psql -d "$LOCAL_DB" -c \
            "DELETE FROM public.\"${TABLE}\" WHERE ${PK_COL}::text IN (${IDS});" 2>/dev/null || true
        fi
      fi

      # Import updated rows
      if sudo -u postgres psql -d "$LOCAL_DB" -c \
        "\\COPY public.\"${TABLE}\" FROM '${TEMP_FILE}' WITH CSV HEADER;" 2>>"$LOG_FILE"; then
        SYNCED=$((SYNCED + 1))
        TOTAL_ROWS=$((TOTAL_ROWS + CHANGE_COUNT))
      else
        ERRORS=$((ERRORS + 1))
        log "  ⚠️  Failed to import ${TABLE}"
      fi
    else
      ERRORS=$((ERRORS + 1))
      log "  ⚠️  Failed to export ${TABLE}"
    fi

    rm -f "$TEMP_FILE"
  fi
done

# ─── Update Sync Metadata ────────────────────────────────
sudo -u postgres psql -d "$LOCAL_DB" -c \
  "UPDATE _sync_meta SET value='${DATE_STR}', updated_at=now() WHERE key='last_sync';" 2>/dev/null || true

if [ "$ERRORS" -eq 0 ]; then
  sudo -u postgres psql -d "$LOCAL_DB" -c \
    "UPDATE _sync_meta SET value='synced', updated_at=now() WHERE key='sync_status';" 2>/dev/null || true
else
  sudo -u postgres psql -d "$LOCAL_DB" -c \
    "UPDATE _sync_meta SET value='partial', updated_at=now() WHERE key='sync_status';" 2>/dev/null || true
fi

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

log "═══ Sync Complete ═══"
log "  Tables synced: ${SYNCED} | Rows: ${TOTAL_ROWS} | Errors: ${ERRORS} | Duration: ${DURATION}s"
