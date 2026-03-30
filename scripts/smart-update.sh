#!/bin/bash
# ═══════════════════════════════════════════════════════════
# HN Driver — Smart Delta Update System v30.03.2026
# ═══════════════════════════════════════════════════════════
# Usage: bash scripts/smart-update.sh [options]
#
# Options:
#   --full        Force full rebuild of all modules
#   --patch       Generate patch ZIP with only changed files
#   --module=X    Rebuild only specific module (admin|driver-ride|driver-delivery|supervisor|callcenter|client)
#   --android     Also update Android native projects
#   --ios         Also update iOS native projects
#   --windows     Also update Windows/Electron projects
#   --all-native  Update all native platforms
#   --dry-run     Show what would change without building
# ═══════════════════════════════════════════════════════════

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PATCH_DIR="$PROJECT_DIR/patches"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
VERSION="30.03.2026"

# Parse arguments
FULL_BUILD=false
PATCH_ONLY=false
DRY_RUN=false
UPDATE_ANDROID=false
UPDATE_IOS=false
UPDATE_WINDOWS=false
SPECIFIC_MODULE=""

for arg in "$@"; do
  case $arg in
    --full) FULL_BUILD=true ;;
    --patch) PATCH_ONLY=true ;;
    --module=*) SPECIFIC_MODULE="${arg#*=}" ;;
    --android) UPDATE_ANDROID=true ;;
    --ios) UPDATE_IOS=true ;;
    --windows) UPDATE_WINDOWS=true ;;
    --all-native) UPDATE_ANDROID=true; UPDATE_IOS=true; UPDATE_WINDOWS=true ;;
    --dry-run) DRY_RUN=true ;;
  esac
done

echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  HN Driver — Smart Update System v${VERSION}${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"

# ─── Step 1: Detect changed files ───
echo -e "\n${BLUE}[1/5] Detecting changes...${NC}"

# Get list of changed files since last build
LAST_BUILD_HASH_FILE="$PROJECT_DIR/.last-build-hash"
CHANGED_FILES=""

if [ -f "$LAST_BUILD_HASH_FILE" ] && [ "$FULL_BUILD" = false ]; then
  LAST_HASH=$(cat "$LAST_BUILD_HASH_FILE")
  CHANGED_FILES=$(git diff --name-only "$LAST_HASH" HEAD 2>/dev/null || echo "ALL")
else
  CHANGED_FILES="ALL"
fi

if [ "$CHANGED_FILES" = "ALL" ]; then
  echo -e "${YELLOW}  ⚠ No previous build hash found — will detect by module${NC}"
fi

# ─── Step 2: Determine affected modules ───
echo -e "\n${BLUE}[2/5] Analyzing affected modules...${NC}"

declare -A MODULES
MODULES[admin]="src/admin/ admin.html vite.config.admin.ts"
MODULES[driver-ride]="src/driver-ride/ driver-ride.html vite.config.driver-ride.ts"
MODULES[driver-delivery]="src/driver-delivery/ driver-delivery.html vite.config.driver-delivery.ts"
MODULES[supervisor]="src/supervisor/ supervisor.html vite.config.supervisor.ts"
MODULES[callcenter]="src/call-center/ call-center.html vite.config.call-center.ts"
MODULES[client]="src/app/ src/pages/ src/components/ index.html vite.config.ts"

# Shared code affects all modules
SHARED_PATHS="src/integrations/ src/hooks/ src/lib/ src/i18n/ src/contexts/ src/index.css tailwind.config.ts"

REBUILD_MODULES=()

if [ -n "$SPECIFIC_MODULE" ]; then
  REBUILD_MODULES=("$SPECIFIC_MODULE")
  echo -e "  ${GREEN}✓ Manual selection: $SPECIFIC_MODULE${NC}"
elif [ "$FULL_BUILD" = true ]; then
  REBUILD_MODULES=(admin driver-ride driver-delivery supervisor callcenter client)
  echo -e "  ${GREEN}✓ Full rebuild requested${NC}"
elif [ "$CHANGED_FILES" = "ALL" ]; then
  # Check file modification times vs dist folders
  for module in admin driver-ride driver-delivery supervisor callcenter client; do
    dist_dir="dist-${module}"
    [ "$module" = "client" ] && dist_dir="dist"
    
    if [ ! -d "$PROJECT_DIR/$dist_dir" ]; then
      REBUILD_MODULES+=("$module")
      echo -e "  ${YELLOW}⚡ $module — no dist found, needs build${NC}"
      continue
    fi

    # Check if source is newer than dist
    src_paths="${MODULES[$module]}"
    needs_rebuild=false
    for src_path in $src_paths; do
      if [ -e "$PROJECT_DIR/$src_path" ]; then
        src_time=$(find "$PROJECT_DIR/$src_path" -type f -newer "$PROJECT_DIR/$dist_dir" 2>/dev/null | head -1)
        if [ -n "$src_time" ]; then
          needs_rebuild=true
          break
        fi
      fi
    done

    # Check shared paths
    if [ "$needs_rebuild" = false ]; then
      for shared in $SHARED_PATHS; do
        if [ -e "$PROJECT_DIR/$shared" ]; then
          src_time=$(find "$PROJECT_DIR/$shared" -type f -newer "$PROJECT_DIR/$dist_dir" 2>/dev/null | head -1)
          if [ -n "$src_time" ]; then
            needs_rebuild=true
            break
          fi
        fi
      done
    fi

    if [ "$needs_rebuild" = true ]; then
      REBUILD_MODULES+=("$module")
      echo -e "  ${YELLOW}⚡ $module — changes detected${NC}"
    else
      echo -e "  ${GREEN}✓ $module — up to date${NC}"
    fi
  done
else
  # Use git diff to determine modules
  shared_changed=false
  for shared in $SHARED_PATHS; do
    if echo "$CHANGED_FILES" | grep -q "^${shared}"; then
      shared_changed=true
      break
    fi
  done

  if [ "$shared_changed" = true ]; then
    REBUILD_MODULES=(admin driver-ride driver-delivery supervisor callcenter client)
    echo -e "  ${YELLOW}⚡ Shared code changed — all modules need rebuild${NC}"
  else
    for module in admin driver-ride driver-delivery supervisor callcenter client; do
      module_paths="${MODULES[$module]}"
      for mp in $module_paths; do
        if echo "$CHANGED_FILES" | grep -q "^${mp}"; then
          REBUILD_MODULES+=("$module")
          echo -e "  ${YELLOW}⚡ $module — changes detected${NC}"
          break
        fi
      done
    done
  fi
fi

if [ ${#REBUILD_MODULES[@]} -eq 0 ]; then
  echo -e "\n${GREEN}✅ All modules are up to date! No rebuild needed.${NC}"
  exit 0
fi

echo -e "\n  ${CYAN}Modules to rebuild: ${REBUILD_MODULES[*]}${NC}"

# ─── Dry run stops here ───
if [ "$DRY_RUN" = true ]; then
  echo -e "\n${YELLOW}[DRY RUN] Would rebuild: ${REBUILD_MODULES[*]}${NC}"
  [ "$UPDATE_ANDROID" = true ] && echo -e "${YELLOW}[DRY RUN] Would update Android projects${NC}"
  [ "$UPDATE_IOS" = true ] && echo -e "${YELLOW}[DRY RUN] Would update iOS projects${NC}"
  [ "$UPDATE_WINDOWS" = true ] && echo -e "${YELLOW}[DRY RUN] Would update Windows projects${NC}"
  exit 0
fi

# ─── Step 3: Build affected modules ───
echo -e "\n${BLUE}[3/5] Building affected modules...${NC}"

declare -A VITE_CONFIGS
VITE_CONFIGS[admin]="vite.config.admin.ts"
VITE_CONFIGS[driver-ride]="vite.config.driver-ride.ts"
VITE_CONFIGS[driver-delivery]="vite.config.driver-delivery.ts"
VITE_CONFIGS[supervisor]="vite.config.supervisor.ts"
VITE_CONFIGS[callcenter]="vite.config.call-center.ts"
VITE_CONFIGS[client]="vite.config.ts"

for module in "${REBUILD_MODULES[@]}"; do
  config="${VITE_CONFIGS[$module]}"
  if [ -z "$config" ]; then
    echo -e "  ${RED}✗ Unknown module: $module${NC}"
    continue
  fi

  echo -e "  ${CYAN}Building $module...${NC}"
  
  if [ "$module" = "client" ]; then
    npx vite build 2>&1 | tail -3
  else
    npx vite build --config "$config" 2>&1 | tail -3
  fi
  
  echo -e "  ${GREEN}✓ $module built successfully${NC}"
done

# ─── Step 4: Generate patch ZIP ───
echo -e "\n${BLUE}[4/5] Generating patch...${NC}"

mkdir -p "$PATCH_DIR"
PATCH_FILE="$PATCH_DIR/hn-patch-${TIMESTAMP}.zip"

# Collect all rebuilt dist files
PATCH_TEMP="$PATCH_DIR/temp-${TIMESTAMP}"
mkdir -p "$PATCH_TEMP"

for module in "${REBUILD_MODULES[@]}"; do
  dist_dir="dist-${module}"
  [ "$module" = "client" ] && dist_dir="dist"
  
  if [ -d "$PROJECT_DIR/$dist_dir" ]; then
    mkdir -p "$PATCH_TEMP/$dist_dir"
    cp -r "$PROJECT_DIR/$dist_dir/"* "$PATCH_TEMP/$dist_dir/"
  fi
done

# Add manifest
cat > "$PATCH_TEMP/PATCH_MANIFEST.json" << EOF
{
  "version": "$VERSION",
  "timestamp": "$TIMESTAMP",
  "modules_updated": [$(printf '"%s",' "${REBUILD_MODULES[@]}" | sed 's/,$//') ],
  "generated_by": "smart-update.sh",
  "apply_instructions": "Copy each dist-* folder to your server's web root"
}
EOF

cd "$PATCH_TEMP" && zip -r "$PATCH_FILE" . -q
rm -rf "$PATCH_TEMP"

echo -e "  ${GREEN}✓ Patch created: $PATCH_FILE${NC}"
echo -e "  ${CYAN}  Size: $(du -h "$PATCH_FILE" | cut -f1)${NC}"

# ─── Step 5: Update native platforms ───
echo -e "\n${BLUE}[5/5] Updating native platforms...${NC}"

update_native_web_assets() {
  local platform_dir="$1"
  local dist_dir="$2"
  local platform_name="$3"

  if [ ! -d "$platform_dir" ]; then
    echo -e "  ${YELLOW}⚠ $platform_name directory not found: $platform_dir${NC}"
    return
  fi

  # For Capacitor-based projects, copy web assets
  local www_dir="$platform_dir/app/src/main/assets/public"
  [ "$platform_name" = "iOS" ] && www_dir="$platform_dir/App/App/public"
  
  if [ -d "$www_dir" ]; then
    rm -rf "$www_dir"/*
    cp -r "$PROJECT_DIR/$dist_dir/"* "$www_dir/"
    echo -e "  ${GREEN}✓ $platform_name web assets updated${NC}"
  else
    echo -e "  ${YELLOW}⚠ $platform_name assets dir not found, creating...${NC}"
    mkdir -p "$www_dir"
    cp -r "$PROJECT_DIR/$dist_dir/"* "$www_dir/"
    echo -e "  ${GREEN}✓ $platform_name web assets created${NC}"
  fi
}

if [ "$UPDATE_ANDROID" = true ]; then
  echo -e "  ${CYAN}Updating Android projects...${NC}"
  for module in "${REBUILD_MODULES[@]}"; do
    dist_dir="dist-${module}"
    [ "$module" = "client" ] && dist_dir="dist"
    android_dir="$PROJECT_DIR/native-android/hn-${module}-native"
    [ "$module" = "client" ] && android_dir="$PROJECT_DIR/native-android/hn-client-native"
    update_native_web_assets "$android_dir" "$dist_dir" "Android ($module)"
  done
fi

if [ "$UPDATE_IOS" = true ]; then
  echo -e "  ${CYAN}Updating iOS project...${NC}"
  ios_dir="$PROJECT_DIR/native-ios/hn-ios"
  update_native_web_assets "$ios_dir" "dist" "iOS"
fi

if [ "$UPDATE_WINDOWS" = true ]; then
  echo -e "  ${CYAN}Updating Windows/Electron projects...${NC}"
  for module in "${REBUILD_MODULES[@]}"; do
    dist_dir="dist-${module}"
    [ "$module" = "client" ] && dist_dir="dist"
    electron_dir="$PROJECT_DIR/native-windows/hn-${module}-windows"
    [ "$module" = "client" ] && electron_dir="$PROJECT_DIR/native-windows/hn-client-windows"
    if [ -d "$electron_dir" ]; then
      mkdir -p "$electron_dir/dist"
      cp -r "$PROJECT_DIR/$dist_dir/"* "$electron_dir/dist/"
      echo -e "  ${GREEN}✓ Windows ($module) updated${NC}"
    fi
  done
fi

# Save current git hash
git rev-parse HEAD > "$LAST_BUILD_HASH_FILE" 2>/dev/null || true

echo -e "\n${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ Smart Update Complete!${NC}"
echo -e "${GREEN}  Modules updated: ${REBUILD_MODULES[*]}${NC}"
echo -e "${GREEN}  Patch file: patches/hn-patch-${TIMESTAMP}.zip${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
