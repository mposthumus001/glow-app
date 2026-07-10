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

✅ Sprint 4.3 — Circle Presence & Typing Indicators

✅ Sprint 4.4 — Circle Assignment Engine (implementation complete; verification pending)

## Current Version

v0.4 (pending verification)

## Active Sprint

Sprint 4.4 — Circle Assignment Engine

### Implemented

* `assign_parent_to_circle` SECURITY DEFINER RPC (migration `0004_circle_assignment.sql`)
* Idempotent assignment with per-parent advisory lock and circle row lock
* Rule-based matching via `circle_rules` (wildcards, priority, baby age)
* Prefer existing active circles with capacity before creating new circles
* Onboarding integration (`completeOnboarding`) + `/circle` backfill retry
* RLS tightened: parents cannot self-insert `circle_members` or `circles`
* Pure TS matching helpers + unit tests (`assignmentLogic.test.ts`)
* Docs updated (GlowCircles, Database, DECISIONS, CHANGELOG)

### Current Status

Sprint 4.4 is implemented. Awaiting `npm run lint`, `npm run build`, `npm run test`, migration apply, and manual QA.

### Remaining Checks

* Apply migration `0004_circle_assignment.sql` to Supabase
* Two-user matching manual check (similar onboarded parents land in same circle when rules align)
* Backfill: sign in as unassigned QA parent and open `/circle`
* Commit, push, and deploy after verification

## Next Sprint

Sprint 4.5 — Reactions / read receipts (planned; out of scope for 4.4)

## Known Issues

* Atlas still using temporary clustered demo data in some areas
* Production Australia SVG refinement
* Need Circle integration into Atlas
* Circle Realtime Presence/Broadcast not private-channel authorized yet
* Reactions and read receipts not yet implemented
