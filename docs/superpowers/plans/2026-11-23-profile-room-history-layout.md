# Profile, Room History, and Desktop Camera Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Persist browser preferences in cookies, support active-room name editing, and contain desktop camera tiles.

**Architecture:** Add pure cookie/history helpers, wire them through Lobby and App, reconnect Room on name change, then constrain conference sizing in CSS.

**Tech Stack:** React, LiveKit Components, Vite, Node test runner, CSS.

**Spec:** `docs/superpowers/specs/2026-11-23-profile-room-history-design.md`

## Global Constraints

- Cookies only for browser persistence; no localStorage.
- Room history maximum is eight codes.
- Rename must obtain a fresh token for new LiveKit identity.
- Mobile behavior must remain unchanged.

## Review Focus

- Malformed cookie JSON must not crash lobby; test cookie parser fallback in `cookieStore.test.js`.
- Room history must deduplicate and cap at eight; test in `cookieStore.test.js`.
- Empty/whitespace name cannot be saved; existing username validation plus Room editor test coverage.
- Rename token failure must retain current room/name; test through pure callback behavior where practical.
- Desktop grid intrinsic sizing must not create horizontal overflow; build verification plus CSS review.

### Task 1: Cookie and room-history storage

**Files:**
- Create: `frontend/src/lib/cookieStore.js`
- Create: `frontend/test/cookieStore.test.js`

- [ ] Write failing tests for cookie read/write, malformed JSON fallback, deduplicated eight-item history, and safe non-browser behavior.
- [ ] Run `npm test -- test/cookieStore.test.js`; confirm expected failures.
- [ ] Implement `readCookie`, `writeCookie`, `readRoomHistory`, and `rememberRoom` with URL encoding and one-year expiry.
- [ ] Run focused test, then full `npm test`.

### Task 2: Cookie-backed lobby preferences

**Files:**
- Modify: `frontend/src/pages/Lobby.jsx`

- [ ] Replace localStorage helpers with cookie helpers.
- [ ] Add recent room buttons populated from cookie history and write successful room joins.
- [ ] Run frontend tests and build.

### Task 3: Inline room rename and token refresh

**Files:**
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/pages/Room.jsx`
- Modify: `frontend/src/lib/appState.js`

- [ ] Add failing pure tests if a new helper is needed for rename validation.
- [ ] Add App `onNameChange` flow: request token with same room/new name, update session, navigate with new name.
- [ ] Add Room header edit/cancel/save controls and loading/error state.
- [ ] Include name in `roomRenderKey` so LiveKit reconnects on identity change, but keep quality changes stable.
- [ ] Run full tests and build.

### Task 4: Desktop overflow fix

**Files:**
- Modify: `frontend/src/index.css`

- [ ] Add `min-width: 0`, `max-width: 100%`, and bounded overflow rules at room, LiveKit, conference, grid, and tile boundaries.
- [ ] Keep mobile container-query grid rules intact.
- [ ] Run full tests and production build.

### Task 5: Final verification

- [ ] Run `npm test` in `frontend`.
- [ ] Run `npm run build` in `frontend`.
- [ ] Inspect `git diff` for localStorage remnants, cookie names, rename flow, and desktop CSS.
