# macOS Light Frosted Glass Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle frontend HD-VC ke tema macOS light frosted glass (glassmorphism) tanpa mengubah logika.

**Architecture:** Pure visual restyle — hanya className Tailwind dan CSS variable LiveKit. Tidak ada perubahan state, routing, atau API. Area video meeting tetap gelap; panel kontrol frosted.

**Tech Stack:** React 19, Tailwind CSS 4, @livekit/components-styles.

**Spec:** `docs/superpowers/specs/2026-11-19-macos-glassmorphism-design.md`

## Global Constraints

- Tidak mengubah logika/routing/props/handler — hanya className, style, dan CSS.
- Font stack: `-apple-system` first.
- Background body: gradasi cerah (biru-pink-ungu lembut), bukan `#070b14`.
- Panel kaca: putih semi-transparan (`bg-white/50`–`bg-white/70`), `backdrop-blur-xl`+, `border-white/40`–`/60`, text slate-800/900.
- Semua teks bahasa Indonesia tetap verbatim.

## Review Focus

- Kontras teks di atas kaca: label/placeholder harus tetap terbaca (slate-800/900, placeholder slate-500).
- Tombol disabled (submit saat loading/invalid): harus terlihat jelas non-aktif.
- `aria-invalid` error state input: border merah harus tetap terlihat di panel terang.
- Kontrol LiveKit di atas video gelap: frosted putih harus tetap kontras (teks gelap, ikon gelap).
- Dark-only utility lama (`text-white`, `bg-slate-950/70`, dst.) tidak boleh tersisa di komponen yang direstyle.

---

### Task 1: Tema dasar + LiveKit variables (`index.css`)

**Files:**
- Modify: `frontend/src/index.css`

**Interfaces:**
- Produces: body background gradasi cerah; CSS variable `--lk-*` nuansa terang; override `.lk-control` / `.lk-chat` jadi frosted; font stack `-apple-system` first.

- [ ] **Step 1: Update `index.css`**

Ubahan:
- `body` font-family: `-apple-system, BlinkMacSystemFont, ui-sans-serif, system-ui, ...`.
- `body` background: gradasi cerah multi-stop (contoh: `linear-gradient(135deg, #c7d2fe 0%, #e0e7ff 30%, #fce7f3 70%, #dbeafe 100%)`), `background-attachment: fixed`.
- Blok `[data-lk-theme="default"]`: `--lk-bg: #f1f5f9`, `--lk-bg2: #ffffff`, `--lk-border-color: rgba(255,255,255,0.6)`, `--lk-control-bg: rgba(255,255,255,0.65)`, `--lk-control-hover-bg: rgba(255,255,255,0.85)`, foreground gelap `#1e293b`, accent tetap `#4f46e5`.
- Override visual kaca: `.lk-control { backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.5); }`, `.lk-chat { background-color: rgba(255,255,255,0.7); backdrop-filter: blur(24px); }`, `.lk-room-container { background-color: #0f172a; }` (area video tetap gelap).
- LiveKit ikon/text dalam kontrol: `--lk-foreground: #1e293b`.

- [ ] **Step 2: Verifikasi build**

Run: `cd frontend && npm run build`
Expected: build sukses tanpa error CSS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/index.css
git commit -m "style: macOS light frosted glass base theme"
```

### Task 2: Lobby frosted glass

**Files:**
- Modify: `frontend/src/pages/Lobby.jsx`

**Interfaces:**
- Consumes: tema dari Task 1 (tanpa import baru).

- [ ] **Step 1: Restyle JSX `Lobby.jsx`**

Ubahan className (logika/props/handler tetap):
- Blob background: warna cerah (`bg-indigo-400/30`, `bg-pink-300/25`, `bg-sky-300/25`), posisi seperti semula.
- Icon badge header: `bg-white/60 ring-1 ring-white/70`, icon `text-indigo-500`.
- H1: `text-slate-900`; paragraf: `text-slate-600`.
- Form panel: `border-white/60 bg-white/60 backdrop-blur-2xl shadow-2xl shadow-indigo-500/10`.
- Label: `text-slate-700`. Input: `border-white/70 bg-white/70 text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:ring-indigo-400/30`; input `aria-invalid` tetap bekerja (tambah `aria-invalid:border-red-400` jika perlu—cukup via conditional class sudah ada).
- Tombol generate: `border-white/70 bg-white/60 text-slate-600 hover:bg-white/80 hover:text-slate-900`.
- Error box: `border-red-400/40 bg-red-100/60 text-red-700`.
- Submit: `bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-300/70 disabled:text-slate-500` (text-white tetap).
- Footer text: `text-slate-500`.
- Hint text kecil (`text-xs`): `text-slate-500`.

- [ ] **Step 2: Verifikasi build + test**

Run: `cd frontend && npm run build && npm test`
Expected: build sukses, semua test pass (test tidak menyentuh className).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Lobby.jsx
git commit -m "style: lobby frosted glass panel"
```

