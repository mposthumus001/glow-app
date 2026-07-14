# Glow Beta — Private Beta Program

Version: **0.10.0-beta.2**  
Target cohort: **~10 testers**  
Sprint: **6.2 — Closed Beta Access**

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
- AI features
- Public profiles or member directories
- Automated moderation dashboards
- Growth charts / medical advice
- Open public registration
- Invitation / referral systems
- Admin dashboards

---

## Closed-beta access model (Sprint 6.2)

**Source of truth:** `public.beta_testers` email allowlist.

**Enforcement boundary (primary):** Supabase Auth **Before User Created** hook → Postgres function `public.hook_before_user_created_beta_allowlist`.

**App fallback (UX only):** Server action `checkBetaSignupAccess` calls `is_beta_email_allowed(p_email)` (boolean RPC). Never sufficient alone — the Auth hook blocks direct Auth API signup.

| Email status | May create account? | Notes |
|--------------|---------------------|-------|
| `invited` | Yes | Normal confirmation → onboarding |
| `active` | Yes (idempotent) | Already activated |
| `revoked` | No | Calm denial message |
| Missing | No | Calm denial message |

### Email normalisation

`lower(trim(email))` stored in `email_normalized` (unique). Comparison is case-insensitive; whitespace ignored.

### Activation

On successful `auth.users` insert, `handle_new_user` sets matching allowlist row to `active`, sets `activated_at` / `accepted_at`, and links `parent_id`. Idempotent.

### Revocation

1. Set `status = 'revoked'` (and `revoked_at`) in SQL.
2. Revocation **blocks new account creation** via the Auth hook.
3. Existing sessions are **not** force-terminated by Glow.
4. To fully remove access, Michael also **disables or deletes** the Auth user in the Supabase Dashboard.

### Existing users

Do **not** auto-add every `auth.users` email to the allowlist. Run the audit query in `supabase/seed-beta-testers.template.sql`, then seed approved QA emails deliberately.

### Seed workflow

1. Apply migration `0010_closed_beta_access.sql`.
2. Copy `supabase/seed-beta-testers.template.sql` → local `seed-beta-testers.local.sql` (gitignored).
3. Replace placeholder emails (~10).
4. Run in Supabase SQL Editor (service role).
5. **Do not commit real tester emails.**

### Auth hook setup (manual — required)

The database function alone does **not** activate the hook.

1. Apply migration `0010`.
2. Supabase Dashboard → **Authentication → Hooks**.
3. Enable **Before User Created**.
4. Select Postgres function: `public.hook_before_user_created_beta_allowlist`.
5. Save.
6. Test invited email (succeeds) and unknown email (rejected with calm copy).

**Emergency disable:** Dashboard → Authentication → Hooks → disable Before User Created. Signups become open until re-enabled — monitor immediately.

Full steps: `docs/RELEASE_CHECKLIST.md`.

---

## Supported devices

| Device | Support level |
|--------|---------------|
| iPhone Safari | Primary |
| Android Chrome | Primary |
| iPad | Supported |
| Desktop browsers | Supported |
| iOS Safari Calm background | Limited — see `docs/Calm.md` |

## Feedback & support

| Channel | Path |
|---------|------|
| Feedback / bugs / safety | `/profile/help` → private `app_feedback` |
| Crisis | 000 / Lifeline 13 11 14 |

## Migration status

| Migration | Purpose | Required |
|-----------|---------|----------|
| 0001–0009 | Core → RLS hardening | ✅ |
| **0010** | Closed beta allowlist + Auth hook function | ✅ |

## Environment

| Variable | Role |
|----------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Required |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Required (never service-role) |
| `NEXT_PUBLIC_SITE_URL` | Required in production (Auth redirects) |

## Pre-invite checklist

- [ ] Migrations `0001`–`0010` applied
- [ ] Before User Created hook **enabled** in Dashboard
- [ ] `NEXT_PUBLIC_SITE_URL` configured
- [ ] ~10 tester emails seeded (`invited`)
- [ ] Existing QA emails reviewed via audit query
- [ ] Invited + uninvited signup smoke tests passed
- [ ] `BETA_TEST_CHECKLIST.md` completed
- [ ] Michael sign-off on legal draft status for beta

## Known limitations

See `docs/KNOWN_ISSUES.md`.
