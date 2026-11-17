# Deploy ke VPS (aws86.online)

Target: `103.150.101.47`, root `aws86.online`, Docker sudah terpasang.
Host nginx yang ada **tetap** memegang 80/443 + sertifikat Let's Encrypt
(valid sampai 15 Feb 2027, sudah mencakup `aws86.online` dan `www`).
Stack Docker hanya mendengarkan `127.0.0.1:8080`; nginx host mem-proxy ke sana.

```
Internet 443 ─▶ nginx host (TLS, cert Let's Encrypt)
                    └─ proxy ─▶ 127.0.0.1:8080  (container frontend)
                                     ├─ /            → SPA React
                                     ├─ /api/        → backend:3001
                                     └─ /livekit/rtc → livekit:7880 (WebSocket)

Media WebRTC: langsung UDP 50000-50040 ─▶ container livekit
```

Kenapa begini, bukan nginx container pegang 443: sertifikat & renewal sudah
dikelola host. Container tidak perlu root, tidak menyimpan private key, dan
app lama tetap bisa dibalikkan tanpa menyentuh Let's Encrypt.

---

## 0. Kirim kode ke VPS

Pilih **satu**.

### A. Git (rekomendasi — update jadi satu perintah)

Dari laptop:

```bash
cd /home/aws86/PROJECT/HD-VC
git add -A && git commit -m "deploy: scripts + dokumentasi"

# buat repo kosong dulu di GitHub (private), lalu:
git remote add origin git@github.com:<user>/hdvc.git
git push -u origin main
```

Di VPS:

```bash
sudo apt install -y git        # bila belum ada
sudo git clone https://github.com/<user>/hdvc.git /opt/hdvc
```

Repo private? Pakai deploy key:

```bash
sudo ssh-keygen -t ed25519 -N '' -f /root/.ssh/hdvc_deploy
sudo cat /root/.ssh/hdvc_deploy.pub
# → tambahkan sebagai "Deploy key" (read-only) di GitHub repo settings
sudo GIT_SSH_COMMAND='ssh -i /root/.ssh/hdvc_deploy' git clone git@github.com:<user>/hdvc.git /opt/hdvc
```

Update berikutnya cukup:

```bash
cd /opt/hdvc && sudo git pull && sudo bash deploy/update.sh
```

### B. Tanpa Git (tar + scp)

```bash
# laptop
cd /home/aws86/PROJECT/HD-VC
tar --exclude=node_modules --exclude=dist --exclude=.env -czf /tmp/hdvc.tar.gz .
scp /tmp/hdvc.tar.gz root@103.150.101.47:/tmp/

# VPS
sudo mkdir -p /opt/hdvc
sudo tar -xzf /tmp/hdvc.tar.gz -C /opt/hdvc
```

---

## 1. Buat `.env` production

```bash
cd /opt/hdvc
sudo cp .env.example .env
sudo nano .env
```

Isi minimal:

```dotenv
DOMAIN=aws86.online
LIVEKIT_API_KEY=<openssl rand -hex 16>
LIVEKIT_API_SECRET=<openssl rand -hex 32>
LIVEKIT_WS_URL=wss://aws86.online/livekit
VITE_API_URL=https://aws86.online
CORS_ORIGIN=https://aws86.online
FRONTEND_PORT=8080
LIVEKIT_UDP_RANGE=50000-50040
LIVEKIT_TCP_PORT=7881
```

Generate kredensial langsung di VPS:

```bash
cd /opt/hdvc
KEY=$(openssl rand -hex 16); SECRET=$(openssl rand -hex 32)
sudo sed -i "s|^LIVEKIT_API_KEY=.*|LIVEKIT_API_KEY=$KEY|; s|^LIVEKIT_API_SECRET=.*|LIVEKIT_API_SECRET=$SECRET|" .env
sudo grep -E 'API_(KEY|SECRET)' .env
```

> `LIVEKIT_API_SECRET` **wajib ≥ 32 karakter**. LiveKit menolak start dengan
> secret pendek (peringatan di log, koneksi 401).

`FRONTEND_PORT=8080` **jangan** diganti 80 — nginx host sudah memegang 80/443.

---

## 2. Jalankan stack

```bash
cd /opt/hdvc
sudo bash deploy/deploy.sh
```

Skrip ini: validasi prasyarat → build 3 image → `up -d` → tunggu semua
`healthy` → uji `GET /`, `/healthz`, `/config.js`, `/api/token` dari dalam
VPS → buka port di `ufw` bila aktif. Kalau ada langkah gagal, berhenti
dengan pesan jelas (tidak lanjut ke perubahan nginx).

Cek manual:

