#!/usr/bin/env bash
# Kembalikan konfigurasi nginx ke kondisi sebelum install-nginx-site.sh.
#
#   sudo bash deploy/rollback-nginx.sh /root/hdvc-nginx-backup-YYYYmmdd-HHMMSS
#
# Kalau argumen dikosongkan, dipakai backup terbaru di /root.
set -euo pipefail

say()  { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
ok()   { printf '  \033[32m✓\033[0m %s\n' "$*"; }
die()  { printf '\n\033[1;31mGAGAL: %s\033[0m\n' "$*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "jalankan sebagai root"
command -v nginx >/dev/null || die "nginx tidak terpasang"

BACKUP_DIR="${1:-}"
if [ -z "$BACKUP_DIR" ]; then
  BACKUP_DIR="$(ls -1dt /root/hdvc-nginx-backup-* 2>/dev/null | head -1 || true)"
fi
[ -n "$BACKUP_DIR" ] && [ -d "$BACKUP_DIR" ] || die "backup tidak ditemukan. Pakai: sudo bash $0 /root/hdvc-nginx-backup-XXXX"

say "Memulihkan dari $BACKUP_DIR"

rm -f /etc/nginx/sites-enabled/hdvc /etc/nginx/sites-available/hdvc

[ -d "$BACKUP_DIR/sites-available" ] && cp -a "$BACKUP_DIR/sites-available/." /etc/nginx/sites-available/
[ -d "$BACKUP_DIR/sites-enabled" ]   && cp -a "$BACKUP_DIR/sites-enabled/."   /etc/nginx/sites-enabled/
ok "file konfigurasi lama dipulihkan"

nginx -t || die "nginx -t gagal setelah restore — periksa manual"
systemctl reload nginx
ok "nginx reloaded"

cat <<EOF

Konfigurasi lama kembali aktif. Stack Docker masih jalan (tidak dihentikan).
Kalau ingin mematikannya:

  cd /opt/hdvc && docker compose down

EOF