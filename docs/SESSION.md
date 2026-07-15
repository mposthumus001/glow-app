# Glow Current Session

## Date

2026-07-15

## Current Version

v0.10.0-beta.2

## Active Sprint

**Synthetic Atlas Preview (complete) + Glow Atlas MapLibre Replacement (A–E)**

Optional renderer-only ambient density (~5,000 deterministic lights) for
sparse-beta visual density, kept completely separate from real presence —
see `docs/GlowAtlas.md` → Synthetic Atlas Preview. Prior MapLibre
replacement (Checkpoints A–E) remains the base architecture.

### Verification status

Synthetic preview: unit tests cover allocation, determinism, containment,
and isolation from `buildPresenceGeoJson`; lint/build/test re-run for this
pass. Enable locally with `NEXT_PUBLIC_ATLAS_SYNTHETIC_PREVIEW=true` (see
`.env.example`). MapLibre A–E verification status from the previous
session still applies (310+ tests; PMTiles was verified against a public
third-party build only).

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
