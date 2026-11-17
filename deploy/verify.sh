#!/usr/bin/env bash
# Verifikasi stack dari mesin lain (laptop), bukan dari VPS.
#
#   bash deploy/verify.sh
#   DOMAIN=aws86.online bash deploy/verify.sh
#
# Aman: hanya GET. Tidak mengubah apa pun di server.
set -uo pipefail

DOMAIN="${DOMAIN:-aws86.online}"
# BASE bisa dioverride untuk uji lokal: BASE=http://localhost:8080 bash deploy/verify.sh
BASE="${BASE:-https://$DOMAIN}"
FAIL=0

# Skema ws mengikuti skema HTTP: https -> wss, http -> ws.
case "$BASE" in
  https://*) WSS="${WSS:-wss://$DOMAIN/livekit}" ;;
  *)         WSS="${WSS:-ws://$DOMAIN/livekit}" ;;
esac

ok()   { printf '  \033[32m✓\033[0m %s\n' "$*"; }
bad()  { printf '  \033[31m✗\033[0m %s\n' "$*"; FAIL=$((FAIL+1)); }
warn() { printf '  \033[33m!\033[0m %s\n' "$*"; }
say()  { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }

say "HTTPS & sertifikat"
code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$BASE/")"
[ "$code" = "200" ] && ok "GET / -> 200" || bad "GET / -> $code"

if [ "${WSS%%:*}" = "wss" ]; then
  expiry="$(echo | timeout 12 openssl s_client -connect "$DOMAIN:443" -servername "$DOMAIN" 2>/dev/null \
    | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)"
  [ -n "$expiry" ] && ok "TLS valid sampai: $expiry" || bad "TLS tidak bisa dibaca"
else
  warn "mode HTTP lokal — cek TLS dilewati"
fi

say "Identitas aplikasi"
html="$(curl -s --max-time 10 "$BASE/")"
echo "$html" | grep -q "HD Video Call" && ok "index.html = app HD Video Call" || bad "index.html bukan app ini (masih app lama?)"
echo "$html" | grep -q '/config.js' && ok "runtime config dimuat" || warn "tag /config.js tidak ada di html"

say "Runtime config (dari .env di VPS)"
cfg="$(curl -s --max-time 10 "$BASE/config.js")"
if echo "$cfg" | grep -q "__HDVC_CONFIG__"; then
  apiUrl="$(printf '%s' "$cfg" | sed -n 's/.*apiUrl:[[:space:]]*"\([^"]*\)".*/\1/p')"
  if [ "$apiUrl" = "$BASE" ] || [ -z "$apiUrl" ]; then
    ok "apiUrl='${apiUrl:-<same-origin>}'"
  else
    warn "apiUrl='$apiUrl' (diharapkan '$BASE' atau kosong)"
  fi
else
  bad "/config.js tidak valid — nginx belum memakai image baru"
fi

say "Token server"
tok="$(curl -s --max-time 10 "$BASE/api/token?room=cek&username=Verifier")"
echo "$tok" | grep -q '"token"' && ok "token dibuat" || bad "token gagal: $(printf '%s' "$tok" | head -c 120)"
ws="$(printf '%s' "$tok" | sed -n 's/.*"wsUrl":"\([^"]*\)".*/\1/p')"
[ "$ws" = "$WSS" ] && ok "wsUrl -> $ws" || bad "wsUrl -> '${ws:-<kosong>}' (harus $WSS)"

say "Validasi input ditolak dengan benar"
code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$BASE/api/token?room=ABC&username=Verifier")"
[ "$code" = "400" ] && ok "room invalid -> 400" || bad "room invalid -> $code (harus 400)"

say "Healthcheck"
curl -s --max-time 10 "$BASE/healthz" | grep -q '"ok":true' && ok "/healthz ok" || bad "/healthz gagal"

say "Signalling LiveKit (WebSocket /livekit/rtc)"
# 400 dari LiveKit = path sampai & routing benar (tanpa token).
code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$BASE/livekit/rtc/validate?access_token=x")"
case "$code" in
  401|400|403) ok "/livekit/rtc terjangkau (HTTP $code dari LiveKit)" ;;
  404) bad "/livekit/rtc -> 404 (nginx belum mem-proxy, atau LiveKit tidak jalan)" ;;
  *)   warn "/livekit/rtc -> $code" ;;
esac

say "Port media (dari luar, UDP)"
if command -v nc >/dev/null; then
  if nc -zvu -w 3 "$DOMAIN" 50000 >/dev/null 2>&1; then
    warn "UDP 50000 terbuka dari sini (bagus, tapi UDP bisa false-positive)"
  else
    warn "UDP 50000 tidak terkonfirmasi — cek Security Group: 50000-50040/udp wajib terbuka"
  fi
else
  warn "nc tidak ada, lewati cek UDP — pastikan 50000-50040/udp terbuka di firewall"
fi
if nc -z -w 3 "$DOMAIN" 7881 >/dev/null 2>&1 2>/dev/null; then
  ok "TCP 7881 (fallback) terbuka"
else
  warn "TCP 7881 tidak terdeteksi terbuka (opsional, tapi disarankan)"
fi

echo
if [ "$FAIL" -eq 0 ]; then
  printf '\033[1;32mSEMUA CEK LULUS\033[0m — buka %s di browser\n' "$BASE"
else
  printf '\033[1;31m%d CEK GAGAL\033[0m\n' "$FAIL"
fi
echo
echo "Uji nyata: buka $BASE di dua tab/browser, nama beda, kode room sama."
exit "$FAIL"