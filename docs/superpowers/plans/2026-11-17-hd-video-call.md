# HD Video Call Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline) or superpowers:subagent-driven-development. Steps use `- [ ]`.

**Goal:** Monorepo video call HD 720p/1080p, self-host LiveKit, jalan penuh via Docker di VPS 1 vCPU / 1 GB.

**Architecture:** Satu domain. `frontend` = nginx (SPA static + proxy `/api` ke backend + `/rtc` WebSocket ke livekit), `backend` = Express token server, `livekit` = media server UDP 50000-50040.

**Tech Stack:** React 19, Vite 8, Tailwind 4, livekit-client 2.24, @livekit/components-react 2.9; Node 22, Express 5, livekit-server-sdk 2.20; LiveKit Server v1.13.11; Docker Compose.

**Spec:** `docs/superpowers/specs/2026-11-17-hd-video-call-design.md`

## Global Constraints

- Default 1280x720@30, opsi 1920x1080@30, simulcast + dynacast + adaptiveStream aktif.
- `GET /api/token?room=&username=` → `{ token, wsUrl }`; invalid → 400 JSON `{ error }`.
- Env default backend: `devkey` / `secret` / `ws://localhost:7880` / `3001` / CORS `http://localhost:5173`.
- Frontend `VITE_API_URL` kosong = same-origin `/api`.
- Room `^[a-z0-9][a-z0-9-]{0,47}$`, username 1-40 char tanpa karakter kontrol/`<>`.
- Secret tidak pernah masuk bundle frontend.

## Review Focus

- Input aneh (spasi, unicode, `<script>`, 200 char) → 400 rapi, bukan 500.
- Backend down / URL salah → lobby tampil error + bisa retry.
- Refresh di `#/room/<code>` → balik ke room yang sama.
- Dua user nama sama → identity unik, tidak saling tendang.
- `wsUrl` salah skema → tetap URL WebSocket valid lewat proxy.

---

### Task 1: Backend token server

**Files:** `backend/package.json`, `src/config.js`, `src/token.js`, `src/app.js`, `src/server.js`, `test/token.test.js`, `.env.example`, `.gitignore`

**Interfaces:** `createApp(config)`, `buildToken({config,room,username,identity})`, `validateRoomName`, `validateUsername`, `resolveWsUrl(raw, headers)`, `uniqueIdentity(username)`.

- [ ] Test: room valid `abc-123`; tolak `""`, `"a b"`, 49 char, `"<script>"`, `"ABC"` (dinormalisasi di frontend, backend tolak uppercase? → terima lowercase saja). Username tolak `""`, 41 char, `"a<b>"`.
- [ ] `npm test` → FAIL.
- [ ] Implement config + validasi + `buildToken` (ttl 6h, roomJoin/canPublish/canSubscribe/canPublishData) + route + `/healthz` + CORS.
- [ ] Test integrasi: 200 + token decode `video.room`, 400 invalid, CORS header.
- [ ] `npm test` PASS; commit.

### Task 2: Frontend lib + scaffold

**Files:** `frontend/package.json`, `vite.config.js`, `index.html`, `src/main.jsx`, `src/index.css`, `src/App.jsx`, `src/lib/{api,quality,room,hashRoute}.js`, tests, `.env.example`

**Interfaces:** `QUALITY_PRESETS`, `DEFAULT_QUALITY='720p'`, `normalizeQuality`, `videoCaptureDefaults(q)`, `roomOptions(q)`, `generateRoomCode()`, `normalizeRoomCode(v)`, `getToken({room,username,signal})`, `parseHash(h)`, `buildHash({view,room,name,quality})`.

- [ ] Test quality: 720p → `{resolution:{width:1280,height:720,frameRate:30}}`; 1080p → 1920/1080; `roomOptions().adaptiveStream === true`, `.dynacast === true`, `.publishDefaults.simulcast === true`; preset tak dikenal → fallback 720p.
- [ ] Test room: `generateRoomCode()` match `^[a-z0-9]{8}$` dan unik; `normalizeRoomCode(' My Room! ')` → `my-room`; `normalizeRoomCode('a'.repeat(80))` panjang ≤ 48.
- [ ] Test hashRoute: round-trip build/parse; hash kosong → lobby; `#/room/abc?name=Bob` parse.
- [ ] `npx vitest run` FAIL.
- [ ] Implement lib + scaffold Vite/Tailwind, tema dark.
- [ ] `npx vitest run` PASS; `npm run build` PASS; commit.

### Task 3: Lobby + Room

**Files:** `src/pages/Lobby.jsx`, `src/pages/Room.jsx`, `src/components/QualityToggle.jsx`, modify `src/App.jsx`

- [ ] Lobby: nama, room code (generate + edit), toggle 720p/1080p, submit → hash room; error fetch terlihat.
- [ ] Room: fetch token (retry), `LiveKitRoom` (adaptiveStream/dynacast/capture defaults) + `VideoConference` + styles; kualitas in-room → remount key; leave → lobby.
- [ ] `npm run build` PASS; commit.

### Task 4: Docker + LiveKit

**Files:** `backend/Dockerfile`, `backend/.dockerignore`, `frontend/Dockerfile`, `frontend/.dockerignore`, `frontend/nginx.conf.template`, `frontend/docker-entrypoint.sh`, `livekit/livekit.yaml`, `livekit/livekit-dev.yaml`, `livekit/docker-compose.yml`, `livekit/nginx-stream.conf.example`, `docker-compose.yml`, `.env.example`

- [ ] Backend image multi-stage, non-root, healthcheck `/healthz`.
- [ ] Frontend build → nginx alpine; proxy `/api`, `/rtc` (Upgrade, 86400s).
- [ ] LiveKit prod yaml: udp range, `use_external_ip: true`, keys via `LIVEKIT_KEYS`; dev yaml + compose `--dev`.
- [ ] `docker compose config` lalu `up -d --build` → semua up, healthcheck hijau.
- [ ] Verifikasi HTTP: `/` 200, `/healthz`, `/api/token` 200, `/rtc` upgrade ke LiveKit.

### Task 5: README + verifikasi end-to-end

- [ ] README: dev lokal, docker, production nginx+SSL+certbot, firewall, troubleshooting.
- [ ] Verifikasi: bundle tidak memuat secret; token decode valid; `docker compose ps` sehat.
- [ ] Commit.
