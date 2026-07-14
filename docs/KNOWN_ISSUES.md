# Known Issues — Private Beta

Last updated: Sprint 6.2 (2026-07-11)

## Critical blockers (must fix before invite)

| ID | Issue | Status |
|----|-------|--------|
| B-001 | Closed signup not enforced | **Fixed in code** — Auth hook must still be **enabled in Dashboard** |
| B-002 | Migrations must be applied in prod | **Open** — include `0010` |
| B-003 | `NEXT_PUBLIC_SITE_URL` required | **Open** — set on Vercel |
| B-004 | Auth hook not enabled until Dashboard step | **Open** — see `docs/Beta.md` |

## High priority

| ID | Issue | Notes |
|----|-------|-------|
| H-001 | Legal Privacy/Terms are beta drafts | Labelled in app |
| H-002 | Calm audio is placeholder WAV | Replace before App Store |
| H-003 | Account deletion is manual | Documented |
| H-004 | No self-service Circle leave/rematch | Help & feedback |
| H-005 | Realtime channels lack server-side authorization | Client gates join |
| H-006 | `map_presence` exposes `parent_id` | Acceptable for ~10 testers |
| H-007 | Revocation does not kill existing sessions | Disable Auth user manually |

## Medium priority

| ID | Issue | Notes |
|----|-------|-------|
| M-001 | Nav unread hint updates on navigation | In-session Circle OK |
| M-002 | Onboarding trap if `family_id` missing | Rare |
| M-003 | iOS Safari Calm background unreliable | Documented |
| M-004 | No E2E tests | Unit logic only |
| M-005 | No CI pipeline | Manual checks |

## Excluded from beta (by design)

- Open signup, invitations UI, billing, push, AI, public directory, admin dashboards, growth charts
