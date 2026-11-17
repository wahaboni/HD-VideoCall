# HD Video Call (LiveKit + React)

Aplikasi web video call kualitas HD — **720p default, toggle 1080p** — dengan
LiveKit self-host, ringan dan siap jalan di VPS **1 vCPU / 1 GB RAM**.

```
.
├── frontend/          React 19 + Vite 8 + Tailwind 4 + @livekit/components-react
│   ├── src/pages/     Lobby (pre-join) & Room (VideoConference)
│   ├── src/lib/       kualitas video, kode room, routing hash, klien API
│   ├── nginx.conf.template   static SPA + proxy /api + /livekit/rtc
│   └── docker-entrypoint.d/  runtime config (tanpa rebuild)
├── backend/           Express 5 token server + livekit-server-sdk
├── livekit/           livekit.yaml (production) + compose dev (--dev)
├── docker-compose.yml
└── .env.example
```

## Fitur

- **Lobby / pre-join** — nama, kode room (auto-generate 8 karakter / bisa diedit),
  pilih kualitas, tombol *Gabung Video Call*.
- **Meeting room** — komponen `VideoConference` LiveKit: mic, kamera, share
  screen (1080p), chat, tombol keluar.
- **Kualitas HD** — default **1280×720 @30fps**, opsi **1920×1080 @30fps**.
  Bisa diganti dari lobby maupun saat sudah di dalam room (capture video
  di-restart dengan resolusi baru).
- **Hemat bandwidth** — `simulcast` (3 layer: 180p/360p/native) + `dynacast`
  (layer yang tidak ditonton berhenti dikirim) + `adaptiveStream`
  (resolusi turun mengikuti ukuran elemen video di layar).
- **Refresh-safe** — buka ulang / refresh di `#/room/<kode>?name=...` langsung
  menyambung kembali ke room yang sama.
- **Token unik** — dua orang dengan nama sama tidak saling menendang.

## Cara cepat (Docker, semua service)

```bash
cp .env.example .env
# edit .env: DOMAIN, LIVEKIT_API_KEY, LIVEKIT_API_SECRET
#   openssl rand -hex 24         # untuk LIVEKIT_API_SECRET
docker compose up -d --build
docker compose ps                # semua harus (healthy)
```

Buka `http://localhost` (atau `http://localhost:8080` bila `FRONTEND_PORT=8080`).

Satu pintu masuk — container `frontend` (nginx) melayani:

| Path             | Tujuan                                    |
| ---------------- | ----------------------------------------- |
| `/`              | SPA React                                 |
| `/api/token`     | proxy → `backend:3001`                    |
| `/livekit/rtc/*` | proxy WebSocket → `livekit:7880`          |
| `/rtc/*`         | jalur kompatibilitas untuk `wsUrl` tanpa path |

Port `7880` LiveKit **tidak** dipublikasikan. Yang diekspos hanya HTTP
(`FRONTEND_PORT`), UDP media `50000-50040`, dan TCP fallback `7881`.

### Ganti URL tanpa rebuild

`VITE_API_URL` dan `LIVEKIT_WS_URL` dibaca **saat container start**
(nginx menulis `/config.js`, backend membacanya dari env). Cukup:

```bash
nano .env
docker compose up -d          # tanpa --build
```

Nilai `VITE_API_URL` yang di-bake saat build memang kosong; runtime config
menang. Ini yang membuat pindah domain cukup edit `.env`.

## Dev lokal (tanpa Docker)

Butuh Node.js ≥ 20.19 dan Docker (untuk LiveKit).

> **Penting:** LiveKit dev memakai `network_mode: host` dan port `7880/7881`,
> sama dengan LiveKit container production. Jangan jalankan keduanya
> bersamaan. Sebelum dev: `docker compose stop livekit`.

**1. LiveKit Server (mode dev)**

```bash
docker compose stop livekit              # hindari bentrok port 7881
docker compose -f livekit/docker-compose.yml up
# key: devkey, secret: secret, ws://localhost:7880
```

Atau binary langsung: `livekit-server --dev` (UDP 7880/50000-60000).

**2. Backend token server**

