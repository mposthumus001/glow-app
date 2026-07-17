# Glow Current Session

## Date

2026-07-17

## Current Version

v0.11.0-beta.1

## Active work

**Milestone 9 — Sprint 9.2B Baby Moments album UI (implemented; flag off until QA)**

### Delivered in code

- Baby page `MomentsPreviewCard` (feature-flagged)
- Routes: `/baby/[babyId]/moments`, `/new`, `/[momentId]`
- Create → signed upload → processing → detail flow with retry polling
- Delete (soft) + favourite toggle server actions
- Tests: `momentsUi.test.ts`
- Repair migrations `0017` + `0018` for partial 0016 apply (ops)

### Before enabling for beta testers

1. Apply migrations `0015` + repair path `0017`/`0018` (or full `0016` on fresh env)
2. Run `moments-verify-0018-repair.sql` — all PASS
3. Set `SUPABASE_SERVICE_ROLE_KEY` on Vercel
4. QA with `NEXT_PUBLIC_MOMENTS_ENABLED=true` on preview
5. Legal review for children's photos

## Previous — Sprint 9.2A secure processing

- Migration `0016` / repair `0017`+`0018`, `sharp` worker, typed outcomes
- Feature flag `NEXT_PUBLIC_MOMENTS_ENABLED=false` (unchanged)
