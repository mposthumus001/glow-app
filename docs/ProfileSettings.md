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

`resetPasswordForEmail` via Account settings. Callback: `/auth/callback?next=/profile/account`. Configure `NEXT_PUBLIC_SITE_URL` in production.

## Account deletion

Table `account_deletion_requests` — one pending request per user. Manual processing in beta. Users may cancel pending requests; cannot mark processed.

## Feedback

Table `app_feedback` — private to author (+ future staff). Categories: feedback, technical, safety, other. Max 2000 chars.

## Legal status

Privacy / Terms / Safety are **beta drafts**. Legal review required before public launch.

## Known limitations

* No reauthentication step for deletion beyond typing DELETE
* No official support email — in-app feedback only
* Calm prefs remain device-local (localStorage)
* Avatar is initials only (no photo upload)
