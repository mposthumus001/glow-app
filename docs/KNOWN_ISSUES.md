# Known Issues — Private Beta

Last updated: Glow Atlas MapLibre Replacement (2026-07-15)

## Glow Atlas MapLibre Replacement (2026-07-15)

- **City/suburb badge disclosure still uses the old SVG-percentage collision
  math.** `useGlowAtlas.ts` still runs `applyViewportCollision` (via
  `utils/zoom.ts`'s `projectOverlayPoint`) against a percent-of-viewBox
  projection to decide which city/suburb badges are promoted to interactive
  vs demoted to `lightOnly`. On-screen *position* comes from real MapLibre
  `<Marker>` coordinates, not this projection — but the *keep/reject*
  disclosure decision itself is still shaped by the old SVG-space math, not
  a real MapLibre-pixel collision pass. Has read correctly in every manual
  check across this project; flagged as an architectural mismatch worth a
  dedicated follow-up. See `docs/GlowAtlas.md` → Known risks.
- **PMTiles production hosting is not yet configured** —
  `NEXT_PUBLIC_ATLAS_PMTILES_URL` is optional and the app degrades cleanly
  without it (local GeoJSON + presence only), but end-to-end verification
  in this project so far used a public third-party Protomaps daily build for
  local development, not a project-controlled production CDN/object-storage
  host. Confirm byte-range support (`Accept-Ranges`/`206 Partial Content`)
  on whatever host is chosen before enabling this in production.
- **Suburb/city data coverage is unchanged and still sparse** — only 6 of 27
  cities have suburb data; TAS/NT have none yet. Not addressed by the
  MapLibre migration, see `docs/GlowAtlas.md` → Known follow-ups.
- Manual visual/gesture QA across every checkpoint of this work (country,
  state, city, suburb levels; 360px/390px/tablet/desktop; PMTiles success/
  missing-URL/failure fallback; keyboard-only navigation; reduced motion
  on/off) was performed with Puppeteer against a local dev server. `npm run
  lint`, `npm run build`, and `npm test` were run and passing at the end of
  this work (310/310 tests) — see `docs/SESSION.md`. A final manual pass on
  a real device is still recommended before shipping, same as any release.

## Historical — Glow Atlas Redesign verification gap (2026-07-14, SVG era)

The SVG-illustration Glow Atlas this MapLibre work replaced was, at the time,
built during a session where the IDE shell tool was unresponsive for the
back half — `npm run lint`/`build`/`test` were not run that session, verified
by direct source review only. That implementation no longer exists (see
above), so this gap is now moot, but is kept here for the historical record.

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
| M-006 | Glow Atlas suburb/city data coverage is sparse | Only 6 of 27 cities have suburb data; TAS/NT have none. Not addressed by the MapLibre replacement — flagged as a separate follow-up in `docs/GlowAtlas.md` |
| M-007 | Glow Atlas city/suburb badge disclosure still uses SVG-percentage collision math internally | Position rendering is real-geo; the keep/reject *decision* for which badges are interactive still runs on the old projection. See `docs/GlowAtlas.md` → Known risks |
| M-008 | Glow Atlas PMTiles verified only against a public third-party build, not a production host | Confirm byte-range support on the chosen production CDN/object storage before enabling `NEXT_PUBLIC_ATLAS_PMTILES_URL` in production |

## Excluded from beta (by design)

- Open signup, invitations UI, billing, push, AI, public directory, admin dashboards, growth charts
