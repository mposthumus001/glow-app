# Glow Current Session

## Date

2026-07-16

## Current Version

v0.11.0-beta.1

## Active work

**Sprint 7.1 — Private Beta Hardening (lint/build/test green; awaiting migration apply, Sentry project setup, manual QA, commit, push, deploy)**

### Delivered in code

- Sentry SDK (`@sentry/nextjs`) with privacy scrubbing and feature-scoped error boundaries
- Structured beta feedback (`beta_feedback` table + enhanced `/profile/help` form)
- App version `0.11.0-beta.1` on About + feedback metadata

### Ops before testers

1. Apply migration `0014_beta_feedback.sql` (and `0013` if not yet applied)
2. Create Sentry project; set `NEXT_PUBLIC_SENTRY_DSN` on Vercel
3. Optional: `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` for source maps
4. Run `docs/BETA_TEST_CHECKLIST.md` monitoring + feedback items
5. Verify Sentry receives a test error without PII

## Previous — Production Circle assignment

Migration `0013` — no auto-create Circles; holding state on `/circle`.

## Previous — Password recovery

Dedicated `/auth/reset-password` + PKCE callback `next` validation.

## Remaining before inviting testers (ops)

1. Apply migrations `0001`–`0014` to production Supabase
2. **Enable** Before User Created hook in Dashboard
3. Configure `NEXT_PUBLIC_SITE_URL` on Vercel
4. Configure Sentry (recommended)
5. Seed ~10 invited emails
6. Seed / verify active Circles + rules for cohorts
7. Complete `docs/BETA_TEST_CHECKLIST.md`
8. Legal draft acceptance for closed beta

## Known Issues

See `docs/KNOWN_ISSUES.md`
