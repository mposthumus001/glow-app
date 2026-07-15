# Glow Current Session

## Date

2026-07-15

## Current Version

v0.10.0-beta.2

## Active Sprint

**Glow Atlas MapLibre Replacement — Checkpoints A–E (complete)**

Replaced the SVG-illustration Glow Atlas with a real MapLibre GL JS map:
local Australia states GeoJSON (Natural Earth 1:10m) as the always-present
base layer with optional PMTiles context + graceful fallback, geography-
derived camera/`fitBounds` hierarchy, privacy-safe presence GeoJSON with
halo/core GL layers and realtime `source.setData` updates, disclosed
interactive badges as real-geo `<Marker>`s (all 8 national labels visible),
accessibility/reduced-motion/performance hardening, and retirement of the
now-superseded SVG rendering path. See `docs/GlowAtlas.md` for the full
architecture record and `docs/CHANGELOG.md` (Unreleased) for the itemised
diff.

### Verification status

Unlike the previous "Glow Atlas Redesign" sprint below, this sprint's
`npm run lint` / `npm run build` / `npm test` and manual multi-viewport
(360px/390px/tablet/desktop), reduced-motion, keyboard-only, and PMTiles
success/missing-URL/failure-fallback checks **were run repeatedly across
every checkpoint** (via the Shell tool and headless-browser screenshotting),
not skipped. `npm test` currently passes 310/310. Two pre-existing lint
warnings unrelated to this work remain (see `docs/KNOWN_ISSUES.md`). The one
real-PMTiles-hosting verification used a public third-party daily build, not
a project-controlled production host — see `docs/KNOWN_ISSUES.md` for what
that pass did and didn't confirm before treating this as production-ready.

## Previous sprint — Glow Atlas Redesign — Checkpoints A–E (SVG-era, complete, since replaced)

Full audit + redesign of the original SVG-illustration Glow Atlas: real
lat/lng projection with documented display offsets, generalized badge
disclosure/collision, a materially redesigned visual treatment, motion/
a11y/performance/privacy hardening, and dead-component cleanup. This SVG
implementation has since been entirely replaced by the MapLibre sprint
above; see "Removed SVG architecture" in `docs/GlowAtlas.md`.

## Previous sprint — Milestone 6 — Sprint 6.2: Closed Beta Access and Production Launch Controls

## Sprint 6.2 completed (code)

* Migration `0010_closed_beta_access.sql` — allowlist status lifecycle + Auth hook function + boolean RPC
* Signup UX — private beta copy + server-side allowlist check
* Login copy — invited testers only
* Seed template + gitignored local seed file
* Env validation for required public vars
* Docs + checklist updates
* Unit tests for normalisation, env checks, RLS contracts

## Remaining before inviting testers (ops)

1. Apply migrations `0001`–`0010` to production Supabase
2. **Enable** Before User Created hook in Dashboard → `hook_before_user_created_beta_allowlist`
3. Configure `NEXT_PUBLIC_SITE_URL` on Vercel
4. Seed ~10 invited emails (local template — never commit real emails)
5. Run audit query for existing Auth users missing from allowlist
6. Complete `docs/BETA_TEST_CHECKLIST.md` including closed-access section
7. Legal draft acceptance for closed beta

## Architecture note

Auth hook is available on Free and Pro. Function exists after migration; **Dashboard enablement is mandatory**.

## Known Issues

See `docs/KNOWN_ISSUES.md`
