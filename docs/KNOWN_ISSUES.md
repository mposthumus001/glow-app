# Known Issues — Private Beta

Last updated: Sprint 6.1 (2026-07-11)

## Critical blockers (must fix before invite)

| ID | Issue | Workaround | Target |
|----|-------|------------|--------|
| B-001 | Closed signup not enforced in app | Manually monitor signups; use obscured URL | Sprint 6.2 — Supabase Auth hook |
| B-002 | Migrations must be applied in prod | Run `supabase db push` or SQL dashboard | Before invite |
| B-003 | `NEXT_PUBLIC_SITE_URL` required for password reset | Set on Vercel | Before invite |

## High priority

| ID | Issue | Notes |
|----|-------|-------|
| H-001 | Legal Privacy/Terms are beta drafts | Labelled in app; counsel review before public launch |
| H-002 | Calm audio is placeholder WAV | Marked in UI; replace before App Store |
| H-003 | Account deletion is manual | Documented in Account settings |
| H-004 | No self-service Circle leave/rematch | Use Help & feedback |
| H-005 | Realtime channels lack server-side authorization | Client gates join after assignment |
| H-006 | `map_presence` exposes `parent_id` | Acceptable for 10 testers; revisit before scale |

## Medium priority

| ID | Issue | Notes |
|----|-------|-------|
| M-001 | Nav unread hint updates on navigation, not live globally | In-session Circle updates work |
| M-002 | Onboarding trap if `family_id` missing | Rare; needs admin fix |
| M-003 | iOS Safari Calm background playback unreliable | Documented in `docs/Calm.md` |
| M-004 | No E2E or integration tests for realtime services | Unit logic tests only |
| M-005 | No CI pipeline | Manual lint/build/test before deploy |
| M-006 | Circle co-members can SELECT full `parents` row (0009 scoped) | App queries minimal columns |

## Excluded from beta (by design)

- Billing, push notifications, AI, public directory, automated moderation, growth charts
