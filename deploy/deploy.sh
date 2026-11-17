#!/usr/bin/env bash
# Deploy stack HD Video Call di VPS.
#
#   sudo bash deploy/deploy.sh
#
# Aman diulang (idempotent):
#   - .env dibuat sekali; kalau sudah ada, kredensial TIDAK ditimpa
#   - tidak ada file yang dihapus; semua backup diberi timestamp
#   - port 8080 dipakai, jadi nginx host tetap memegang 80/443 (SSL tetap jalan)
#
# Flag:
#   DRY_RUN=1   tampilkan rencana, tidak mengubah apa pun
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/hdvc}"
DOMAIN="${DOMAIN:-aws86.online}"
FRONTEND_PORT="${FRONTEND_PORT:-8080}"
UDP_RANGE="${UDP_RANGE:-50000-50040}"
DRY_RUN="${DRY_RUN:-0}"
STAMP="$(date +%Y%m%d-%H%M%S)"

say()  { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
ok()   { printf '  \033[32m✓\033[0m %s\n' "$*"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$*"; }
die()  { printf '\n\033[1;31mGAGAL: %s\033[0m\n' "$*" >&2; exit 1; }
run()  { if [ "$DRY_RUN" = "1" ]; then echo "  [dry-run] $*"; else "$@"; fi; }

# ------------------------------------------------------------------ preflight
say "Pemeriksaan awal"
if [ "$DRY_RUN" != "1" ] && [ "${ALLOW_NONROOT:-0}" != "1" ] && [ "$(id -u)" -ne 0 ]; then
  die "jalankan sebagai root: sudo bash deploy/deploy.sh"
fi
command -v docker >/dev/null || die "docker tidak ditemukan"
docker compose version >/dev/null 2>&1 || die "plugin 'docker compose' tidak ada"
[ -f "$APP_DIR/docker-compose.yml" ] || die "docker-compose.yml tidak ada di $APP_DIR (sudah rsync?)"
[ -f "$APP_DIR/livekit/livekit.yaml" ] || die "livekit/livekit.yaml tidak ada di $APP_DIR"
ok "docker $(docker --version | cut -d' ' -f3 | tr -d ,)"
ok "compose $(docker compose version --short)"
ok "RAM total: $(free -m | awk '/^Mem:/{print $2}') MB, beban: $(free -m | awk '/^Mem:/{print $3}') MB"
ok "disk bebas: $(df -h "$APP_DIR" | awk 'NR==2{print $4}')"

if ss -lntH 2>/dev/null | grep -q ":$FRONTEND_PORT "; then
  die "port $FRONTEND_PORT sudah dipakai proses lain (cek: ss -lntp | grep :$FRONTEND_PORT)"
fi
ok "port $FRONTEND_PORT bebas"

# ------------------------------------------------------------------ konfigurasi
say "Konfigurasi .env"
cd "$APP_DIR"

if [ -f .env ]; then
  warn ".env sudah ada — kredensial dipertahankan"
  # Pastikan nilai non-rahasia ikut kondisi production terbaru.
  run sed -i "s|^DOMAIN=.*|DOMAIN=$DOMAIN|"                              .env
  run sed -i "s|^FRONTEND_PORT=.*|FRONTEND_PORT=$FRONTEND_PORT|"         .env
  run sed -i "s|^LIVEKIT_WS_URL=.*|LIVEKIT_WS_URL=wss://$DOMAIN/livekit|" .env
  run sed -i "s|^VITE_API_URL=.*|VITE_API_URL=https://$DOMAIN|"          .env
  run sed -i "s|^CORS_ORIGIN=.*|CORS_ORIGIN=https://$DOMAIN|"            .env
else
  API_KEY="$(openssl rand -hex 16)"
  API_SECRET="$(openssl rand -hex 32)"   # LiveKit menolak < 32 char (warning)
  if [ "$DRY_RUN" = "1" ]; then
    echo "  [dry-run] tulis .env baru dengan kredensial acak"
  else
    umask 077
    cat > .env <<EOF
# Dibuat otomatis oleh deploy.sh pada $STAMP — JANGAN di-commit.
DOMAIN=$DOMAIN
LIVEKIT_API_KEY=$API_KEY
LIVEKIT_API_SECRET=$API_SECRET
LIVEKIT_WS_URL=wss://$DOMAIN/livekit
VITE_API_URL=https://$DOMAIN
CORS_ORIGIN=https://$DOMAIN
TOKEN_TTL=6h
FRONTEND_PORT=$FRONTEND_PORT
LIVEKIT_UDP_RANGE=$UDP_RANGE
LIVEKIT_TCP_PORT=7881
EOF
    umask 022
    ok ".env dibuat (kredensial acak, permission 600)"
  fi
fi
[ "$DRY_RUN" = "1" ] || ok "DOMAIN=$DOMAIN  FRONTEND_PORT=$FRONTEND_PORT  WS=wss://$DOMAIN/livekit"

# ------------------------------------------------------------------ compose
say "Build & jalankan stack"
run docker compose --project-directory "$APP_DIR" up -d --build

if [ "$DRY_RUN" != "1" ]; then
  say "Menunggu container sehat (maks 120s)"
  for i in $(seq 1 40); do
    unhealthy="$(docker compose --project-directory "$APP_DIR" ps --format '{{.Name}} {{.Status}}' | grep -v 'healthy' || true)"
    [ -z "$unhealthy" ] && break
    sleep 3
  done
  docker compose --project-directory "$APP_DIR" ps --format 'table {{.Name}}\t{{.Status}}'
  echo "$unhealthy" | grep -q . && die "ada container belum sehat (lihat: docker compose logs <service>)"

  say "Verifikasi lokal (lewat nginx container)"
  code="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$FRONTEND_PORT/")"
  [ "$code" = "200" ] && ok "GET / -> 200" || die "GET / -> $code"
  curl -s "http://127.0.0.1:$FRONTEND_PORT/healthz" | grep -q '"ok":true' && ok "/healthz ok" || die "/healthz gagal"
  curl -s "http://127.0.0.1:$FRONTEND_PORT/config.js" | grep -q "https://$DOMAIN" && ok "/config.js berisi https://$DOMAIN" || warn "/config.js belum sesuai"
  ws="$(curl -s "http://127.0.0.1:$FRONTEND_PORT/api/token?room=cek&username=Deploy" | sed -n 's/.*"wsUrl":"\([^"]*\)".*/\1/p')"
  [ "$ws" = "wss://$DOMAIN/livekit" ] && ok "wsUrl token -> $ws" || warn "wsUrl token: '$ws'"
fi

# ------------------------------------------------------------------ firewall
say "Firewall (ufw)"
if command -v ufw >/dev/null; then
  if ufw status 2>/dev/null | grep -q "Status: active"; then
    run ufw allow 80/tcp    >/dev/null 2>&1 || true
    run ufw allow 443/tcp   >/dev/null 2>&1 || true
    run ufw allow 7881/tcp  >/dev/null 2>&1 || true
    run ufw allow "${UDP_RANGE}/udp" >/dev/null 2>&1 || true
    ok "aturan ufw ditambahkan (80, 443, 7881/tcp, $UDP_RANGE/udp)"
  else
    warn "ufw tidak aktif — pastikan firewall/cloud Security Group membuka 80, 443, 7881/tcp, $UDP_RANGE/udp"
  fi
else
  warn "ufw tidak ada — pastikan 80, 443, 7881/tcp, $UDP_RANGE/udp terbuka"
fi

say "Selesai (tahap aplikasi)"
cat <<EOF

Stack jalan di 127.0.0.1:$FRONTEND_PORT (belum publik).
Langkah berikutnya — arahkan domain ke stack ini:

  sudo bash $APP_DIR/deploy/install-nginx-site.sh

Lalu dari mesin lain:

  bash deploy/verify.sh

EOF