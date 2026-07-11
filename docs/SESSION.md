# Glow Current Session

## Completed

✅ Database v2.0

✅ Authentication

✅ Onboarding

✅ Glow Home

✅ Glow Atlas

✅ Realtime Presence Engine

✅ Milestone 4 — Glow Circles (Sprints 4.1–4.6)

✅ Sprint 5.1 — Permanent App Shell and Core Navigation (implementation complete; verification pending)

## Current Version

v0.7 (pending verification)

## Active Sprint

Sprint 5.1 — Permanent App Shell and Core Navigation

### Implemented

* Authenticated route group `src/app/(app)` with shared `AppShell`
* Routes: `/` Tonight, `/circle`, `/baby`, `/calm`, `/profile`
* Mobile bottom nav (Tonight, Circle, Baby, Calm, You) + desktop side nav
* `PageHeader`, `ShellSkeleton`, `ShellError`, quiet `ReconnectBanner`
* Presence lifecycle owned by shell (`usePresenceConnection`)
* Atlas clusters remain Tonight-scoped; Circle messaging remains Circle-scoped
* Baby and Calm intentional placeholders (no fake data / no audio)
* Profile/Settings foundation with private email, sign out, entry points
* Unit tests for nav active resolution and baby age formatting

### Current Status

Sprint 5.1 implemented. `npm run lint`, `npm run build`, and `npm run test` passed. Awaiting manual QA, commit, push, and deployment.

### Remaining Checks

* Manual QA across phone / tablet / desktop
* Confirm no duplicate Circle or Atlas subscriptions when navigating
* Confirm sign-out and unauthenticated redirects
* Commit, push, deploy after verification

## Next Sprint

Calm audio playback foundations, or Baby tracking MVP (Milestone 6)

## Known Issues

* Atlas still using temporary clustered demo data in some areas
* Circle Realtime Presence/Broadcast not private-channel authorized yet
* Moderator review tooling deferred
* Atlas privacy editing not yet on Profile (read-only summary)
* Tonight Circle preview card still uses some mock copy
