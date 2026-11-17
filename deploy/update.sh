#!/usr/bin/env bash
# Deploy ulang dari git (setelah `git pull`), tanpa menyentuh .env.
#
#   cd /opt/hdvc && sudo bash deploy/update.sh
#
# Aman:
#   - .env TIDAK pernah ditimpa
#   - image lama tetap ada sebagai rollback (docker image prune TIDAK dijalankan)
#   - kalau container gagal sehat, dicetak perintah rollback
set -euo pipefail

APP_DIR="${APP_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
FRONTEND_PORT="$(sed -n 's/^FRONTEND_PORT=//p' "$APP_DIR/.env" 2>/dev/null | head -1)"
FRONTEND_PORT="${FRONTEND_PORT:-8080}"

say()  { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
ok()   { printf '  \033[32m✓\033[0m %s\n' "$*"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$*"; }
die()  { printf '\n\033[1;31mGAGAL: %s\033[0m\n' "$*" >&2; exit 1; }

cd "$APP_DIR"
[ -f .env ] || die ".env tidak ada di $APP_DIR — jalankan deploy.sh dulu"

say "Versi saat ini"
git log -1 --oneline 2>/dev/null || warn "bukan git repo"
PREV_SHA="$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"

say "Build ulang & jalankan"
docker compose up -d --build

say "Menunggu sehat"
for _ in $(seq 1 40); do
  bad="$(docker compose ps --format '{{.Name}} {{.Status}}' | grep -v healthy || true)"
  [ -z "$bad" ] && break
  sleep 3
done
docker compose ps --format 'table {{.Name}}\t{{.Status}}'

if [ -n "$bad" ]; then
  echo
  warn "container belum sehat:"
  echo "$bad" | sed 's/^/    /'
  cat <<EOF

Rollback ke commit sebelumnya:

  cd $APP_DIR
  git checkout $PREV_SHA
  docker compose up -d --build
  git checkout -

EOF
  die "deploy gagal"
fi

code="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$FRONTEND_PORT/")"
[ "$code" = "200" ] && ok "GET / -> 200" || die "GET / -> $code"

curl -s "http://127.0.0.1:$FRONTEND_PORT/healthz" | grep -q '"ok":true' \
  && ok "/healthz ok" || die "/healthz gagal"

ok "selesai — commit $(git rev-parse --short HEAD 2>/dev/null || echo unknown)"