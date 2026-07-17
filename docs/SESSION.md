# Glow Current Session

## Date

2026-07-17

## Current Version

v0.11.0-beta.1

## Active work

**Milestone 9 — Sprint 9.2A secure Moments processing (implemented; migration apply + Vercel env; UI in 9.2B)**

### Delivered in code

- Migration `0015_moments_foundation.sql` + `0016_moments_image_processing.sql`
- Trusted processing: `sharp`, `processMomentMedia`, `POST /api/moments/process`
- Server-only admin client (`SUPABASE_SERVICE_ROLE_KEY`)
- Typed outcomes for Sprint 9.2B UI
- Ops: `moments-retry-processing.sql`, updated orphan cleanup
- Feature flag `NEXT_PUBLIC_MOMENTS_ENABLED=false` (unchanged)

### Before enabling album UI (Sprint 9.2B)

1. Apply migrations `0015` + `0016` to staging/production
2. Set `SUPABASE_SERVICE_ROLE_KEY` on Vercel (server env only)
3. Run `moments-verify-rls.sql` + retry/orphan ops review
4. Legal review for children's photos

## Previous — Milestone 9 architecture spec

### Delivered in code

- Sentry SDK (`@sentry/nextjs`) with privacy scrubbing and feature-scoped error boundaries
- Structured beta feedback (`beta_feedback` table + enhanced `/profile/help` form)
- App version `0.11.0-beta.1` on About + feedback metadata

### Ops before testers

1. Apply migration `0014_beta_feedback.sql` (and `0013` if not yet applied)
