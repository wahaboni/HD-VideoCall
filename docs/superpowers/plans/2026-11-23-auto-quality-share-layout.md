# AUTO Quality dan Layout Bagikan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Tambah mode AUTO adaptif berbasis statistik WebRTC dan letakkan Bagikan jelas di kanan atas room.

**Architecture:** Quality helpers tetap pure di `quality.js`; Room memakai helper untuk memilih tier dan menjalankan polling statistik. Perubahan kualitas meremount capture component tanpa reconnect room. Route/hash dan toggle menerima key `auto`.

**Tech Stack:** React 19, Vite, LiveKit React, Node test runner, Tailwind.

**Spec:** `docs/superpowers/specs/2026-11-23-auto-quality-share-layout-design.md`

## Global Constraints

- AUTO mulai pada 720p.
- Tier AUTO: 360p, 720p, 1080p.
- `adaptiveStream`, `dynacast`, dan simulcast tetap aktif.
- Mode manual 720p/1080p tetap tersedia.
- Tidak reconnect room saat kualitas berubah.
- Tidak mengubah server LiveKit atau deployment VPS.

## Review Focus

- `auto` pada hash/refresh harus tetap valid — route tests.
- Statistik WebRTC kosong atau tidak lengkap tidak boleh merusak room — quality resolver tests.
- Packet loss/RTT tepat di ambang harus stabil — hysteresis tests.
- Polling harus berhenti saat Room unmount — Room effect review.
- Bagikan tidak boleh tertutup popup atau tombol Keluar — Room layout review.

---

### Task 1: Quality model dan AUTO resolver

**Files:**
- Modify: `frontend/src/lib/quality.js`
- Test: `frontend/test/quality.test.js`

**Interfaces:**
- Produces `AUTO_QUALITY = 'auto'`, `AUTO_QUALITY_KEYS`, `qualityForNetwork({ packetLoss, rtt, current })`, dan `qualityPreset('auto')`.
- `qualityForNetwork` returns one of `'360p' | '720p' | '1080p'`; missing stats returns current or `'720p'`.

- [ ] **Step 1: Write failing tests** for `360p`, `auto` normalization, initial 720p, poor-network downgrade, stable-network upgrade, and hysteresis.
- [ ] **Step 2: Run `cd frontend && npm test -- --test-name-pattern='quality'`; verify new tests fail.**
- [ ] **Step 3: Implement presets and resolver** with explicit thresholds: poor when packet loss `>= 8%` or RTT `>= 400ms`; stable upgrade only when packet loss `<= 2%` and RTT `<= 150ms`; one-tier changes only.
- [ ] **Step 4: Run quality tests; verify pass.**
- [ ] **Step 5: Commit** `feat: add adaptive auto quality model`.

### Task 2: Route, storage, and toggle support

**Files:**
- Modify: `frontend/src/lib/hashRoute.js`, `frontend/src/components/QualityToggle.jsx`, related lobby quality state if needed
- Test: `frontend/test/hashRoute.test.js`, `frontend/test/quality.test.js`

**Interfaces:**
- `normalizeQuality('auto') === 'auto'`.
- `buildHash`/`parseHash` round-trip `quality=auto`.

- [ ] **Step 1: Add failing route and toggle-facing model tests** for `auto` round-trip and label.
- [ ] **Step 2: Run focused tests; verify fail.**
- [ ] **Step 3: Add AUTO button and preserve existing manual controls.**
- [ ] **Step 4: Run frontend tests; verify pass.**
- [ ] **Step 5: Commit** `feat: expose auto quality mode`.

### Task 3: Room adaptive monitoring

**Files:**
- Modify: `frontend/src/pages/Room.jsx`

**Interfaces:**
- When `quality === 'auto'`, Room polls connected participant/local WebRTC stats every 5 seconds, resolves target tier, and changes capture quality without changing LiveKit server connection.

- [ ] **Step 1: Add a stable quality key/remount mechanism** so capture settings update while room session remains connected.
- [ ] **Step 2: Add polling effect** with cleanup, safe guards for unavailable stats, and cooldown of at least 15 seconds between changes.
- [ ] **Step 3: Display `AUTO · <active tier>` in room header; manual mode displays existing preset label.**
- [ ] **Step 4: Run `cd frontend && npm test && npm run build`; verify pass.**
- [ ] **Step 5: Commit** `feat: adapt room quality to network stats`.

### Task 4: Bagikan layout and final verification

**Files:**
- Modify: `frontend/src/pages/Room.jsx`
- Test: existing frontend tests plus manual UI check

- [ ] **Step 1: Place Bagikan first in right-side header controls**, followed by quality toggle and Keluar; preserve popup link behavior.
- [ ] **Step 2: Verify responsive wrapping and popup positioning** at desktop and narrow viewport.
- [ ] **Step 3: Run full suites:** `cd frontend && npm test && npm run build`; `cd ../backend && npm test`.
- [ ] **Step 4: Inspect `git diff`, commit** `feat: add adaptive quality and improve share control`.
- [ ] **Step 5: Push** `git push origin master` only after verification succeeds.
