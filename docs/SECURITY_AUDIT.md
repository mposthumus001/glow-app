# Security Audit — Private Beta

Date: 2026-07-11 (updated Sprint 6.2)  
Scope: ~10 controlled testers

## Executive summary

Glow is **conditionally ready** for closed private beta after ops complete:

1. Apply migrations `0001`–`0010`
2. **Enable** Before User Created hook in Supabase Dashboard
3. Configure `NEXT_PUBLIC_SITE_URL`
4. Seed `beta_testers` (~10 emails)
5. Complete smoke tests including closed-access section

**Sprint 6.2 closed:** allowlist schema, Auth hook function, app UX gate, calm denial copy, seed template, docs.

---

## 1. Authentication

| Check | Status | Notes |
|-------|--------|-------|
| Sign up | ✅ Closed | Allowlist + Auth hook + app check |
| Sign in | ✅ | Existing accounts unaffected by allowlist |
| Password reset | ✅ | Existing accounts — not gated by allowlist |
| Beta closed signup | ✅ Code | Dashboard hook enable still required |
| Auth loops | ✅ | None |

## 2. Secrets & environment

| Check | Status |
|-------|--------|
| `.env*` gitignored | ✅ |
| No service-role in client | ✅ |
| `.env.example` | ✅ |
| Production env assert | ✅ `assertRequiredPublicEnv` in server client |
| Real tester emails not committed | ✅ Template + gitignored local file |

## 3. Allowlist security

| Check | Status |
|-------|--------|
| Client cannot list allowlist | ✅ Staff-only RLS (0010) |
| Client cannot self-insert | ✅ Staff-only write |
| Boolean RPC only | ✅ `is_beta_email_allowed` |
| Direct Auth bypass blocked | ✅ When hook enabled |
| Notes hidden from users | ✅ No client select |

## 5. Monitoring (Sprint 7.1)

| Check | Status | Notes |
|-------|--------|-------|
| Sentry SDK installed | ✅ | `@sentry/nextjs` — disabled without DSN |
| PII scrubbing | ✅ | `scrubSentryEvent` — no message bodies, tokens, email |
| User context | ✅ | Opaque UUID only when set server-side |
| Service-role in browser | ✅ | Not exposed |
| Source maps | ⚙️ | Requires `SENTRY_AUTH_TOKEN` on Vercel build |
| User-facing errors | ✅ | Calm copy only — no raw stack traces |

## 6. Beta feedback (Sprint 7.1)

| Check | Status | Notes |
|-------|--------|-------|
| `beta_feedback` RLS | ✅ | Own insert/select; staff read all |
| No cross-user read | ✅ | Policy tested in contract docs |
| No user update | ✅ | Insert-only for authenticated users |
| Sensitive content guidance | ✅ | Form hint — no Circle bodies / passwords |

## 4. Pre-invite gate

- [ ] Migrations `0001`–`0014` applied
- [ ] Auth hook enabled in Dashboard
- [ ] `NEXT_PUBLIC_SITE_URL` set
- [ ] Testers seeded
- [ ] Closed-access smoke tests passed
- [ ] Michael legal draft acceptance for beta
