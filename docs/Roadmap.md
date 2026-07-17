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

## Milestone 9

Glow Moments & Family

**Status:** Architecture specification complete (2026-07-17). **No code, migrations, or Storage yet.**

Docs: `docs/Moments.md`, `docs/Family.md`

### Sprint 9.1 — Moments foundation

⬜ Planned

| Area | Deliverable |
|------|-------------|
| Schema | `moments`, `moment_children`, `moment_media`, `moment_tags`, `moment_tag_links` |
| Storage | Private bucket `moments-private`, RLS policies, path convention |
| Backend | Signed upload/download server actions; orphan cleanup job spec |
| Testing | RLS contract tests, upload validation, ownership tests |
| Risks | First Storage in project; EXIF strip pipeline; staging bucket setup |
| Rollout | Feature flag; owner-only; no nav exposure |

### Sprint 9.2 — Private child albums

⬜ Planned

| Area | Deliverable |
|------|-------------|
| UI | Baby → child selector → Moments grid, detail, create/edit |
| Backend | Wire server actions; thumbnail generation |
| Testing | Multi-baby isolation, soft-delete, age derivation |
| Risks | Mobile upload size; iOS HEIC conversion |
| Rollout | Beta testers with storage quota |

### Sprint 9.3 — Tags, timeline, favourites

⬜ Planned

| Area | Deliverable |
|------|-------------|
| Schema | Seed system tags |
| UI | Tag picker, timeline view, favourites |
| Testing | Custom tag isolation, duplicate prevention |
| Rollout | Enable for all beta users |

### Sprint 9.4 — Family private album

⬜ Planned

| Area | Deliverable |
|------|-------------|
| Nav | Add Family → Family Moments |
| UI | Multi-child linker, family-kind moments |
| Testing | 0-child family moments, household baby validation |
| Rollout | Family nav behind flag |

### Sprint 9.5 — Shared Family groups

⬜ Planned

| Area | Deliverable |
|------|-------------|
| Schema | `shared_families`, `shared_family_members`, `shared_family_invitations`, audits |
| Backend | Invite RPCs, accept flow, visibility change RPC |
| UI | Members, Invitations, Settings, per-moment share toggle |
| Testing | Invite lifecycle, revoked access, no auto-exposure |
| Risks | Email delivery; token security |
| Rollout | Opt-in beta subset |

### Sprint 9.6 — Polish & export

⬜ Planned

| Area | Deliverable |
|------|-------------|
| UI | Share confirmations, audit visibility for owner |
| Backend | Account deletion purge for Storage + moments |
| Export | Parent-initiated archive (ZIP) — if approved |
| Testing | Deletion cascade, orphan media cleanup |
| Legal | Privacy/Terms update for photo storage |

---

## Completed milestones (summary)

Milestones 1–5 ✅ — see sections above

## Baby Tracker (extended charts)

⬜ Planned — foundations in Sprint 5.2

