# Glow Beta

## Profile & trust (Sprint 5.4)

`/profile` includes:

* Edit you + baby profiles
* Atlas privacy (Hidden / State / Suburb area)
* Circle information (no member directory)
* Calm device preferences
* Account email, password reset email, sign out
* Account deletion request (manual processing in beta)
* In-app feedback
* Privacy, Safety, Terms (beta drafts), About

Not in beta Profile:

* Billing / subscriptions
* Public profiles or directories
* Self-service Circle leave/rematch
* Photo avatars
* Final legal counsel-approved policies

See `docs/ProfileSettings.md`.

## App shell (Sprint 5.1)

Authenticated parents land on **Tonight** inside a permanent shell:

* Mobile: bottom navigation (Tonight · Circle · Baby · Calm · You)
* Desktop/tablet: restrained side navigation
* Quiet reconnect banner for network interruptions
* Soft loading skeletons and calm route errors

## Calm beta scope (Sprint 5.3)

`/calm` includes:

* Small curated library (Rain, White Noise, Ocean, Night Sounds)
* Shared player: play, pause, stop, volume, sleep timer
* Favourite + recently played return path (device-local)
* Playback continues while navigating authenticated routes
* Calm error / loading / empty states

Not in beta Calm:

* Downloads, offline library, user uploads, AI audio
* Playlists, recommendations, social sharing, listener counts UI
* Subscriptions / premium gating
* Sleep stories or guided meditation packs

Audio assets are placeholders until licensed production files are approved. See `docs/Calm.md`.

## Baby beta scope (Sprint 5.2)

`/baby` includes:

* Baby profile summary (private to the authenticated family)
* Feeding, sleep (completed), and nappy logging
* Today summary using Australia/Sydney calendar day
* Recent activity with finite pagination
* Edit and confirmed soft-delete

Not in beta Baby:

* Growth charts, medical advice, predictions
* Reminders, notifications, AI recommendations
* Live background timers or gamification

See `docs/Baby.md` for schema, RLS, and limitations.

## Circle beta scope (Milestone 4 complete)

Your Circle includes:

* Automatic assignment to a small private group (max 12)
* Realtime messaging with calm optimistic sends
* Presence, typing, reactions, and private unread state
* One persisted daily prompt per circle (Australia/Sydney calendar day)
* Message report and hide-for-me safety controls
* Crisis disclaimer — Glow is peer support, not emergency care

## Out of scope for beta

* Direct messages
* Public profiles or member directories
* Push notifications
* Streaks, gamification, or engagement scoring
* AI-generated prompts at runtime
* Automated moderation or admin dashboards

## Safety during beta

* **Report a message** — discreet, private, one per message per user
* **Hide for me** — removes a message from your view only
* **Emergency** — call **000** (Australia). Mental health support: **Lifeline 13 11 14**
* Reports are kept on record; human review tooling comes later

## Known limitations

* Realtime channels are joined client-side after assignment (private channel auth deferred)
* Nav unread hint updates on page load; in-session counts update live
* Moderator review is not yet in-app
* Baby profile editing still via You / onboarding; no growth charts yet
* Sprint 5.2 migration `0007` must be applied before new feeding enum values work in production

## Milestone 4 status

Sprint 4.6 implemented — awaiting migration apply, automated checks, manual QA, and deployment approval.

## Sprint 5.2 status

Baby foundation implemented — awaiting migration apply, lint/build/tests, manual QA, and deployment approval.

## Sprint 5.3 status

Calm foundation implemented — awaiting lint/build/tests, manual QA, audio-asset approval, and deployment approval.
