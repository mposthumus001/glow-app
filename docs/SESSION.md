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

✅ Sprint 5.3 — Glow Calm Foundation (implementation complete; verification pending)

## Current Version

v0.9 (pending verification)

## Active Sprint

Sprint 5.3 — Glow Calm Foundation

### Implemented

* Calm home on `/calm` with curated categories and a small sound library
* Shared `CalmPlayerService` (single audio element) owned by AppShell
* Play / pause / resume / stop / volume / sleep timer
* Favourite + recent sound return path (localStorage)
* Placeholder WAV assets clearly marked for replacement
* Calm mini player when navigating away from `/calm` while audio is active
* Logout stops playback and clears the sleep timer
* Unit tests for catalogue, player logic, and persistence

### Current Status

Sprint 5.3 implemented. `npm run lint`, `npm run build`, and `npm run test` passed. Awaiting manual QA, audio-asset approval, commit, push, and deployment.

### Remaining Checks

* Manual QA on phone / tablet / desktop (playback, timer, route persistence, a11y)
* Replace placeholder audio before production
* Commit, push, deploy after verification

## Next Sprint

Production Calm audio assets, or Baby growth/milestones (no medical advice), or quiet listener presence if still desired

## Known Issues

* Atlas still using temporary clustered demo data in some areas
* Circle Realtime Presence/Broadcast not private-channel authorized yet
* Moderator review tooling deferred
* Atlas privacy editing not yet on Profile (read-only summary)
* Tonight Circle preview card still uses some mock copy
* Baby profile editing still via You / onboarding only
* Calm uses placeholder WAVs — not production audio
* iOS Safari background / lock-screen playback is unreliable (documented)
