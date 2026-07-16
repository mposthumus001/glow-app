# Glow Current Session

## Date

2026-07-16

## Current Version

v0.10.0-beta.2

## Active work

**Production Circle assignment (complete in code — apply migration 0013 in Supabase)**

Post-onboarding `assignParentToBestCircle` → `assign_parent_to_circle`:
matches active Circles with capacity only; returns `no_match` instead of
auto-creating Circles. Onboarding still succeeds and redirects to `/circle`.

Also completed earlier this session: password recovery (`/auth/reset-password`)
and Synthetic Atlas Preview / MapLibre Atlas work (see CHANGELOG).

### Ops before testers hit assignment gaps

1. Apply migration `0013_circle_assignment_no_auto_create.sql` to production Supabase.
2. Ensure seeded `circles` (`status = active`) + `circle_rules` cover invited tester cohorts (state / age bands).
3. Run `supabase/ops/circle-assignment-admin-check.sql` after first onboardings — resolve unmatched parents by adding Circles/rules or manual staff membership insert.
4. Keep QA same-circle script Circles **without** `circle_rules` so auto-assignment never steals QA seats (`qa-same-circle.template.sql`).

## Previous — Password recovery

Dedicated `/auth/reset-password` + PKCE callback `next` validation. Allow Redirect URLs in Supabase Dashboard (see `.env.example` / ProfileSettings.md).

## Previous — Synthetic Atlas Preview + MapLibre A–E

See `docs/GlowAtlas.md`. Optional `NEXT_PUBLIC_ATLAS_SYNTHETIC_PREVIEW=true`.

## Previous sprint — Milestone 6 — Sprint 6.2: Closed Beta Access

## Remaining before inviting testers (ops)

1. Apply migrations `0001`–`0013` to production Supabase
2. **Enable** Before User Created hook in Dashboard → `hook_before_user_created_beta_allowlist`
3. Configure `NEXT_PUBLIC_SITE_URL` on Vercel
4. Seed ~10 invited emails (local template — never commit real emails)
5. Seed / verify active Circles + rules for those cohorts
6. Run audit query for existing Auth users missing from allowlist
7. Complete `docs/BETA_TEST_CHECKLIST.md` including C9–C11 Circle assignment
8. Legal draft acceptance for closed beta

## Architecture note

Auth hook is available on Free and Pro. Function exists after migration; **Dashboard enablement is mandatory**. Circle membership inserts remain SECURITY DEFINER / staff-only — never expose service role to the client.

## Known Issues

See `docs/KNOWN_ISSUES.md`
