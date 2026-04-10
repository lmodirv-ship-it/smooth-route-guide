#!/bin/bash
#═══════════════════════════════════════════════════════════════
# HN-Driver — Database Restore Script
# Restore from local backup to local DB or push back to cloud
#═══════════════════════════════════════════════════════════════
set -euo pipefail

ENV_FILE="/etc/hn-driver-backup.env"
[ -f "$ENV_FILE" ] && source "$ENV_FILE"

LOCAL_DB="${LOCAL_DB_NAME:-hn_driver}"
LOCAL_USER="${LOCAL_DB_USER:-hn_admin}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/hn-driver}"

usage() {
  echo "Usage: $0 [OPTIONS]"
  echo ""
  echo "Options:"
  echo "  --latest           Restore from latest backup (default)"
  echo "  --file <path>      Restore from specific backup file (.sql.gz)"
  echo "  --list             List available backups"
  echo "  --verify <path>    Verify a backup file without restoring"
  echo "  --target local     Restore to local DB (default)"
  echo "  --target cloud     Push restore to Lovable Cloud (⚠️ destructive)"
  echo "  --dry-run          Show what would happen without doing it"
  echo ""
  exit 0
}

BACKUP_FILE=""
TARGET="local"
DRY_RUN=false
ACTION="restore"

while [[ $# -gt 0 ]]; do
  case $1 in
    --latest)   BACKUP_FILE="${BACKUP_DIR}/latest.sql.gz"; shift ;;
    --file)     BACKUP_FILE="$2"; shift 2 ;;
    --list)     ACTION="list"; shift ;;
    --verify)   ACTION="verify"; BACKUP_FILE="$2"; shift 2 ;;
    --target)   TARGET="$2"; shift 2 ;;
    --dry-run)  DRY_RUN=true; shift ;;
    --help|-h)  usage ;;
    *)          echo "Unknown option: $1"; usage ;;
  esac
done

# ─── List Backups ────────────────────────────────────────
if [ "$ACTION" = "list" ]; then
  echo "╔═══════════════════════════════════════════╗"
  echo "║        Available Backups                  ║"
  echo "╠═══════════════════════════════════════════╣"
  echo ""
  echo "── Daily ──"
  ls -lhS "${BACKUP_DIR}/daily/"*.gz 2>/dev/null | awk '{print "  " $5 "\t" $6 " " $7 "\t" $9}' || echo "  (none)"
  echo ""
  echo "── Weekly ──"
  ls -lhS "${BACKUP_DIR}/weekly/"*.gz 2>/dev/null | awk '{print "  " $5 "\t" $6 " " $7 "\t" $9}' || echo "  (none)"
  echo ""

  # Show backup history from DB
  echo "── Recent History ──"
  sudo -u postgres psql -d "$LOCAL_DB" -c \
    "SELECT backup_type, status, tables_count, rows_total, pg_size_pretty(file_size::bigint) as size, duration_sec||'s' as duration, created_at::date
     FROM _backup_history ORDER BY created_at DESC LIMIT 10;" 2>/dev/null || echo "  (no history table)"
  exit 0
fi

# ─── Verify Backup ───────────────────────────────────────
if [ "$ACTION" = "verify" ]; then
  if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ File not found: $BACKUP_FILE"
    exit 1
  fi

  echo "🔍 Verifying: ${BACKUP_FILE}"
  SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  echo "  Size: ${SIZE}"

  # Check checksum if exists
  if [ -f "${BACKUP_FILE}.sha256" ]; then
    if sha256sum -c "${BACKUP_FILE}.sha256" --quiet 2>/dev/null; then
      echo "  ✅ Checksum verified"
    else
      echo "  ❌ Checksum MISMATCH"
      exit 1
    fi
  fi

  # Check content
  TABLE_COUNT=$(gunzip -c "$BACKUP_FILE" | grep -c "CREATE TABLE" || echo 0)
  COPY_COUNT=$(gunzip -c "$BACKUP_FILE" | grep -c "^COPY public\." || echo 0)
  echo "  Tables: ${TABLE_COUNT}"
  echo "  Data segments: ${COPY_COUNT}"

  if [ "$TABLE_COUNT" -gt 0 ] && [ "$COPY_COUNT" -gt 0 ]; then
    echo "  ✅ Backup appears valid"
  else
    echo "  ⚠️  Backup may be incomplete"
  fi
  exit 0
fi

# ─── Restore ─────────────────────────────────────────────
[ -z "$BACKUP_FILE" ] && BACKUP_FILE="${BACKUP_DIR}/latest.sql.gz"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "❌ Backup file not found: ${BACKUP_FILE}"
  echo "Run: $0 --list"
  exit 1
fi

echo "╔═══════════════════════════════════════════╗"
echo "║        Database Restore                   ║"
echo "╠═══════════════════════════════════════════╣"
echo "  Source: ${BACKUP_FILE}"
echo "  Target: ${TARGET}"
echo "  Size:   $(du -h "$BACKUP_FILE" | cut -f1)"

if [ "$TARGET" = "cloud" ]; then
  echo ""
  echo "  ⚠️  WARNING: This will OVERWRITE data in Lovable Cloud!"
  echo "  ⚠️  This is a DESTRUCTIVE operation!"
  if [ "$DRY_RUN" = false ]; then
    read -p "  Type 'CONFIRM' to proceed: " CONFIRM
    if [ "$CONFIRM" != "CONFIRM" ]; then
      echo "  Aborted."
      exit 0
    fi
  fi
fi

if [ "$DRY_RUN" = true ]; then
  echo ""
  echo "  [DRY RUN] Would restore ${BACKUP_FILE} to ${TARGET}"
  exit 0
fi

echo ""
echo "🔄 Restoring..."

if [ "$TARGET" = "local" ]; then
  # Restore to local database
  sudo -u postgres psql -d "$LOCAL_DB" -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;" 2>/dev/null
  sudo -u postgres psql -d "$LOCAL_DB" -c "GRANT ALL ON SCHEMA public TO ${LOCAL_USER};" 2>/dev/null

  if gunzip -c "$BACKUP_FILE" | sudo -u postgres psql -d "$LOCAL_DB" -q 2>/dev/null; then
    TABLES=$(sudo -u postgres psql -d "$LOCAL_DB" -t -A -c \
      "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';")
    echo "✅ Restore complete: ${TABLES} tables restored to local DB"
  else
    echo "❌ Restore failed!"
    exit 1
  fi

elif [ "$TARGET" = "cloud" ]; then
  REMOTE_DB_URL="${SUPABASE_DB_URL:-}"
  if [ -z "$REMOTE_DB_URL" ]; then
    echo "❌ SUPABASE_DB_URL not set"
    exit 1
  fi

  if gunzip -c "$BACKUP_FILE" | psql "$REMOTE_DB_URL" -q 2>/dev/null; then
    echo "✅ Restore to Lovable Cloud complete"
  else
    echo "❌ Cloud restore failed!"
    exit 1
  fi
fi
