# Admin Panel — Standalone Deployment Guide

## 1. Local Development

```bash
npm run dev:admin
```

Opens at `http://localhost:5174` using `admin.html` → `src/admin/main.tsx`.

Main app continues on `npm run dev` (port 5173).

---

## 2. Build

```bash
npm run build:admin
```

Output: `dist-admin/`

---

## 3. Environment Variables

Create `.env` (or `.env.production`) with:

```
VITE_SUPABASE_URL=https://typamugwwatqmdkxkfof.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon-key>
VITE_SUPABASE_PROJECT_ID=typamugwwatqmdkxkfof
```

Same values as the main app — both share one database.

---

## 4. Hosting: Static SPA

### Netlify (`dist-admin/netlify.toml`)

```toml
[[redirects]]
  from = "/*"
  to = "/admin.html"
  status = 200
```

### Vercel (`dist-admin/vercel.json`)

```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/admin.html" }] }
```

### Nginx

```nginx
server {
    listen 80;
    server_name admin.hndriver.com;
    root /var/www/admin;
    index admin.html;

    location / {
        try_files $uri $uri/ /admin.html;
    }

    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### Cloudflare Pages

- Build command: `npm run build:admin`
- Output directory: `dist-admin`
- Add `_redirects` file in `dist-admin/`:
  ```
  /* /admin.html 200
  ```

---

## 5. Custom Domain Setup

Point `admin.hndriver.com` DNS to your hosting provider.

If using Lovable custom domains, add it under Project Settings → Domains.

---

## 6. Architecture Summary

```
admin.hndriver.com  ←  dist-admin/admin.html
     │
     └── Same Supabase backend
              │
app.hndriver.com    ←  dist/index.html
```

Both read/write the same tables. No separate database needed.
