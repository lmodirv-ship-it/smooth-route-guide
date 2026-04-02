#!/usr/bin/env pwsh
# ═══════════════════════════════════════════════════════════
# HN Driver — One-Click Deploy Script (PowerShell)
# Usage: .\scripts\deploy.ps1 [-Module <name>] [-SkipBuild] [-SkipServer]
# ═══════════════════════════════════════════════════════════
param(
    [string]$Module = "all",
    [switch]$SkipBuild,
    [switch]$SkipServer,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$ProjectDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $ProjectDir

$ServerIP = "213.156.132.166"
$ServerUser = "root"
$ServerRepo = "/var/www/hn-driver"

# ─── Colors ───
function Write-Step($n, $total, $msg) { Write-Host "`n[$n/$total] $msg" -ForegroundColor Cyan }
function Write-Ok($msg) { Write-Host "  ✓ $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "  ⚠ $msg" -ForegroundColor Yellow }
function Write-Err($msg) { Write-Host "  ✗ $msg" -ForegroundColor Red }

$totalSteps = 6
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  HN Driver — One-Click Deploy" -ForegroundColor Cyan
Write-Host "  Module: $Module | SkipBuild: $SkipBuild | SkipServer: $SkipServer" -ForegroundColor DarkGray
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan

if ($DryRun) {
    Write-Warn "DRY RUN — no changes will be made"
}

# ─── Step 1: Git sync ───
Write-Step 1 $totalSteps "Syncing with GitHub..."
if (-not $DryRun) {
    git add -A
    $hasChanges = git status --porcelain
    if ($hasChanges) {
        $commitMsg = "update $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
        git commit -m $commitMsg
        Write-Ok "Committed: $commitMsg"
    } else {
        Write-Ok "No local changes"
    }
    git pull origin main --rebase 2>$null
    git push origin main
    Write-Ok "Pushed to GitHub"
} else {
    Write-Ok "[DRY] Would commit & push"
}

# ─── Step 2: Install dependencies ───
Write-Step 2 $totalSteps "Installing dependencies..."
if (-not $DryRun -and -not $SkipBuild) {
    npm install --legacy-peer-deps 2>&1 | Select-Object -Last 3
    Write-Ok "Dependencies installed"
} else {
    Write-Ok "Skipped"
}

# ─── Step 3: Build modules ───
Write-Step 3 $totalSteps "Building modules..."

$builds = @{
    "client"          = @{ config = ""; dist = "dist" }
    "admin"           = @{ config = "vite.config.admin.ts"; dist = "dist-admin" }
    "call-center"     = @{ config = "vite.config.call-center.ts"; dist = "dist-call-center" }
    "supervisor"      = @{ config = "vite.config.supervisor.ts"; dist = "dist-supervisor" }
    "driver-ride"     = @{ config = "vite.config.driver-ride.ts"; dist = "dist-driver-ride" }
    "driver-delivery" = @{ config = "vite.config.driver-delivery.ts"; dist = "dist-driver-delivery" }
}

if (-not $SkipBuild) {
    $modulesToBuild = if ($Module -eq "all") { $builds.Keys } else { @($Module) }

    foreach ($mod in $modulesToBuild) {
        if (-not $builds.ContainsKey($mod)) {
            Write-Err "Unknown module: $mod"
            continue
        }
        $cfg = $builds[$mod].config
        Write-Host "  Building $mod..." -ForegroundColor DarkCyan -NoNewline

        if ($DryRun) {
            Write-Host " [DRY]" -ForegroundColor Yellow
            continue
        }

        if ($cfg -eq "") {
            npx vite build 2>&1 | Select-Object -Last 2
        } else {
            npx vite build --config $cfg 2>&1 | Select-Object -Last 2
        }
        Write-Ok "$mod built"
    }
} else {
    Write-Ok "Build skipped"
}

# ─── Step 4: Commit dist files ───
Write-Step 4 $totalSteps "Committing build output..."
if (-not $DryRun -and -not $SkipBuild) {
    $distDirs = @("dist", "dist-admin", "dist-call-center", "dist-supervisor", "dist-driver-ride", "dist-driver-delivery")
    foreach ($d in $distDirs) {
        if (Test-Path $d) { git add $d -f 2>$null }
    }
    $hasDist = git status --porcelain
    if ($hasDist) {
        git commit -m "build: update dist $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
        git push origin main
        Write-Ok "Dist pushed to GitHub"
    } else {
        Write-Ok "No dist changes"
    }
} else {
    Write-Ok "Skipped"
}

# ─── Step 5: Deploy to server ───
Write-Step 5 $totalSteps "Deploying to server ($ServerIP)..."
if (-not $SkipServer -and -not $DryRun) {
    $sshCmd = @"
cd $ServerRepo && \
git fetch origin main && \
git reset --hard origin/main && \
rsync -a --delete dist/             /var/www/html/ && \
rsync -a --delete dist-admin/       /var/www/admin/ && \
rsync -a --delete dist-call-center/ /var/www/call-center/ 2>/dev/null; \
rsync -a --delete dist-supervisor/  /var/www/supervisor/  2>/dev/null; \
rsync -a --delete dist-driver-ride/ /var/www/driver-ride/ 2>/dev/null; \
rsync -a --delete dist-driver-delivery/ /var/www/driver-delivery/ 2>/dev/null; \
sudo nginx -t && sudo systemctl reload nginx && \
echo 'DEPLOY_OK'
"@
    $result = ssh "${ServerUser}@${ServerIP}" $sshCmd 2>&1
    if ($result -match "DEPLOY_OK") {
        Write-Ok "Server deployed & Nginx reloaded"
    } else {
        Write-Err "Server deploy may have issues:"
        Write-Host $result
    }
} elseif ($DryRun) {
    Write-Ok "[DRY] Would SSH and deploy"
} else {
    Write-Ok "Server deploy skipped"
}

# ─── Step 6: Verify ───
Write-Step 6 $totalSteps "Verifying deployment..."
$sites = @(
    @{ name = "Main Site";       url = "https://www.hn-driver.com" },
    @{ name = "Admin Panel";     url = "https://admin.hn-driver.com" },
    @{ name = "Call Center";     url = "https://call.hn-driver.com" },
    @{ name = "Supervisor";      url = "https://supervisor.hn-driver.com" }
)

foreach ($site in $sites) {
    try {
        $resp = Invoke-WebRequest -Uri $site.url -Method Head -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
        if ($resp.StatusCode -eq 200) {
            Write-Ok "$($site.name) → OK (200)"
        } else {
            Write-Warn "$($site.name) → $($resp.StatusCode)"
        }
    } catch {
        Write-Err "$($site.name) → FAILED: $($_.Exception.Message)"
    }
}

Write-Host "`n═══════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  ✅ Deploy complete!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Green
