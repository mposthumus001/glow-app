# Glow Current Session

## Completed

✅ Database v2.0

✅ Authentication

✅ Onboarding

✅ Glow Home / Atlas / Presence

✅ Milestone 4 — Glow Circles

✅ Sprint 5.1 — App Shell

✅ Sprint 5.2 — Baby Foundation

✅ Sprint 5.3 — Glow Calm Foundation

✅ Sprint 5.4 — Profile, Settings, Privacy, and Trust (lint/build/test green; awaiting migration apply, manual QA, legal review, commit, push, deploy)

## Current Version

v0.10 (pending verification)

## Active Sprint

Sprint 5.4 — Profile, Settings, Privacy, and Trust

### Implemented

* Profile landing with grouped sections
* Parent + baby profile editing
* Atlas privacy controls synced to parents / preferences / presence
* Circle information page (no leave self-service)
* Calm device preferences panel
* Account: email, password reset email, sign out, deletion request
* Help & feedback (`app_feedback`)
* Privacy / Safety / Terms beta drafts + About
* Migration `0008_profile_settings_trust.sql`
* Auth callback `/auth/callback`
* Unit tests for validation and trust contracts

### Current Status

Sprint 5.4 implemented. `npm run lint`, `build`, and `test` passed. Awaiting migration apply, manual QA, legal-content review, commit, push, deployment.

### Remaining Checks

* Apply migration `0008`
* Configure `NEXT_PUBLIC_SITE_URL` for password-reset redirects in deployed environments
* Manual QA of nested Profile routes and forms
* Legal review of draft Privacy/Terms before public launch
* Commit, push, deploy after verification

## Next Sprint

Milestone 6 alignment (Baby growth/milestones without medical advice), production Calm audio, or Realtime Authorization hardening

## Known Issues

* Legal Privacy/Terms are beta drafts — not final
* Account deletion is request-only (manual processing)
* No official support email — in-app feedback only
* Calm prefs remain device-local
* Atlas demo data refinements still pending in places
