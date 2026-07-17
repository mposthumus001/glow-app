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

## 7. Glow Moments & Family (Milestone 9 — proposed)

**Status:** Not implemented. Spec: `docs/Moments.md`, `docs/Family.md`.

### Permission matrix (target state)

| Resource | Owner | Household co-parent (v1) | Shared member (viewer) | Shared member (contributor) | Staff |
|----------|-------|--------------------------|------------------------|----------------------------|-------|
| `moments` private | CRUD | ❌ | ❌ | ❌ | moderation only |
| `moments` shared | CRUD | ❌ | Read | Read + create (future) | moderation |
| `moment_children` | via moment owner | ❌ | Read if moment shared | Read if shared | — |
| `moment_media` metadata | via moment owner | ❌ | Read if shared | Read if shared | — |
| Storage object | via signed URL after RLS | ❌ | Read if shared | Upload if policy allows | — |
| `moment_tags` custom | CRUD own | ❌ | ❌ | ❌ | — |
| `moment_tags` system | Read | Read | Read | Read | — |
| `shared_families` | CRUD own groups | ❌ | Read own membership | Read own membership | — |
| `shared_family_members` | Manage | ❌ | Read roster | Read roster | — |
| `shared_family_invitations` | Create/revoke | ❌ | Read own invite | ❌ | — |

### Security controls (planned)

| Check | Design |
|-------|--------|
| No public Storage URLs | ✅ Private bucket + signed URLs |
| EXIF/GPS stripped | ✅ Server-side on process |
| Path guessing | ✅ Owner prefix + UUID paths |
| Arbitrary family_id insert | ✅ WITH CHECK + RPC |
| Self-invite | ✅ Rejected |
| Role escalation | ✅ Trigger + RLS |
| Revoked member access | ✅ Immediate deny |
| Service-role in browser | ❌ Forbidden |
| Sentry photo/caption leak | ✅ Scrub in `sentry-privacy.ts` |
| Join group → expose all child Moments | ❌ Explicit per-moment share only |

### Pre-implementation gate

- [ ] Product approval on unresolved decisions (`docs/Moments.md` §15, `docs/Family.md` §13)
- [ ] Legal review for children’s photo storage
- [ ] Storage bucket + RLS policies tested in staging

---

- [ ] Migrations `0001`–`0014` applied
- [ ] Auth hook enabled in Dashboard
- [ ] `NEXT_PUBLIC_SITE_URL` set
- [ ] Testers seeded
- [ ] Closed-access smoke tests passed
- [ ] Michael legal draft acceptance for beta
