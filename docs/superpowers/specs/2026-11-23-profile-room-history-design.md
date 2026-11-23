# Profile, Room History, and Desktop Camera Layout

## Intent

Keep browser-only preferences in cookies and let a participant edit their name from an active room. Fix desktop participant tiles so camera content stays inside monitor width.

## Goals

- Persist name, quality, and up to eight recent room codes in cookies.
- Remove existing localStorage persistence.
- Show recent room codes in lobby and let user reuse one.
- Edit name inline in room header; fetch a new token and reconnect with new identity.
- Keep mobile layout unchanged.
- Prevent grid/tile intrinsic sizing from creating horizontal overflow on large screens.

## Non-goals

- Server-side profile storage.
- Renaming another participant.
- Changing LiveKit video crop behavior.

## Approaches

1. Cookies plus reconnect on rename (chosen): browser-only, survives reload, token identity stays correct.
2. localStorage plus display-only rename: easier but violates cookie requirement and leaves LiveKit identity stale.
3. Server profile API: unnecessary persistence and extra backend scope.

## Design

Cookie helpers provide safe read/write, JSON room history parsing, and one-year expiry. Lobby writes name/quality/history after successful token fetch. Room exposes an inline name editor and delegates token refresh to App. App remounts Room using room plus name, preserving quality changes without remounting. CSS applies `min-width: 0`, bounded grid tracks, and hidden overflow at room/conference boundaries.

## Constraints

- Existing React, Vite, LiveKit, and Node test stack.
- Cookie values URL-encoded; malformed cookie data falls back safely.
- No new dependency.
