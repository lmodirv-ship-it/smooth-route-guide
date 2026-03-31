#!/bin/bash
# ═══════════════════════════════════════════════════════════
# HN Driver — Production Nginx Optimization Config
# Copy this to /etc/nginx/conf.d/optimization.conf
# ═══════════════════════════════════════════════════════════

# ─── Connection Pooling & Workers ───
# Add to main nginx.conf:
# worker_processes auto;
# worker_rlimit_nofile 65535;
# events { worker_connections 16384; multi_accept on; use epoll; }

cat > /tmp/hn-driver-optimization.conf << 'CONF'
# ═══════════════════════════════════════════════════════════
# HN Driver — Nginx Performance Optimization
# Include in main nginx.conf: include /etc/nginx/conf.d/optimization.conf;
# ═══════════════════════════════════════════════════════════

# ─── Connection & Keepalive ───
keepalive_timeout 65;
keepalive_requests 1000;
client_max_body_size 20M;
client_body_timeout 30;
client_header_timeout 30;
send_timeout 30;

# ─── Gzip Compression ───
gzip on;
gzip_vary on;
gzip_proxied any;
gzip_comp_level 6;
gzip_min_length 256;
gzip_types
    text/plain
    text/css
    text/javascript
    application/json
    application/javascript
    application/x-javascript
    application/xml
    application/xml+rss
    image/svg+xml
    font/woff2;

# ─── Static Asset Caching ───
# JS/CSS with content hashes → 1 year
# Images → 30 days
# Fonts → 1 year

# ─── WebP Auto-Serve (if available) ───
# When browser supports WebP and .webp version exists, serve it
map $http_accept $webp_suffix {
    default "";
    "~*webp" ".webp";
}

# ─── Rate Limiting (API protection) ───
limit_req_zone $binary_remote_addr zone=api:10m rate=30r/s;
limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/m;

# ─── Open File Cache ───
open_file_cache max=10000 inactive=60s;
open_file_cache_valid 30s;
open_file_cache_min_uses 2;
open_file_cache_errors on;

# ─── Buffer Optimization ───
proxy_buffer_size 128k;
proxy_buffers 4 256k;
proxy_busy_buffers_size 256k;

# ─── Security Headers ───
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
CONF

echo "✅ Optimization config generated at /tmp/hn-driver-optimization.conf"
echo ""
echo "To apply:"
echo "  sudo cp /tmp/hn-driver-optimization.conf /etc/nginx/conf.d/optimization.conf"
echo "  sudo nginx -t && sudo systemctl reload nginx"
echo ""
echo "Also update /etc/nginx/nginx.conf top section:"
echo "  worker_processes auto;"
echo "  worker_rlimit_nofile 65535;"
echo "  events {"
echo "    worker_connections 16384;"
echo "    multi_accept on;"
echo "    use epoll;"
echo "  }"
echo ""
echo "For 20,000+ concurrent users also consider:"
echo "  - sysctl net.core.somaxconn = 65535"
echo "  - sysctl net.ipv4.tcp_max_syn_backlog = 65535"
echo "  - ulimit -n 65535"
