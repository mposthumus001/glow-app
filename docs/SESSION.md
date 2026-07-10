# Glow Current Session

## Completed

✅ Database v2.0

✅ Authentication

✅ Onboarding

✅ Glow Home

✅ Glow Atlas

✅ Realtime Presence Engine

✅ Sprint 4.1 — Circle Foundation

✅ Sprint 4.2 — Realtime Messaging

## Current Version

v0.4 (pending verification)

## Active Sprint

Sprint 4.2 — Realtime Messaging

### Implemented

* Enabled Circle composer with trim, empty rejection, length cap, and send locking
* Optimistic send with confirmed / failed reconciliation (no duplicates)
* Supabase Realtime subscription scoped to the assigned circle
* Backwards pagination via “Earlier messages”
* Calm scroll behaviour + subtle “New messages” affordance
* Failed-send inline retry without toast spam
* Unit tests for message prepare/merge/dedupe/retry/lifecycle helpers
* No schema or RLS changes

### Current Status

Sprint 4.2 is implemented. `npm run lint`, `npm run build`, and `npm run test` passed. Still awaiting final manual verification, commit, push, and deployment.

### Remaining Checks

* Manual two-user realtime send/receive
* Verify pagination scroll preservation
* Verify failed send + retry
* Confirm reduced-motion behaviour
* Commit, push, and deploy after verification

## Next Sprint

Sprint 4.3 — Typing indicators / reactions / read receipts (planned)

## Known Issues

* Atlas still using temporary clustered demo data in some areas
* Production Australia SVG refinement
* Need Circle integration into Atlas
* Typing indicators, reactions, and read receipts not yet implemented
