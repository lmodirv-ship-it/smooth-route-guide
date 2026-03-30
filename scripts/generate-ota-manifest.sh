#!/bin/bash
# ═══════════════════════════════════════════════════════════
# HN Driver — Generate OTA Manifest for each module
# Usage: bash scripts/generate-ota-manifest.sh
# Output: ota/ directory with manifest.json per module
# ═══════════════════════════════════════════════════════════

set -e

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
OTA_DIR="$PROJECT_DIR/ota"
VERSION="30.03.2026"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

mkdir -p "$OTA_DIR"

declare -A DIST_DIRS
DIST_DIRS[admin]="dist-admin"
DIST_DIRS[driver-ride]="dist-driver-ride"
DIST_DIRS[driver-delivery]="dist-driver-delivery"
DIST_DIRS[supervisor]="dist-supervisor"
DIST_DIRS[callcenter]="dist-call-center"
DIST_DIRS[client]="dist"

for module in "${!DIST_DIRS[@]}"; do
  dist="${DIST_DIRS[$module]}"
  dist_path="$PROJECT_DIR/$dist"
  
  if [ ! -d "$dist_path" ]; then
    echo "⚠ Skipping $module — $dist not found"
    continue
  fi

  module_ota="$OTA_DIR/$module"
  mkdir -p "$module_ota"

  # Generate file hashes
  echo "{" > "$module_ota/manifest.json"
  echo "  \"version\": \"$VERSION\"," >> "$module_ota/manifest.json"
  echo "  \"timestamp\": \"$TIMESTAMP\"," >> "$module_ota/manifest.json"
  echo "  \"module\": \"$module\"," >> "$module_ota/manifest.json"
  echo "  \"files\": {" >> "$module_ota/manifest.json"

  first=true
  total_size=0
  while IFS= read -r file; do
    rel_path="${file#$dist_path/}"
    hash=$(sha256sum "$file" | cut -d' ' -f1)
    size=$(stat -c%s "$file" 2>/dev/null || stat -f%z "$file" 2>/dev/null)
    total_size=$((total_size + size))

    if [ "$first" = true ]; then
      first=false
    else
      echo "," >> "$module_ota/manifest.json"
    fi
    printf "    \"%s\": { \"hash\": \"%s\", \"size\": %s }" "$rel_path" "$hash" "$size" >> "$module_ota/manifest.json"
  done < <(find "$dist_path" -type f)

  echo "" >> "$module_ota/manifest.json"
  echo "  }," >> "$module_ota/manifest.json"
  echo "  \"totalSize\": $total_size" >> "$module_ota/manifest.json"
  echo "}" >> "$module_ota/manifest.json"

  echo "✓ $module manifest generated ($(du -h "$module_ota/manifest.json" | cut -f1))"
done

echo ""
echo "✅ OTA manifests generated in: $OTA_DIR/"
