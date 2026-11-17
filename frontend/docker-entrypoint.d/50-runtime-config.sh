#!/bin/sh
# Dijalankan otomatis oleh entrypoint image nginx (semua file *.sh di
# /docker-entrypoint.d/ dieksekusi berurutan saat container start).
#
# Tujuan: konfigurasi runtime tanpa rebuild image. Cukup ubah .env:
#   VITE_API_URL=https://aws86.online
# lalu `docker compose up -d` — file config.js ditulis ulang.
set -e

TARGET=/usr/share/nginx/html/config.js
API_URL="${VITE_API_URL:-}"

# Escape karakter yang berbahaya di dalam string JS.
escape_js() {
  printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g'
}

cat > "$TARGET" <<EOF
/* Dibuat otomatis oleh 50-runtime-config.sh — jangan diedit manual. */
window.__HDVC_CONFIG__ = {
  apiUrl: "$(escape_js "$API_URL")"
};
EOF

echo "[frontend] runtime config: apiUrl='${API_URL:-<same-origin>}'"