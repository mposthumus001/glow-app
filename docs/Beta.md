# Glow Beta — Private Beta Program

Version: **0.10.0-beta.1**  
Target cohort: **~10 testers**  
Sprint: **6.1 — Audit & Hardening**

## Beta scope (included)

| Area | Routes | Status |
|------|--------|--------|
| Tonight + Atlas | `/` | Live clusters, realtime presence |
| Your Circle | `/circle` | Assignment, messaging, presence, typing, reactions, prompts, safety |
| Baby | `/baby` | Feeding, sleep, nappy, today summary, edit/delete |
| Calm | `/calm` | Player, sleep timer, device prefs |
| You / Settings | `/profile/*` | Profiles, privacy, feedback, deletion, legal drafts |

## Excluded from beta

- Billing / subscriptions UI
- Push notifications
- AI features (prompts, chat, recommendations)
- Public profiles or member directories
- Automated moderation dashboards
- Growth charts / medical advice
- Analytics capturing message, baby, or profile content
- Self-service Circle leave/rematch

## Tester access model (recommended)

**Approach:** Staff-managed email allowlist via `beta_testers` table + manual signup monitoring.

| Step | Action |
|------|--------|
| 1 | Michael adds tester emails to `beta_testers` in Supabase (staff role) |
| 2 | Share production URL only with invited testers |
| 3 | Monitor Auth signups in Supabase dashboard |
| 4 | Reject/remove unexpected accounts manually |

**Not implemented in Sprint 6.1:** Supabase Auth `before-user-created` hook to hard-block non-allowlisted emails. This is the safest simple closed-beta gate — proposed for Sprint 6.2. See `docs/DECISIONS.md`.

**Alternative (not recommended):** Invitation codes in app — adds UX complexity without existing schema support.

## Supported devices

| Device | Support level |
|--------|---------------|
| iPhone Safari | Primary — test 390×844 |
| Android Chrome | Primary |
| iPad portrait/landscape | Supported |
| Desktop Chrome/Safari/Edge | Supported |
| iOS Safari background Calm | Limited — see `docs/Calm.md` |

## Feedback & support

| Channel | Path | Privacy |
|---------|------|---------|
| General feedback | `/profile/help` | Private `app_feedback` table |
| Bug reports | Help form — category "technical" | No auto-capture of Circle messages |
| Safety concerns | Help form — category "safety" | Escalate via Michael; crisis: 000 / Lifeline 13 11 14 |

Duplicate submissions: not blocked server-side; calm copy on success. Client clears form after success.

## Test accounts

Create via normal signup with allowlisted emails. For two-account testing:

- Use two different emails in the same Australian state + similar feeding method to increase same-Circle match probability
- Or use staff `assign_parent_to_circle` RPC for deterministic placement

**Do not commit test credentials to the repo.**

## Production smoke test

See `docs/BETA_TEST_CHECKLIST.md`.

## Migration status

| Migration | Purpose | Required before beta |
|-----------|---------|---------------------|
| 0001–0006 | Core schema, circles, prompts | ✅ |
| 0007 | Baby feeding enums | ✅ |
| 0008 | Profile trust tables | ✅ |
| 0009 | RLS hardening (Sprint 6.1) | ✅ |

## Monitoring status

| Capability | Status |
|------------|--------|
| Vercel deploy alerts | Configure manually |
| Supabase logs | Manual review |
| Client error SDK | Not installed — dev-only digest logging |
| Recommended | Sentry with PII scrubbing |

## Legal document status

Privacy, Terms, and Safety pages are **beta drafts** — labelled in app. Not counsel-approved. Sufficient for closed beta with informed testers; review required before public launch.

## Audio asset status

Calm uses Glow-generated placeholder WAVs in `public/calm/placeholders/`. UI marks them as placeholders. Replace with licensed audio before App Store.

## Data deletion process

1. User submits request at `/profile/account`
2. Request stored in `account_deletion_requests` (pending)
3. Michael processes manually during beta
4. User may cancel pending request in-app

## Rollback plan

See `docs/RELEASE_CHECKLIST.md`.

## Known limitations

See `docs/KNOWN_ISSUES.md`.

## Security references

- `docs/SECURITY_AUDIT.md`
- `docs/RLS_ACCESS_MATRIX.md`

## Pre-invite checklist

- [ ] Migrations `0001`–`0009` applied
- [ ] `NEXT_PUBLIC_SITE_URL` configured
- [ ] `beta_testers` seeded
- [ ] `BETA_TEST_CHECKLIST.md` single + two-account sections passed
- [ ] Michael sign-off on legal draft status for beta
