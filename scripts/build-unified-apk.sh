#!/usr/bin/env bash
# ============================================================
# 🚀 HN Driver — Unified APK Build Script
# Builds ONE universal APK that serves all roles
# (client, driver, delivery, agent, store_owner, admin)
# ============================================================
set -euo pipefail

echo "🧹 Step 1/4 — Installing dependencies (frozen lockfile)..."
pnpm install --frozen-lockfile

echo "🏗️  Step 2/4 — Building web bundle (Vite)..."
pnpm build

echo "📱 Step 3/4 — Syncing to Android (Capacitor)..."
npx cap sync android

echo "🤖 Step 4/4 — Assembling release APK (Gradle)..."
cd android && ./gradlew assembleRelease

APK_PATH="app/build/outputs/apk/release/app-release-unsigned.apk"
if [ -f "$APK_PATH" ]; then
  SIZE=$(du -h "$APK_PATH" | cut -f1)
  echo ""
  echo "✅ DONE! Universal APK built successfully."
  echo "📦 Path: android/$APK_PATH"
  echo "📏 Size: $SIZE"
  echo ""
  echo "Next steps:"
  echo "  1. Sign it (Android Studio → Generate Signed Bundle/APK)"
  echo "  2. Copy to public/downloads/hn-driver-v1.2.apk"
  echo "  3. Update app_settings.latest_apk_version → '1.2' for OTA"
else
  echo "❌ APK not found at expected path"
  exit 1
fi