```bash
cd backend
cp .env.example .env
npm install
npm run dev        # http://localhost:3001
npm test           # 10 test
```

**3. Frontend**

```bash
cd frontend
cp .env.example .env      # VITE_API_URL=http://localhost:3001
npm install
npm run dev               # http://localhost:5173
npm test                  # 21 test
npm run build
```

Vite juga sudah mem-proxy `/api` → `localhost:3001` dan `/rtc` → `localhost:7880`,
jadi `VITE_API_URL` boleh dikosongkan saat dev.

**4. Kembali ke stack Docker**

```bash
# hentikan vite + backend dev, lalu:
docker compose -f livekit/docker-compose.yml down
docker compose up -d
```

## Environment variables

### Root `.env` (Docker Compose)

| Variabel             | Default                     | Keterangan                                |
| -------------------- | --------------------------- | ----------------------------------------- |
| `DOMAIN`             | `aws86.online`              | `server_name` nginx                       |
| `LIVEKIT_API_KEY`    | `devkey`                    | ganti di production                       |
| `LIVEKIT_API_SECRET` | `secret`                    | **wajib** ≥ 32 karakter di production     |
| `LIVEKIT_WS_URL`     | `wss://aws86.online/livekit`| dikirim ke browser lewat `/api/token`     |
| `VITE_API_URL`       | `https://aws86.online`      | URL token server di browser               |
| `CORS_ORIGIN`        | `https://aws86.online`      | origin yang diizinkan (pisah koma)        |
| `TOKEN_TTL`          | `6h`                        | masa berlaku token                        |
| `FRONTEND_PORT`      | `80`                        | port HTTP host                            |
| `LIVEKIT_UDP_RANGE`  | `50000-50040`               | harus sama dengan `livekit.yaml`          |
| `LIVEKIT_TCP_PORT`   | `7881`                      | ICE/TCP fallback                          |

### `backend/.env`

| Variabel                                  | Default                 |
| ----------------------------------------- | ----------------------- |
| `LIVEKIT_API_KEY`                         | `devkey`                |
| `LIVEKIT_API_SECRET`                      | `secret`                |
| `LIVEKIT_WS_URL`                          | `ws://localhost:7880`   |
| `PORT`                                    | `3001`                  |
| `CORS_ORIGIN`                             | `http://localhost:5173` |
| `TOKEN_TTL`                               | `6h`                    |

`LIVEKIT_WS_URL` juga menerima `http(s)://` — otomatis jadi `ws(s)://`.

### `frontend/.env`

| Variabel        | Dev                     |
| --------------- | ----------------------- |
| `VITE_API_URL`  | `http://localhost:3001` |

## API

```
GET /api/token?room=<roomName>&username=<userName>

200 { "token": "<jwt>", "wsUrl": "wss://aws86.online/livekit", "room": "...", "username": "..." }
400 { "error": "Kode room tidak valid ..." }
500 { "error": "Gagal membuat token ..." }
```

- `room`: `^[a-z0-9][a-z0-9-]{0,47}$` (1–48 karakter).
- `username`: 1–40 karakter, tanpa karakter kontrol dan `<>`.
- Grant token: `roomJoin`, `canPublish`, `canSubscribe`, `canPublishData`.

`GET /healthz` → `{ "ok": true }` (dipakai Docker healthcheck).

## Production di VPS (domain + SSL)

Prasyarat: Docker + Docker Compose, domain `A` record → IP VPS.

