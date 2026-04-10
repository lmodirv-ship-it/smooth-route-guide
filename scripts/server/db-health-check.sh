#!/bin/bash
#═══════════════════════════════════════════════════════════════
# HN-Driver — Database Health Check
# Verifies local mirror integrity, compares with cloud,
# and reports issues
#═══════════════════════════════════════════════════════════════
set -euo pipefail

ENV_FILE="/etc/hn-driver-backup.env"
[ -f "$ENV_FILE" ] && source "$ENV_FILE"

REMOTE_DB_URL="${SUPABASE_DB_URL:-}"
LOCAL_DB="${LOCAL_DB_NAME:-hn_driver}"
LOG_DIR="${BACKUP_DIR:-/var/backups/hn-driver}/logs"
LOG_FILE="${LOG_DIR}/health.log"
DATE_STR=$(date +"%Y-%m-%d %H:%M:%S")
REPORT_FILE="${LOG_DIR}/health-report-$(date +%Y%m%d).json"

mkdir -p "$LOG_DIR"

log() { echo "[${DATE_STR}] $1" | tee -a "$LOG_FILE"; }

CHECKS_PASS=0
CHECKS_WARN=0
CHECKS_FAIL=0

check_pass() { CHECKS_PASS=$((CHECKS_PASS+1)); log "✅ $1"; }
check_warn() { CHECKS_WARN=$((CHECKS_WARN+1)); log "⚠️  $1"; }
check_fail() { CHECKS_FAIL=$((CHECKS_FAIL+1)); log "❌ $1"; }

log "═══ Database Health Check ═══"

# ─── 1. PostgreSQL Running ───────────────────────────────
if systemctl is-active --quiet postgresql; then
  check_pass "PostgreSQL service is running"
else
  check_fail "PostgreSQL service is NOT running"
  systemctl start postgresql 2>/dev/null && log "  → Auto-started PostgreSQL" || true
fi

# ─── 2. Local Database Exists ────────────────────────────
if sudo -u postgres psql -lqt | cut -d\| -f1 | grep -qw "$LOCAL_DB"; then
  check_pass "Local database '${LOCAL_DB}' exists"
else
  check_fail "Local database '${LOCAL_DB}' NOT found"
fi

# ─── 3. Disk Space ──────────────────────────────────────
DISK_USAGE=$(df /var/backups --output=pcent 2>/dev/null | tail -1 | tr -d ' %')
if [ -n "$DISK_USAGE" ]; then
  if [ "$DISK_USAGE" -lt 80 ]; then
    check_pass "Disk space OK (${DISK_USAGE}% used)"
  elif [ "$DISK_USAGE" -lt 90 ]; then
    check_warn "Disk space getting low (${DISK_USAGE}% used)"
  else
    check_fail "Disk space CRITICAL (${DISK_USAGE}% used)"
  fi
fi

# ─── 4. Backup Recency ──────────────────────────────────
LATEST_BACKUP="${BACKUP_DIR:-/var/backups/hn-driver}/latest.sql.gz"
if [ -f "$LATEST_BACKUP" ]; then
  BACKUP_AGE_H=$(( ($(date +%s) - $(stat -c %Y "$LATEST_BACKUP")) / 3600 ))
  if [ "$BACKUP_AGE_H" -lt 25 ]; then
    check_pass "Latest backup is ${BACKUP_AGE_H}h old"
  elif [ "$BACKUP_AGE_H" -lt 48 ]; then
    check_warn "Latest backup is ${BACKUP_AGE_H}h old (>24h)"
  else
    check_fail "Latest backup is ${BACKUP_AGE_H}h old (>48h) — STALE"
  fi
  BACKUP_SIZE=$(du -h "$LATEST_BACKUP" | cut -f1)
  log "  Backup size: ${BACKUP_SIZE}"
else
  check_fail "No backup file found"
fi