### Task 3: Room header frosted glass

**Files:**
- Modify: `frontend/src/pages/Room.jsx`

**Interfaces:**
- Consumes: tema dari Task 1.

- [ ] **Step 1: Restyle JSX `Room.jsx`**

Ubahan className:
- Container room: `bg-slate-900` (video area gelap, digabung dengan Task 1 `.lk-room-container`).
- Header: `border-b border-white/20 bg-white/10 backdrop-blur-2xl` (menu bar macOS di atas area gelap). Text header tetap terang (`text-white`, `text-slate-400`) karena di atas dark room.
- Tombol "Bagikan": `border-white/30 bg-white/10 text-slate-200 hover:bg-white/20 hover:text-white`.
- Popover: `border-white/50 bg-white/80 backdrop-blur-2xl`, label `text-slate-600`, input `border-slate-300 bg-white/70 text-slate-800`, tombol salin `bg-indigo-500 hover:bg-indigo-600`.
- Tombol "Keluar": tetap merah transparan (`border-red-400/40 bg-red-500/20 text-red-200 hover:bg-red-500/30`).
- Spinner `Connecting` dan fallback di `App.jsx` RoomFallback: ganti `border-brand-500/30 border-t-brand-400` tetap (sudah netral), text `text-slate-400` → `text-slate-500` boleh; biarkan jika sudah kontras.
- Tombol "Ke lobby"/"Coba lagi" di state error/no-name: `bg-indigo-500 hover:bg-indigo-600`, secondary `border-white/30 text-slate-300 hover:bg-white/10`.

- [ ] **Step 2: Verifikasi build + test**

Run: `cd frontend && npm run build && npm test`
Expected: build sukses, test pass.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Room.jsx
git commit -m "style: room header glass bar"
```

### Task 4: QualityToggle segmented control macOS + fallback App

**Files:**
- Modify: `frontend/src/components/QualityToggle.jsx`, `frontend/src/App.jsx`

**Interfaces:**
- Consumes: tidak ada; hanya className.

- [ ] **Step 1: Restyle `QualityToggle.jsx`**

- Container: `border-white/60 bg-white/50 backdrop-blur-xl` (compact di Room: tetap bekerja karena Room dark — untuk compact di header dark, pakai `border-white/20 bg-white/10`; buat varian via prop `compact` yang sudah ada: `compact ? 'border-white/20 bg-white/10 backdrop-blur-xl' : 'border-white/60 bg-white/50 backdrop-blur-xl'`).
- Item aktif: `bg-white text-indigo-600 shadow-sm` (non-compact); compact aktif: `bg-white/90 text-indigo-600`.
- Item tidak aktif: non-compact `text-slate-600 hover:bg-white/60 hover:text-slate-900`; compact `text-slate-300 hover:bg-white/10 hover:text-white`.

- [ ] **Step 2: Restyle `App.jsx` RoomFallback**

- Spinner: `border-indigo-300 border-t-indigo-500`, text `text-slate-500`.

- [ ] **Step 3: Verifikasi build + test**

Run: `cd frontend && npm run build && npm test`
Expected: build sukses, test pass.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/QualityToggle.jsx frontend/src/App.jsx
git commit -m "style: macOS segmented control quality toggle"
```

### Task 5: Verifikasi akhir manual

- [ ] **Step 1: Jalankan dev server, cek visual**

Run: `cd frontend && npm run dev` (background)
Cek: lobby panel kaca di atas gradasi cerah, kontras teks cukup, quality toggle seperti segmented control macOS. Room butuh backend LiveKit — cukup verifikasi render header via screenshot atau code review jika backend tidak jalan.

- [ ] **Step 2: Commit design doc + plan**

```bash
git add docs/superpowers/
git commit -m "docs: glassmorphism design doc and plan"
```