```bash
sudo docker compose ps
sudo docker stats --no-stream
sudo curl -s localhost:8080/healthz
```

---

## 3. Arahkan domain ke stack (mengganti `my-react-app`)

Ini **menimpa** app yang sekarang ada di root. Skrip membackup dulu.

```bash
cd /opt/hdvc
sudo bash deploy/install-nginx-site.sh
```

Yang dilakukan:

1. Pastikan sertifikat `/etc/letsencrypt/live/aws86.online/` ada — kalau tidak,
   berhenti (app lama tetap hidup).
2. Backup `sites-available`, `sites-enabled`, dan `nginx -T` ke
   `/root/hdvc-nginx-backup-<timestamp>/`.
3. Tulis `/etc/nginx/sites-available/hdvc` + symlink `sites-enabled/hdvc`.
4. Nonaktifkan (bukan hapus) vhost lama yang memegang `aws86.online`.
5. `nginx -t`; **kalau gagal, konfigurasi lama otomatis dipulihkan**.
6. `systemctl reload nginx`.

File app lama (`/var/www/...`) tidak disentuh sama sekali.

### Rollback

```bash
sudo bash /opt/hdvc/deploy/rollback-nginx.sh
# atau pilih backup tertentu:
sudo bash /opt/hdvc/deploy/rollback-nginx.sh /root/hdvc-nginx-backup-20261117-104500
```

nginx kembali ke app lama dalam hitungan detik. Stack Docker tetap jalan;
matikan dengan `cd /opt/hdvc && sudo docker compose down`.

---

## 4. Firewall — bagian yang paling sering bikin "video tidak connect"

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 7881/tcp            # ICE/TCP fallback
sudo ufw allow 50000:50040/udp     # media WebRTC
sudo ufw status verbose
```

Kalau VPS di AWS/GCP/Azure/Oracle: **Security Group juga harus dibuka** — ufw
saja tidak cukup.

Verifikasi dari VPS:

```bash
sudo docker compose logs livekit | grep -i "external IP"
# harus muncul: found external IP via STUN ... "externalIP": "103.150.101.47"
```

Kalau IP yang terdeteksi bukan `103.150.101.47`, buka
`livekit/livekit.yaml` dan set eksplisit:

```yaml
rtc:
  use_external_ip: false
  node_ip: 103.150.101.47
```

lalu `sudo docker compose up -d livekit`.

---

## 5. Verifikasi dari laptop

```bash
cd /home/aws86/PROJECT/HD-VC
bash deploy/verify.sh
```

Cek: HTTPS, isi `index.html` benar-benar app ini (bukan `my-react-app`),
`/config.js` berisi domain yang benar, token + `wsUrl`, 400 untuk room invalid,
`/healthz`, dan `/livekit/rtc` terjangkau.

Terakhir, uji nyata di browser: buka `https://aws86.online` di dua
perangkat/tab, nama berbeda, kode room sama. Video 720p harus muncul dua arah.

---

## Perawatan

```bash
cd /opt/hdvc

# update kode
sudo git pull && sudo bash deploy/update.sh

# log
sudo docker compose logs -f --tail=100 backend livekit

# restart satu service
sudo docker compose restart livekit

# ganti domain / URL tanpa rebuild
sudo nano .env && sudo docker compose up -d

# disk (image build menumpuk)
sudo docker system df
sudo docker image prune -f      # hapus image tak terpakai
```

### Perkiraan resource

| Container | Idle RAM (terukur lokal) |
| --------- | ------------------------ |
| livekit   | ~70 MB                   |
| backend   | ~20 MB                   |
| frontend  | ~8 MB                    |

Limit di `docker-compose.yml` sudah dipatok (384M / 192M / 128M) supaya satu
container tidak bisa menghabiskan RAM VPS.

---

## Kalau bermasalah

| Gejala | Cek |
| --- | --- |
| `502 Bad Gateway` di domain | `sudo docker compose ps` — frontend sehat? `sudo ss -lntp \| grep 8080` |
| Halaman masih `my-react-app` | vhost lama belum nonaktif: `sudo nginx -T \| grep -n "server_name.*aws86"` |
| Login room lalu diam / putus | UDP tertutup. Cek Security Group + `logs livekit \| grep -i "external IP"` |
| `401` saat connect | `LIVEKIT_API_KEY/SECRET` di `.env` ≠ yang dipakai livekit container. `sudo docker compose up -d` agar keduanya ikut restart |
| `config.js` masih nilai lama | Browser cache — file ini `no-store`, tapi coba hard reload |
| Kamera diblokir browser | Akses lewat `https://` (bukan `http://IP`) |