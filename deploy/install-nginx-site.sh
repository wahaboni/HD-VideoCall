#!/usr/bin/env bash
# Pasang vhost nginx host agar aws86.online menunjuk ke stack Docker.
#
#   sudo bash deploy/install-nginx-site.sh
#
# PERHATIAN: aws86.online saat ini melayani app lain (my-react-app).
# Script ini MEMBACKUP konfigurasi lama lalu menonaktifkannya; tidak menghapus
# file apa pun. Rollback: sudo bash deploy/rollback-nginx.sh
set -euo pipefail

DOMAIN="${DOMAIN:-aws86.online}"
PORT="${FRONTEND_PORT:-8080}"
TEMPLATE="${TEMPLATE:-$(dirname "$0")/nginx-site.conf.template}"
TARGET="/etc/nginx/sites-available/hdvc"
LINK="/etc/nginx/sites-enabled/hdvc"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="/root/hdvc-nginx-backup-$STAMP"

say()  { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
ok()   { printf '  \033[32m✓\033[0m %s\n' "$*"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$*"; }
die()  { printf '\n\033[1;31mGAGAL: %s\033[0m\n' "$*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "jalankan sebagai root: sudo bash $0"
command -v nginx >/dev/null || die "nginx tidak terpasang"
[ -f "$TEMPLATE" ] || die "template tidak ditemukan: $TEMPLATE"

say "1/6 Cek sertifikat"
CERT="/etc/letsencrypt/live/$DOMAIN/fullchain.pem"
if [ -f "$CERT" ]; then
  ok "sertifikat ada: $CERT ($(openssl x509 -noout -enddate -in "$CERT" | cut -d= -f2))"
else
  warn "sertifikat belum ada untuk $DOMAIN"
  echo "  Jalankan dulu: sudo certbot certonly --webroot -w /var/www/certbot -d $DOMAIN -d www.$DOMAIN"
  die "berhenti sebelum mengubah nginx (biar app lama tetap hidup)"
fi

say "2/6 Backup konfigurasi nginx yang ada"
mkdir -p "$BACKUP_DIR"
cp -a /etc/nginx/sites-available "$BACKUP_DIR/sites-available"
[ -d /etc/nginx/sites-enabled ] && cp -a /etc/nginx/sites-enabled "$BACKUP_DIR/sites-enabled"
nginx -T > "$BACKUP_DIR/nginx-T.txt" 2>/dev/null || true
ok "backup: $BACKUP_DIR"

# Catat vhost mana yang saat ini memegang $DOMAIN, supaya rollback presisi.
# -R wajib: isi /etc/nginx/sites-enabled/ adalah symlink, dan `grep -r`
# melewati symlink sehingga vhost lama tidak terdeteksi.
grep -Rl "server_name.*\b$DOMAIN\b" /etc/nginx/sites-enabled/ 2>/dev/null \
  > "$BACKUP_DIR/previous-sites.txt" || true
if [ -s "$BACKUP_DIR/previous-sites.txt" ]; then
  warn "vhost lama untuk $DOMAIN:"
  sed 's/^/    /' "$BACKUP_DIR/previous-sites.txt"
else
  warn "tidak ada vhost lama terdeteksi untuk $DOMAIN (mungkin default_server)"
fi

say "3/6 Tulis vhost baru"
sed -e "s|__DOMAIN__|$DOMAIN|g" -e "s|__PORT__|$PORT|g" "$TEMPLATE" > "$TARGET"
ln -sfn "$TARGET" "$LINK"
chmod 644 "$TARGET"
ok "$TARGET"

say "4/6 Nonaktifkan vhost lama untuk domain yang sama"
# PENTING: nginx memakai glob `include sites-enabled/*`, dan glob itu cocok
# dengan SEMUA nama termasuk `*.disabled`. Jadi file harus DIPINDAHKAN keluar
# dari sites-enabled, bukan hanya di-rename.
: > "$BACKUP_DIR/disabled-sites.txt"
if [ -s "$BACKUP_DIR/previous-sites.txt" ]; then
  while IFS= read -r old; do
    [ "$(readlink -f "$old")" = "$(readlink -f "$TARGET")" ] && continue
    name="$(basename "$old")"
    dest="/etc/nginx/sites-available/$name.disabled"

    # Simpan path asli supaya rollback bisa membuat symlink-nya lagi.
    printf '%s\n' "$old" >> "$BACKUP_DIR/disabled-sites.txt"

    if [ -L "$old" ]; then
      target_file="$(readlink -f "$old")"
      mv "$target_file" "$dest"   # file asli disimpan, isi tidak diubah
      rm -f "$old"
    else
      mv "$old" "$dest"
    fi
    ok "dinonaktifkan: $name -> $dest (isi file utuh)"
  done < "$BACKUP_DIR/previous-sites.txt"
else
  ok "tidak ada yang perlu dinonaktifkan"
fi

say "5/6 Uji konfigurasi"
restore_previous() {
  # Kembalikan vhost yang tadi dinonaktifkan.
  if [ -s "$BACKUP_DIR/disabled-sites.txt" ]; then
    while IFS= read -r orig; do
      name="$(basename "$orig")"
      [ -f "/etc/nginx/sites-available/$name.disabled" ] &&
        mv "/etc/nginx/sites-available/$name.disabled" "/etc/nginx/sites-available/$name"
      ln -sfn "/etc/nginx/sites-available/$name" "$orig"
    done < "$BACKUP_DIR/disabled-sites.txt"
  fi
  rm -f "$LINK" "$TARGET"
}

if ! nginx -t 2>&1 | tail -3; then
  warn "nginx -t gagal — mengembalikan konfigurasi lama"
  restore_previous
  nginx -t || die "konfigurasi lama pun gagal — periksa manual"
  die "dibatalkan, konfigurasi lama dipulihkan"
fi
ok "nginx -t lolos"

# Konflik server_name berarti vhost lama masih aktif dan akan "mencuri"
# domain ini (nginx memakai yang pertama dimuat, sisanya di-ignore).
if nginx -T 2>&1 | grep -q "[Cc]onflicting server name"; then
  warn "masih ada 'conflicting server name' — vhost lama belum nonaktif:"
  nginx -T 2>&1 | grep "[Cc]onflicting server name" | sed 's/^/    /'
  warn "mengembalikan konfigurasi lama"
  restore_previous
  nginx -t >/dev/null && systemctl reload nginx
  die "berhenti; cek 'sites-enabled' untuk vhost lain yang memakai domain ini"
fi

say "6/6 Reload nginx"
systemctl reload nginx
ok "nginx reloaded"

say "Verifikasi lalu lintas"
# Pastikan domain benar-benar dilayani stack ini, bukan app lain.
if curl -s -k --max-time 10 -H "Host: $DOMAIN" "https://127.0.0.1/" | grep -q "HD Video Call"; then
  ok "https://$DOMAIN/ -> app HD Video Call"
else
  warn "domain belum mengarah ke app ini — cek 'nginx -T' untuk vhost lain"
fi

cat <<EOF

Selesai. Uji dari mesin lokal:

  curl -sI https://$DOMAIN/ | head -3
  curl -s https://$DOMAIN/healthz
  curl -s "https://$DOMAIN/api/token?room=cek&username=Tamu" | head -c 120

Rollback ke app lama:

  sudo bash $(dirname "$0")/rollback-nginx.sh $BACKUP_DIR

EOF