**1. Firewall** — ini yang paling sering membuat "video call tidak connect":

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 7881/tcp                  # ICE/TCP fallback
sudo ufw allow 50000:50040/udp           # media WebRTC
sudo ufw enable
```

Cloud provider (AWS/GCP/Azure/Oracle) punya Security Group terpisah — buka
port yang sama di sana juga.

**2. Deploy**

```bash
git clone <repo> /opt/hdvc && cd /opt/hdvc
cp .env.example .env
nano .env
#   DOMAIN=aws86.online
#   LIVEKIT_API_KEY=<openssl rand -hex 16>
#   LIVEKIT_API_SECRET=<openssl rand -hex 32>   # minimal 32 karakter
#   LIVEKIT_WS_URL=wss://aws86.online/livekit
#   VITE_API_URL=https://aws86.online
#   CORS_ORIGIN=https://aws86.online
#   FRONTEND_PORT=80        # bila nginx host tidak dipakai
docker compose up -d --build
```

**3. SSL**

Opsi A — nginx host sebagai TLS terminator (contoh lengkap:
`livekit/nginx-stream.conf.example`):

```bash
sudo apt install nginx certbot python3-certbot-nginx
# .env: FRONTEND_PORT=8080 (biar nginx host pegang 80/443)
sudo cp livekit/nginx-stream.conf.example /etc/nginx/sites-available/hdvc
sudo ln -s /etc/nginx/sites-available/hdvc /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d aws86.online
```

Opsi B — Caddy (paling singkat, auto-HTTPS):

```caddyfile
aws86.online {
    reverse_proxy 127.0.0.1:8080
}
```

**4. Verifikasi**

```bash
curl -s https://aws86.online/healthz
curl -s "https://aws86.online/api/token?room=test&username=Budi" | head -c 120
docker compose ps
docker stats --no-stream
```

### Pemakaian resource (terukur)

| Container      | Idle RAM |
| -------------- | -------- |
| livekit        | ~75 MB   |
| backend        | ~29 MB   |
| frontend nginx | ~8 MB    |
| **Total**      | **~112 MB** |

Beban CPU saat 2 peserta 720p di mesin uji: < 5% dari 1 vCPU. Memory limit di
`docker-compose.yml` sudah dipatok (384M / 192M / 128M) supaya OOM tidak
menjatuhkan seluruh VPS.

## Troubleshooting

| Gejala | Penyebab & solusi |
| --- | --- |
| Room terbuka tapi peserta tidak saling melihat | UDP `50000-50040` tertutup. Cek firewall + Security Group. Lihat `docker compose logs livekit`, harus ada `found external IP via STUN`. |
| `config secret is too short` di log LiveKit | `LIVEKIT_API_SECRET` < 32 karakter. Ini warning, tapi ganti di production. |
| `401` saat connect | `LIVEKIT_API_KEY/SECRET` backend ≠ `LIVEKIT_KEYS` LiveKit. Samakan di `.env`, lalu `docker compose up -d`. |
| `wsUrl` mengarah ke domain yang salah setelah ganti domain | `LIVEKIT_WS_URL` salah, atau browser masih pakai bundle lama. Cek `curl https://<domain>/config.js` dan `curl .../api/token`. |
| `502` di `/api` | Backend belum sehat: `docker compose logs backend`. nginx me-resolve ulang DNS Docker setiap 10s, jadi recover otomatis. |
| Video hijau/hitam di Safari | Safari butuh `wss` (HTTPS). Pakai domain ber-SSL, bukan `http://IP`. |
| Connect berhasil di rumah, gagal di kantor | Jaringan memblokir UDP. Aktifkan TURN di `livekit/livekit.yaml` (blok `turn:`), buka `3478/udp` + `5349/tcp`, sertakan sertifikat. |
| Layar kecil di HP tetap 1080p | `adaptiveStream` sudah aktif; resolusi turun otomatis mengikuti ukuran elemen video. |

## Catatan batasan

- **1 vCPU**: nyaman untuk beberapa room kecil (≤ 4 peserta HD per room).
  Untuk lebih banyak, naikkan vCPU — encoder simulcast ada di sisi client,
  SFU hanya meneruskan paket.
- **Tanpa Redis**: single node. Skala horizontal butuh Redis + routing LiveKit.
- **Chat tidak persisten**: pesan hanya hidup selama sesi room.
- **Share screen** dikirim 1080p@30 dengan `contentHint: detail`; presenter
  dengan bandwidth kecil otomatis turun layer karena simulcast.

## Test

```bash
cd backend  && npm test     # 10 test (node:test)
cd frontend && npm test     # 21 test (node:test)
```

Cakupan: validasi room/username, pembuatan & verifikasi JWT, CORS preflight,
preset kualitas, layer simulcast, normalisasi kode room, routing hash,
parsing respons API.