# Profile & Settings (Sprint 5.4)

## Beta scope

* Edit parent profile (display name, state, feeding, first child)
* Edit baby profile (name, DOB/due date, feeding)
* Atlas privacy controls (hidden / state / suburb area)
* Circle information (no directory, no leave self-service)
* Calm device preferences (volume, favourite, recent, clear)
* Account email, password reset email, sign out, deletion request
* Help & feedback (private `app_feedback`)
* Privacy, Safety, Terms (beta drafts), About

Out of scope: billing, push, public profiles, gamification, admin tools, sex/gender on babies.

## Routes

| Path | Purpose |
|------|---------|
| `/profile` | You landing |
| `/profile/you` | Parent edit |
| `/profile/baby` | Baby edit |
| `/profile/atlas-privacy` | Map visibility |
| `/profile/circle` | Circle info |
| `/profile/calm` | Calm prefs |
| `/profile/account` | Email, reset, deletion |
| `/profile/help` | Feedback |
| `/profile/privacy` | Privacy draft |
| `/profile/safety` | Safety |
| `/profile/terms` | Terms draft |
| `/profile/about` | App info |

## Atlas privacy

Supported levels only: `hidden`, `state_only`, `suburb_area`.

Writes update `parents`, `preferences.map_visibility_default`, and `presence` (clears lat/lng). Exact GPS is never stored or shown. Suburb clusters require k≥5.

## Circle leave / rematch

Not self-service in beta. Profile explains this and points to Help & feedback.

## Password reset

`resetPasswordForEmail` via Account settings or the login “Forgot password?” form.

**Redirect flow (PKCE):**

1. `redirectTo` = `{SITE_URL}/auth/callback?next=/auth/reset-password`
2. `/auth/callback` exchanges the code for a session
3. Redirects to `/auth/reset-password`
4. User sets a new password → Glow signs them out → `/login?reset=success`

Configure `NEXT_PUBLIC_SITE_URL` in production.

### Supabase Dashboard → Authentication → URL Configuration → Redirect URLs

Allow at least:

**Local**
- `http://localhost:3000/auth/reset-password`
- `http://localhost:3000/auth/callback`

**Production**
- `https://glow-app-six.vercel.app/auth/reset-password`
- `https://glow-app-six.vercel.app/auth/callback`

Also include the permanent custom Glow domain when available (same two paths).

**Success behaviour:** update password, sign out, redirect to login with
“Your password has been updated. Sign in with your new password.”

## Account deletion

Table `account_deletion_requests` — one pending request per user. Manual processing in beta. Users may cancel pending requests; cannot mark processed.

## Feedback

Table `beta_feedback` (Sprint 7.1) — structured private-beta feedback. Legacy `app_feedback` retained.

Categories: `bug`, `confusing`, `suggestion`, `other`. Fields: summary, optional details, route, app_version, environment, user_agent, viewport, contact_allowed. Max summary 200 / details 2000.

Staff read via `is_staff()` RLS. Users insert own rows only; duplicate submissions within 30s return calm idempotent success.

## Legal status

Privacy / Terms / Safety are **beta drafts**. Legal review required before public launch.

## Known limitations

* No reauthentication step for deletion beyond typing DELETE
* No official support email — in-app feedback only
* Calm prefs remain device-local (localStorage)
* Avatar is initials only (no photo upload)
