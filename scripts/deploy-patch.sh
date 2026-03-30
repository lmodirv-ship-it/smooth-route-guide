#!/bin/bash
# ═══════════════════════════════════════════════════════════
# HN Driver — Deploy Patch to Server
# Usage: bash scripts/deploy-patch.sh [patch-file] [server]
#
# This script uploads only the changed files to your server,
# instead of re-uploading the entire build.
# ═══════════════════════════════════════════════════════════

set -e

PATCH_FILE="${1:-$(ls -t patches/hn-patch-*.zip 2>/dev/null | head -1)}"
SERVER="${2:-your-server.com}"
REMOTE_DIR="/var/www/hn-driver"
SSH_USER="${3:-deploy}"

if [ -z "$PATCH_FILE" ] || [ ! -f "$PATCH_FILE" ]; then
  echo "❌ No patch file found. Run smart-update.sh first."
  echo "Usage: bash scripts/deploy-patch.sh [patch-file.zip] [server] [ssh-user]"
  exit 1
fi

echo "═══════════════════════════════════════════"
echo "  HN Driver — Deploying Patch"
echo "  Patch: $PATCH_FILE"
echo "  Server: $SERVER"
echo "═══════════════════════════════════════════"

# Upload patch
echo "📤 Uploading patch..."
scp "$PATCH_FILE" "${SSH_USER}@${SERVER}:/tmp/hn-patch.zip"

# Apply on server
echo "🔧 Applying patch on server..."
ssh "${SSH_USER}@${SERVER}" << 'REMOTE_SCRIPT'
  set -e
  cd /tmp
  unzip -o hn-patch.zip -d hn-patch-temp

  # Read manifest
  if [ -f hn-patch-temp/PATCH_MANIFEST.json ]; then
    echo "📋 Patch manifest:"
    cat hn-patch-temp/PATCH_MANIFEST.json
  fi

  # Copy each dist folder
  for dir in hn-patch-temp/dist*; do
    if [ -d "$dir" ]; then
      dirname=$(basename "$dir")
      target="/var/www/hn-driver/$dirname"
      
      if [ "$dirname" = "dist" ]; then
        target="/var/www/html"
      elif [ "$dirname" = "dist-admin" ]; then
        target="/var/www/admin"
      fi

      echo "  📁 Updating $dirname → $target"
      rsync -a --delete "$dir/" "$target/"
    fi
  done

  # Cleanup
  rm -rf hn-patch-temp hn-patch.zip

  # Reload nginx
  sudo nginx -t && sudo systemctl reload nginx
  echo "✅ Patch applied successfully!"
REMOTE_SCRIPT

echo ""
echo "✅ Deployment complete!"