# ─── 5. Compare Table Counts (Cloud vs Local) ───────────
if [ -n "$REMOTE_DB_URL" ]; then
  REMOTE_TABLES=$(psql "$REMOTE_DB_URL" -t -A -c \
    "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';" 2>/dev/null || echo "?")
  LOCAL_TABLES=$(sudo -u postgres psql -d "$LOCAL_DB" -t -A -c \
    "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';" 2>/dev/null || echo "?")

  # Subtract local meta tables
  if [ "$LOCAL_TABLES" != "?" ]; then
    META_COUNT=$(sudo -u postgres psql -d "$LOCAL_DB" -t -A -c \
      "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE '\_%';" 2>/dev/null || echo "0")
    LOCAL_TABLES=$((LOCAL_TABLES - META_COUNT))
  fi

  if [ "$REMOTE_TABLES" = "$LOCAL_TABLES" ]; then
    check_pass "Table count matches: Cloud=${REMOTE_TABLES}, Local=${LOCAL_TABLES}"
  else
    check_warn "Table count mismatch: Cloud=${REMOTE_TABLES}, Local=${LOCAL_TABLES}"
  fi

  # ─── 6. Compare Row Counts for Key Tables ──────────────
  KEY_TABLES="profiles drivers trips delivery_orders stores wallet"
  for T in $KEY_TABLES; do
    R_COUNT=$(psql "$REMOTE_DB_URL" -t -A -c "SELECT count(*) FROM public.\"${T}\";" 2>/dev/null || echo "?")
    L_COUNT=$(sudo -u postgres psql -d "$LOCAL_DB" -t -A -c "SELECT count(*) FROM public.\"${T}\";" 2>/dev/null || echo "?")
    if [ "$R_COUNT" = "?" ] || [ "$L_COUNT" = "?" ]; then
      continue
    fi
    DIFF=$((R_COUNT - L_COUNT))
    if [ "$DIFF" -eq 0 ]; then
      log "  📊 ${T}: =${R_COUNT}"
    elif [ "$DIFF" -lt 10 ]; then
      log "  📊 ${T}: Cloud=${R_COUNT} Local=${L_COUNT} (Δ${DIFF})"
    else
      check_warn "${T}: significant drift Cloud=${R_COUNT} vs Local=${L_COUNT}"
    fi
  done
fi

# ─── 7. Sync Status ─────────────────────────────────────
SYNC_STATUS=$(sudo -u postgres psql -d "$LOCAL_DB" -t -A -c \
  "SELECT value FROM _sync_meta WHERE key='sync_status';" 2>/dev/null || echo "unknown")
LAST_SYNC=$(sudo -u postgres psql -d "$LOCAL_DB" -t -A -c \
  "SELECT value FROM _sync_meta WHERE key='last_sync';" 2>/dev/null || echo "never")

if [ "$SYNC_STATUS" = "synced" ]; then
  check_pass "Sync status: ${SYNC_STATUS} (last: ${LAST_SYNC})"
else
  check_warn "Sync status: ${SYNC_STATUS} (last: ${LAST_SYNC})"
fi

# ─── 8. Backup History ──────────────────────────────────
FAILED_RECENT=$(sudo -u postgres psql -d "$LOCAL_DB" -t -A -c \
  "SELECT count(*) FROM _backup_history WHERE status='failed' AND created_at > now()-interval '7 days';" 2>/dev/null || echo "0")
if [ "$FAILED_RECENT" -eq 0 ]; then
  check_pass "No failed backups in last 7 days"
else
  check_warn "${FAILED_RECENT} failed backups in last 7 days"
fi

# ─── 9. Connection Test ─────────────────────────────────
if [ -n "$REMOTE_DB_URL" ]; then
  CONN_START=$(date +%s%N)
  if psql "$REMOTE_DB_URL" -c "SELECT 1;" >/dev/null 2>&1; then
    CONN_END=$(date +%s%N)
    CONN_MS=$(( (CONN_END - CONN_START) / 1000000 ))
    if [ "$CONN_MS" -lt 2000 ]; then
      check_pass "Cloud connection OK (${CONN_MS}ms)"
    else
      check_warn "Cloud connection slow (${CONN_MS}ms)"
    fi
  else
    check_fail "Cannot connect to Lovable Cloud database"
  fi
fi

# ─── Generate Report ─────────────────────────────────────
TOTAL=$((CHECKS_PASS + CHECKS_WARN + CHECKS_FAIL))
SCORE=0
[ "$TOTAL" -gt 0 ] && SCORE=$(( (CHECKS_PASS * 100) / TOTAL ))

cat > "$REPORT_FILE" <<JSON
{
  "timestamp": "${DATE_STR}",
  "score": ${SCORE},
  "total": ${TOTAL},
  "pass": ${CHECKS_PASS},
  "warn": ${CHECKS_WARN},
  "fail": ${CHECKS_FAIL},
  "disk_usage": "${DISK_USAGE:-0}%",
  "sync_status": "${SYNC_STATUS}",
  "last_sync": "${LAST_SYNC}"
}
JSON

log "═══ Health Check Complete ═══"
log "  Score: ${SCORE}% | Pass: ${CHECKS_PASS} | Warn: ${CHECKS_WARN} | Fail: ${CHECKS_FAIL}"

# Update metadata
sudo -u postgres psql -d "$LOCAL_DB" -c \
  "UPDATE _sync_meta SET value='${DATE_STR}', updated_at=now() WHERE key='last_health_check';" 2>/dev/null || true

# Notify on failures
if [ "$CHECKS_FAIL" -gt 0 ] && [ -n "${NOTIFY_WEBHOOK:-}" ]; then
  curl -sf -X POST "$NOTIFY_WEBHOOK" \
    -H "Content-Type: application/json" \
    -d "{\"text\":\"⚠️ HN-Driver DB Health: ${CHECKS_FAIL} failures! Score: ${SCORE}%\"}" \
    2>/dev/null || true
fi
