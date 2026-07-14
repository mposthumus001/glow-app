# Glow Roadmap

## Milestone 1

- Database
- Authentication
- Onboarding

✅ Complete

---

## Milestone 2

- Glow Home
- Glow Atlas
- Hierarchical Zoom

✅ Complete

---

## Milestone 3

Realtime Presence

✅ Complete

---

## Milestone 4

Glow Circles

✅ Complete (verification pending)

---

## Milestone 5

Glow Calm + App Shell

### Sprint 5.1 — Permanent App Shell and Core Navigation

✅ Implemented (awaiting final deploy verification)

- Authenticated `(app)` route group
- Five-destination mobile + desktop navigation
- Tonight, Circle, Baby, Calm, Profile routes
- Shared loading / error / reconnect treatment
- Baby and Calm production-quality placeholders (Baby replaced in 5.2)

### Sprint 5.2 — Baby Foundation and Basic Tracking

✅ Implemented (awaiting migration apply, lint/build/tests, manual QA, commit/push/deploy)

- Baby profile summary
- Feeding / sleep / nappy logging
- Today summary (Australia/Sydney)
- Recent activity + edit/soft-delete
- Migration `0007_baby_tracking_foundation.sql`

### Sprint 5.3 — Glow Calm Foundation

✅ Implemented (awaiting lint/build/tests, manual QA, audio-asset approval, commit/push/deploy)

- Curated sound library + Calm home
- Shared shell-owned audio player
- Sleep timer, favourite/recent, volume persistence
- Placeholder audio assets (replace before production)

### Sprint 5.4 — Profile, Settings, Privacy, and Trust

✅ Implemented (awaiting migrations, lint/build/tests, manual QA, legal review, commit/push/deploy)

- Parent + baby profile editing
- Atlas privacy controls
- Circle information (no leave self-service)
- Calm device preferences
- Account, password reset email, deletion requests, feedback
- Privacy / Safety / Terms beta drafts

### Next

- Production Calm audio assets / optional `media_library` alignment
- Later Baby: growth / milestones (no medical advice)
- Legal review of Privacy/Terms before public launch

---

## Milestone 6

Private Beta

### Sprint 6.1 — Audit & Hardening

✅ Complete (awaiting migration apply, production smoke test)

### Sprint 6.2 — Closed access + launch controls

✅ Implemented (awaiting migration apply, Auth hook Dashboard enable, seed, smoke test)

- `beta_testers` allowlist lifecycle (`invited` / `active` / `revoked`)
- Before User Created Auth hook function
- App signup UX gate + calm denial copy
- Seed template + release/docs updates

### Next

- Ops: apply `0010`, enable Auth hook, seed ~10 emails, smoke test
- Optional: Sentry (privacy-scrubbed)
- Optional: CI lint/build/test

---

## Milestone 7

Private Beta Launch (invite testers)

⬜ Planned — depends on Sprint 6.2 ops sign-off

---

## Milestone 8

App Store Launch

⬜ Planned

---

## Completed milestones (summary)

Milestones 1–5 ✅ — see sections above

## Baby Tracker (extended charts)

⬜ Planned — foundations in Sprint 5.2

