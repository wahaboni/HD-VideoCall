# HD Video Call — Design (2026-11-17)

## Intent

Aplikasi web video call HD (720p default, toggle 1080p) berbasis LiveKit yang
ringan dan siap deploy ke VPS 1 vCPU / 1 GB RAM, dijalankan penuh dengan Docker.

Pengguna: tim/kelompok kecil yang butuh ruang meeting video mandiri tanpa
ketergantungan layanan SaaS, dengan bandwidth terkendali.

## Goals

- Lobby/pre-join: nama, kode room (input atau generate), tombol gabung.
- Meeting room: `VideoConference` lengkap (mic, kamera, share screen HD, chat, leave).
- Kualitas: 1280x720@30 default, toggle 1920x1080, simulcast + dynacast + adaptiveStream.
- Token server aman (secret hanya di server), CORS terbatas.
- Deploy: satu `docker compose up -d` di VPS.

## Non-Goals

- Auth/akun pengguna, database, recording/egress, persistent chat history.
- Skala banyak room sekaligus (>10 peserta per room, host multi-node).
- Mobile native app.

## Anti-Goals

- Gagal karena tidak teruji: kode harus build bersih dan service harus benar-benar
  jalan (health check hijau) sebelum diserahkan.
- Image gemuk (node_modules ikut ke production) atau RAM boros.

## Constraints

- VPS 1 vCPU / 1 GB RAM → total RSS target < 350 MB idle.
- LiveKit media butuh UDP 50000-50040 (dan TCP fallback 7881 via nginx stream/SSL).
- 1 domain, TLS tunggal.

## Approaches (dipilih: A)

**A. nginx di dalam image frontend sebagai pintu tunggal (dipilih).**
`frontend` (multi-stage: node build → nginx alpine), `backend`, `livekit`.
nginx serve static SPA, proxy `/api` → backend, `/rtc` → livekit ws.
Trade-off: 1 proses nginx, config TLS/SLL di satu tempat; LiveKit tidak
perlu diekspos port 7880 ke publik.

**B. Container nginx edge terpisah di depan 3 service.**
Lebih rapi untuk scale dan bisa ganti frontend tanpa rebuild nginx, tapi
+1 proses (~20 MB) dan config dobel. Ditolak untuk target 1 GB.

**C. LiveKit Cloud + frontend statis.**
Paling ringan di VPS, tapi melanggar requirement self-host di `/livekit`. Ditolak.

## Design

### Struktur

```
/docker-compose.yml        # prod: frontend(nginx) + backend + livekit
/.env.example              # DOMAIN, kunci LiveKit, port
/README.md
/frontend                  # React 19 + Vite + Tailwind v4 + @livekit/components-react
  /src/pages/Lobby.tsx, /src/pages/Room.tsx, /src/lib/quality.ts
  /nginx.conf.template     # static + /api + /rtc proxy + ws upgrade
  /Dockerfile
  /.env.example
/backend                   # Express 5 + livekit-server-sdk
  /src/server.js, /src/token.js
  /Dockerfile              # node:22-alpine, non-root, HEALTHCHECK
  /.env.example
/livekit
  /livekit.yaml            # rtc udp 50000-50040, use_external_ip, redis off
  /docker-compose.yml      # dev: livekit saja dengan --dev
  /nginx-stream.conf.example
```

### Frontend

- Router ringan tanpa dependensi: `view` state (`lobby` | `room`) dari URL hash,
  supaya 1 bundle kecil dan siap refresh/back.
- Lobby: nama (validasi 1-40 char), kode room (auto `generateRoomCode()` base36
  8 char, input sanitized `[a-z0-9-]` max 48), tombol gabung disabled saat invalid/loading.
- Room: `LiveKitRoom` dengan `connect`, `audio`, `video` + `VideoConference`,
  dan style `@livekit/components-styles`.
- `src/lib/quality.ts`: presets 720p/1080p →
  `{ resolution: { width, height, frameRate: 30 }, simulcast: true, dynacast: true }`,
  pilihan disimpan di `localStorage` (`hdvc.quality`), `adaptiveStream: true` di room options.
- `VITE_API_URL` (default kosong → same-origin `/api` di production, `http://localhost:3001` di dev).

### Backend

- `GET /api/token?room=&username=` → validasi regex, grant `roomJoin`,
  `canPublish`, `canSubscribe`, `canPublishData`, `room`, `ttl 6h`, `identity` unik (`username` + suffix acak bila perlu).
- `GET /healthz` → `{ ok: true }`.
- CORS: origin dari `CORS_ORIGIN` (default `http://localhost:5173`), comma-separated.
- Env: `LIVEKIT_API_KEY=devkey`, `LIVEKIT_API_SECRET=secret`, `LIVEKIT_WS_URL=ws://localhost:7880`, `PORT=3001`.

### LiveKit

- Dev: `livekit-server --dev` (keys devkey/secret) di `/livekit/docker-compose.yml` dengan `network_mode: host` untuk UDP mudah.
- Prod: image `livekit/livekit-server:v1.13.11`, `livekit.yaml` dari `.env`,
  UDP 50000-50040, `use_external_ip: true`, redis off (single node).
- Frontend memanggil `/rtc` → nginx proxy ke `livekit:7880` (ws upgrade,
  read/send timeout 86400), sehingga satu domain dan tanpa mixed content.

### Deploy

`docker compose --env-file .env up -d --build`. TLS: nginx host / docker dengan
certbot (contoh disediakan di README). Firewall: 80, 443, 7881/tcp, 50000-50040/udp.

## Yang diserahkan ke builder

- Nama file/komponen internal bebas selama perilaku di atas terpenuhi.
- Gaya visual: dark, netral, aksen indigo; Tailwind utility, tanpa UI kit tambahan.
