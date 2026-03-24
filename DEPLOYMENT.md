# 🚀 HN Driver — Production Deployment Guide

## Overview

HN Driver consists of **two independent builds**:

| Build | Entry Point | Output | Target Domain |
|-------|------------|--------|---------------|
| Main App | `index.html` | `dist/` | `hndriver.com` |
| Admin Panel | `admin.html` | `dist-admin/` | `admin.hndriver.com` |

Both share the same Supabase backend (Lovable Cloud).

---

## 1. Build Commands

```bash
# Main application (customer, driver, delivery)
npx vite build

# Admin panel (standalone)
npx vite build --config vite.config.admin.ts
```

---

## 2. Environment Variables

Create a `.env` file (or set server environment variables):

```env
VITE_SUPABASE_URL=https://typamugwwatqmdkxkfof.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> These are **publishable** keys — safe to include in frontend builds.
> **Never** include `SUPABASE_SERVICE_ROLE_KEY` in frontend code.

---

## 3. Nginx Configuration

### Option A: Single Server — Multiple Subdomains

```nginx
# ─── Main App: hndriver.com ───
server {
    listen 80;
    server_name hndriver.com www.hndriver.com;

    root /var/www/hndriver/dist;
    index index.html;

    # SPA fallback — prevents 404 on page refresh
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2|woff|ttf)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;
    gzip_min_length 256;
}

# ─── Admin Panel: admin.hndriver.com ───
server {
    listen 80;
    server_name admin.hndriver.com;

    root /var/www/hndriver/dist-admin;
    index admin.html;

    # SPA fallback — MUST point to admin.html (not index.html)
    location / {
        try_files $uri $uri/ /admin.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2|woff|ttf)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;
    gzip_min_length 256;
}
```

### Option B: Call Center Subdomain (Optional)

The call center is already part of the admin build. To give agents a separate URL:

```nginx
# ─── Call Center: call.hndriver.com ───
server {
    listen 80;
    server_name call.hndriver.com;

    root /var/www/hndriver/dist-admin;
    index admin.html;

    # Redirect root to call center login
    location = / {
        return 302 /call-center/login;
    }

    location / {
        try_files $uri $uri/ /admin.html;
    }
}
```

---

## 4. SSL (HTTPS)

Use **Let's Encrypt** with Certbot:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d hndriver.com -d www.hndriver.com -d admin.hndriver.com
```

Certbot will auto-configure Nginx for HTTPS and set up renewal.

---

## 5. DNS Configuration

At your domain registrar, add these records:

| Type | Name | Value |
|------|------|-------|
| A | @ | `YOUR_SERVER_IP` |
| A | www | `YOUR_SERVER_IP` |
| A | admin | `YOUR_SERVER_IP` |
| A | call | `YOUR_SERVER_IP` (optional) |

---

## 6. Deployment Script

```bash
#!/bin/bash
# deploy.sh — Run on your server

set -e

PROJECT_DIR="/var/www/hndriver"
REPO_DIR="/home/deploy/hn-driver"

cd "$REPO_DIR"

# Pull latest code
git pull origin main

# Install dependencies
npm ci --production=false

# Build both apps
npx vite build
npx vite build --config vite.config.admin.ts

# Copy to web root
rsync -a --delete dist/ "$PROJECT_DIR/dist/"
rsync -a --delete dist-admin/ "$PROJECT_DIR/dist-admin/"

# Reload Nginx
sudo nginx -t && sudo systemctl reload nginx

echo "✅ Deployment complete!"
```

---

## 7. Security Checklist

- [x] No `service_role_key` in frontend code
- [x] All routes protected by `RequireRole` guard
- [x] RLS enabled on all database tables
- [x] Admin routes require `admin` role
- [x] Call center routes require `agent` or `admin` role
- [x] Driver routes require `driver` role
- [x] Customer routes require `user` role
- [x] JWT session validation via Supabase Auth
- [x] Input sanitization (OWASP) via `inputSecurity.ts`
- [x] Rate limiting on edge functions

---

## 8. Route Map

### Main App (`hndriver.com`)

| Path | Role | Page |
|------|------|------|
| `/` | Public | Landing Page |
| `/login` | Public | Auth Page |
| `/welcome` | Public | Welcome / Role Selection |
| `/customer` | user | Customer Hub |
| `/customer/ride` | user | Ride Booking |
| `/driver` | driver | Driver Dashboard |
| `/driver/tracking` | driver | GPS Tracking |
| `/delivery` | user | Delivery Home |
| `/delivery/restaurants` | user | Restaurant List |
| `/delivery/restaurant/:id` | user | Restaurant Menu |

### Admin Panel (`admin.hndriver.com`)

| Path | Role | Page |
|------|------|------|
| `/login` | Public | Admin Login |
| `/` | admin | Dashboard |
| `/users` | admin | Registered Users |
| `/drivers` | admin | Drivers Management |
| `/delivery` | admin | Delivery Orders |
| `/settings` | admin | Settings |
| `/call-center` | admin/agent | Call Center |

---

## 9. Performance Notes

- **PWA**: Service Worker enabled for offline caching
- **Gzip**: Configure in Nginx (see above)
- **Image Optimization**: Large hero images (~1.2MB) — consider converting to WebP
- **Code Splitting**: Single bundle (~1.8MB) — consider lazy loading routes for faster initial load

---

## 10. Monitoring

Recommended tools:
- **Uptime**: UptimeRobot or BetterUptime
- **Errors**: Sentry (add via edge function)
- **Analytics**: Plausible or Umami (privacy-friendly)

---

## 11. Lovable Publish (Alternative)

If you prefer not to self-host, you can publish directly from Lovable:
1. Click **Publish** in the top-right corner
2. Your app will be live at `smooth-route-guide.lovable.app`
3. Connect a custom domain in **Settings → Domains**
