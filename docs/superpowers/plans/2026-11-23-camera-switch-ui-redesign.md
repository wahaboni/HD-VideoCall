# Camera Switch Fix dan Tailwind UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hentikan reconnect kamera saat quality berubah dan beri lobby/room tema dark glass/neon responsive.

**Architecture:** Stabilkan identity `Room` di `App.jsx`, sehingga `LiveKitRoom` tetap mounted saat quality route berubah. Restyle existing components dengan Tailwind classes dan CSS tokens tanpa dependency UI baru.

**Tech Stack:** React 19, LiveKit React, Tailwind CSS 4, Vite, Node test runner.

**Spec:** `docs/superpowers/specs/2026-11-23-camera-switch-ui-redesign-design.md`

## Global Constraints

- Ganti quality tanpa disconnect/reconnect LiveKit.
- Tidak mengubah API token, LiveKit server, TURN, atau deployment.
- Tidak menambah dependency UI.
- Control bar, chat, kamera, mikrofon, screen share tetap berfungsi.
- Tema dark glass/neon responsive desktop/mobile.
- Focus ring, keyboard navigation, dan label accessible tetap ada.

## Review Focus

- Quality route change must preserve `Room`/LiveKit identity — regression test/helper.
- Manual quality change must not clear credentials/session — App review.
- AUTO quality must continue updating capture after stable key change — existing quality/build verification.
- Mobile lobby fields and CTA must remain usable — responsive CSS review.
- Chat panel/control bar must remain above participant grid — Room CSS review.

---

### Task 1: Camera lifecycle regression fix

**Files:**
- Modify: `frontend/src/App.jsx`
- Test: `frontend/test/appState.test.js` (create if needed)

**Interfaces:**
- Room render identity must remain stable across `route.quality` changes.

- [ ] **Step 1: Add failing pure helper/test** proving room identity excludes quality.
- [ ] **Step 2: Run focused test; verify fail against current key behavior.**
- [ ] **Step 3: Implement stable key** using room identity only; preserve route quality prop and quality callback.
- [ ] **Step 4: Run full frontend tests; verify pass.**
- [ ] **Step 5: Commit** `fix: keep camera connected during quality changes`.

### Task 2: Dark glass/neon design tokens and global chrome

**Files:**
- Modify: `frontend/src/index.css`
- Modify: `frontend/src/App.jsx`

- [ ] **Step 1: Add dark background, ambient gradients, glass panel tokens, focus styles, and scrollbar styling.**
- [ ] **Step 2: Update app shell classes** so lobby and room share dark theme without changing routing.
- [ ] **Step 3: Run frontend build; verify CSS compiles.**

### Task 3: Lobby and quality selector redesign

**Files:**
- Modify: `frontend/src/pages/Lobby.jsx`
- Modify: `frontend/src/components/QualityToggle.jsx`

- [ ] **Step 1: Restyle lobby header, form panel, inputs, helper/error states, and join CTA using Tailwind utilities.**
- [ ] **Step 2: Restyle QualityToggle** with AUTO emphasis, active state, keyboard focus, and responsive labels.
- [ ] **Step 3: Run frontend tests and build; verify route/quality behavior unchanged.**

### Task 4: Room UI polish

**Files:**
- Modify: `frontend/src/pages/Room.jsx`
- Modify: `frontend/src/index.css`

- [ ] **Step 1: Restyle room header, status badge, share popup, quality controls, and leave action.**
- [ ] **Step 2: Improve participant grid/control bar/chat layering for dark theme and mobile.**
- [ ] **Step 3: Run full frontend/backend tests and frontend build.**
- [ ] **Step 4: Run `git diff --check`, inspect diff, commit** `feat: redesign video call interface`.
- [ ] **Step 5: Push to configured GitHub remote.**
