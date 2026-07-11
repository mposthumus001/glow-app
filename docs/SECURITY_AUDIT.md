# Security Audit — Sprint 6.1 Private Beta

Date: 2026-07-11  
Scope: ~10 controlled testers  
Auditor: Glow Release Manager (automated + code review)

## Executive summary

Glow is **conditionally ready** for a closed private beta after:

1. Applying migrations `0001`–`0009` to production Supabase
2. Configuring `NEXT_PUBLIC_SITE_URL` on Vercel
3. Seeding `beta_testers` allowlist (see `docs/Beta.md`)
4. Completing two-account manual smoke tests

**Critical issues fixed in this sprint:** global `parents` enumeration, unrestricted `parent_baby_age_months`, missing password-reset completion UI, raw auth errors in forms.

**Critical issues remaining:** closed signup gate not yet enforced in app (recommendation documented); legal policies are drafts.

---

## 1. Authentication

| Check | Status | Notes |
|-------|--------|-------|
| Sign up | ✅ | Email confirmation path handled |
| Sign in | ✅ | Calm error mapping added |
| Sign out | ✅ | Stops Calm, marks presence offline |
| Session refresh | ✅ | `proxy.ts` + Supabase SSR |
| Onboarding gate | ✅ | `requireAppUser()` |
| Password reset email | ✅ | Account + login forgot-password |
| Set new password after link | ✅ Fixed | `PasswordRecoveryPanel` |
| Auth loops | ✅ | No infinite redirect found |
| Beta closed signup | ⚠️ Recommended | Not implemented — see Beta access |

## 2. Secrets & environment

| Check | Status |
|-------|--------|
| `.env*` gitignored | ✅ |
| No committed secrets | ✅ |
| No service-role in `src/` | ✅ |
| Anon key only in browser | ✅ |
| `.env.example` added | ✅ |
| `NEXT_PUBLIC_SITE_URL` documented | ✅ Required for prod reset links |

## 3. Data isolation

| Domain | Status | Notes |
|--------|--------|-------|
| Families / babies / events | ✅ | Family-scoped RLS |
| Circles / messages | ✅ | Active membership required |
| Cross-circle isolation | ✅ | Message RLS by `circle_id` |
| Feedback / deletion | ✅ | Own rows only |
| Parent profiles | ✅ Fixed (0009) | Was global SELECT |
| Map presence deanonymization | ⚠️ | `map_presence` exposes `parent_id` — acceptable for 10 testers with documentation |

## 4. Client error exposure

| Surface | Status |
|---------|--------|
| Login / signup | ✅ Calm mapping |
| Profile server actions | ✅ Calm mapping |
| Circle / baby APIs | ✅ Mostly calm messages at UI layer |
| Route errors | ✅ `ShellError` — no stack traces |
| Dev error reporting | ✅ Digest + route only |

## 5. Console hygiene

| Check | Status |
|-------|--------|
| `console.log` in `src/` | ✅ None found |
| React warnings | ⚠️ | Requires manual browser pass |
| Production debug logs | ✅ `reportClientError` dev-only |

## 6. Audio & assets

| Asset | Status |
|-------|--------|
| Calm placeholders | ⚠️ | Glow-generated WAVs — marked beta placeholders |
| Atlas SVG | ✅ | Licensed files in `assets/` |
| No private files in public buckets | ✅ | No user uploads in beta |

## 7. Legal & trust

| Document | Status |
|----------|--------|
| Privacy draft | ⚠️ Beta draft label |
| Terms draft | ⚠️ Beta draft label |
| Safety copy | ✅ Crisis numbers present |
| Account deletion | ✅ Request flow; manual processing |

## 8. Monitoring

| Capability | Status |
|------------|--------|
| Error monitoring SDK | ❌ Not installed |
| Vercel deployment alerts | ⚠️ Configure in Vercel dashboard |
| Supabase logs | ⚠️ Manual review |
| Client error boundary | ✅ Minimal dev reporting |

**Recommended:** Sentry (or Vercel Web Analytics + Sentry) with `beforeSend` scrubbing — no message bodies, baby notes, or email fields.

## 9. Fixes applied this sprint

- Migration `0009_beta_rls_hardening.sql`
- Password recovery UI + login forgot-password
- Tonight Circle card uses live data (removed mock)
- `not-found.tsx` for root and `(app)`
- Calm user-facing error helper
- `.env.example`

## 10. Pre-invite gate

Do **not** invite external testers until:

- [ ] All migrations applied
- [ ] `NEXT_PUBLIC_SITE_URL` set on production
- [ ] `beta_testers` seeded with invited emails
- [ ] Two-account smoke test passed (see `docs/BETA_TEST_CHECKLIST.md`)
- [ ] Michael confirms legal draft acceptance for beta
