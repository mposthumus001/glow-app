# Glow Current Session

## Completed

✅ Database v2.0

✅ Authentication

✅ Onboarding

✅ Glow Home

✅ Glow Atlas

✅ Realtime Presence Engine

✅ Milestone 4 — Glow Circles (Sprints 4.1–4.6)

✅ Sprint 5.1 — Permanent App Shell and Core Navigation

✅ Sprint 5.2 — Baby Foundation and Basic Tracking (implementation complete; verification pending)

## Current Version

v0.8 (pending verification)

## Active Sprint

Sprint 5.2 — Baby Foundation and Basic Tracking

### Implemented

* Baby profile summary on `/baby` (name, age/stage, DOB/due, feeding method)
* Feeding / sleep / nappy logging via calm Log actions + sheet
* Today summary (Australia/Sydney day bounds)
* Recent activity with finite “Earlier activity” pagination
* Edit + confirmed soft-delete
* Multi-baby selector when family has more than one baby
* Migration `0007_baby_tracking_foundation.sql` (feeding enum variants + RLS tighten)
* Unit tests for validation, timezone, summary, pagination, auth contract

### Current Status

Sprint 5.2 implemented. `npm run lint`, `npm run build`, and `npm run test` passed. Awaiting migration application, manual QA, commit, push, and deployment.

### Remaining Checks

* Apply migration `0007_baby_tracking_foundation.sql`
* Manual QA on phone / tablet / desktop
* Commit, push, deploy after verification

## Next Sprint

Calm audio playback foundations, or Baby growth/milestones (no medical advice)

## Known Issues

* Atlas still using temporary clustered demo data in some areas
* Circle Realtime Presence/Broadcast not private-channel authorized yet
* Moderator review tooling deferred
* Atlas privacy editing not yet on Profile (read-only summary)
* Tonight Circle preview card still uses some mock copy
* Baby profile editing still via You / onboarding only
