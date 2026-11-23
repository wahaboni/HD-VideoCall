# Auto-fit Participant Grid Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Buat semua participant tile LiveKit otomatis mengisi area video sesuai jumlah peserta.

**Architecture:** Pertahankan subscription dan lifecycle LiveKit dengan `useTracks`/`ParticipantTile`. Render tile langsung dalam CSS grid agar tidak terkena pagination adaptif bawaan `GridLayout`; CSS `:has()` dan container breakpoint mengubah jumlah kolom otomatis ketika peserta masuk/keluar.

**Tech Stack:** React 19, `@livekit/components-react`, LiveKit component styles, Tailwind/CSS, Vite.

**Spec:** `docs/superpowers/specs/2026-11-23-auto-fit-participant-grid-design.md`

## Global Constraints

- 1 peserta: satu tile memenuhi area.
- 2 peserta: dua kolom.
- 3–4 peserta: grid dua kolom.
- 5–6 peserta: grid tiga kolom.
- 7+ peserta: grid responsif dengan kolom maksimum empat.
- Tile memakai `object-fit: cover`, tanpa distorsi.
- Tidak mengubah AUTO quality, audio, chat, screen share, atau kontrol room.

## Review Focus

- Empty/loading state tidak boleh membuat layout rusak — preserve LiveKit room container.
- Satu tile harus benar-benar penuh, bukan tile kecil di tengah — CSS child-count rule.
- Tiga peserta pada mobile harus tetap terbaca — mobile breakpoint test/manual check.
- Screen share tile tetap masuk grid — use `ParticipantTile`, bukan custom video element.
- Controls tetap terlihat — preserve `VideoConference` control bar.

---

### Task 1: Replace default conference layout

**Files:**
- Modify: `frontend/src/pages/Room.jsx`

**Interfaces:**
- Replace `VideoConference` video area with `useTracks` and `ParticipantTile` from `@livekit/components-react`.
- Keep `RoomAudioRenderer`, `LiveKitRoom`, AUTO controller, and room controls unchanged.

- [ ] **Step 1: Update imports and render** to use `useTracks`/`ParticipantTile` in a `.lk-grid-layout` container; preserve controls with `ControlBar` and chat with `Chat`.
- [ ] **Step 2: Run `cd frontend && npm run build`; verify component exports compile.**
- [ ] **Step 3: Keep the existing LiveKit control bar, chat, and participant behavior intact.**

### Task 2: Full-screen responsive grid CSS

**Files:**
- Modify: `frontend/src/index.css`

**Interfaces:**
- `.hdvc-room .lk-grid-layout` fills available width/height and uses CSS grid.
- Child count selectors set columns: 1, 2, 3, then max 4.

- [x] **Step 1: Add CSS rules** for full-size grid, `minmax(0, 1fr)` tracks, tile minimum size, and `object-fit: cover`.
- [x] **Step 2: Add child-count rules**: one child one column; two to four two columns; five or six three columns; seven or more four columns.
- [x] **Step 3: Add narrow viewport override** to prevent unusable tiles while keeping all participants visible.
- [x] **Step 4: Run `cd frontend && npm test && npm run build`; verify all tests and build pass.**

### Task 3: Final verification and commit

**Files:**
- Modify: `docs/superpowers/specs/2026-11-23-auto-fit-participant-grid-design.md`
- Modify: `docs/superpowers/plans/2026-11-23-auto-fit-participant-grid.md`

- [ ] **Step 1: Run full frontend tests and build.**
- [ ] **Step 2: Manually verify rooms with 1, 2, 3, and 4 participants; verify participant join/leave changes grid.**
- [ ] **Step 3: Run `git diff --check` and inspect diff.**
- [ ] **Step 4: Commit** `feat: auto fit participant video grid`.
- [ ] **Step 5: Push** to configured GitHub remote after verification.
