# Glow Current Session

## Date

2026-07-11

## Current Version

v0.10.0-beta.1

## Active Sprint

**Milestone 6 — Sprint 6.1: Private Beta Audit and Hardening**

## Sprint 6.1 completed

* Full route inventory (20 routes — 16 authenticated, 4 public)
* Authentication audit + password recovery completion UI
* Tonight mock data removed — live Circle preview
* RLS hardening migration `0009`
* Calm user-facing error mapping
* `not-found.tsx` for root and `(app)`
* Audit documentation suite
* Targeted tests (22 unit tests)
* `npm run lint`, `build`, `test` — awaiting final run in this session

## Files created (Sprint 6.1)

* `supabase/migrations/0009_beta_rls_hardening.sql`
* `docs/RLS_ACCESS_MATRIX.md`
* `docs/SECURITY_AUDIT.md`
* `docs/BETA_TEST_CHECKLIST.md`
* `docs/KNOWN_ISSUES.md`
* `docs/RELEASE_CHECKLIST.md`
* `.env.example`
* `src/lib/errors/calm-messages.ts`
* `src/lib/errors/report-client-error.ts`
* `src/features/profile/components/PasswordRecoveryPanel.tsx`
* `src/components/auth/ForgotPasswordForm.tsx`
* `src/app/not-found.tsx`
* `src/app/(app)/not-found.tsx`
* `src/components/tonight/tonightCirclePreview.ts`

## Remaining before inviting testers

* Apply migrations `0001`–`0009` to production Supabase
* Configure `NEXT_PUBLIC_SITE_URL` on Vercel
* Seed `beta_testers` with invited emails
* Run `docs/BETA_TEST_CHECKLIST.md` (two-account tests)
* Implement closed signup gate (Sprint 6.2 — Auth hook) OR accept manual monitoring
* Legal review scheduling for public launch

## Next Sprint

Sprint 6.2 — Closed beta access enforcement + production monitoring setup

## Known Issues

See `docs/KNOWN_ISSUES.md`
