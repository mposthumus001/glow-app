# Beta Test Checklist — Production Smoke Test

Run against **production** (or production-like preview) after migrations `0001`–`0015` and Auth hook enablement.

Mark each item Pass / Fail / N/A.

## Environment preflight

- [ ] `NEXT_PUBLIC_SUPABASE_URL` set on Vercel
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` set on Vercel
- [ ] `NEXT_PUBLIC_SITE_URL` set to production URL
- [ ] Supabase redirect URLs include production + preview
- [ ] Migrations `0001`–`0015` applied
- [ ] Before User Created hook **enabled** (`hook_before_user_created_beta_allowlist`)
- [ ] `beta_testers` seeded with invited emails
- [ ] `NEXT_PUBLIC_SENTRY_DSN` set (optional — verify events in Sentry when enabled)
- [ ] `SENTRY_AUTH_TOKEN` + org/project on Vercel for source maps (optional)
- [ ] `NEXT_PUBLIC_CALM_SOUNDS_PREVIEW_ENABLED` unset/`false` for production-facing builds; set to exactly `true` only on an approved Sounds QA build

---

## Closed access (Sprint 6.2)

| # | Step | Expected |
|---|------|----------|
| C1 | Sign up with **invited** email | Account created / confirm email path |
| C2 | Sign up with **uninvited** email | Calm denial — not on tester list |
| C3 | Invited email with mixed case / spaces | Accepted (normalised) |
| C4 | Email confirmation redirect | Lands in app / onboarding |
| C5 | Password reset redirect | `/auth/reset-password` + set password, then login |
| C6 | Existing tester login | Tonight (or onboarding if incomplete) |
| C7 | Revoked email signup | Denied (same calm copy) |
| C8 | Direct Auth signup with unknown email | Denied when hook enabled |
| C9 | Onboarding after approved signup | Completes; Circle assignment runs (`assigned` or calm `no_match` holding) |
| C10 | Visit `/circle` when unmatched | Holding: “We're finding the right Circle for you.” — no unsuitable Circle |
| C11 | Repeat `/circle` / onboarding assign | Idempotent — existing membership unchanged |
| C12 | Allowlist not readable from client | No `beta_testers` rows via anon key |

---

## Single account

| # | Step |
|---|------|
| 1 | Sign up with invited email |
| 2 | Confirm email (if enabled) and sign in |
| 3 | Complete onboarding |
| 4 | Tonight — Atlas live / empty state |
| 5 | Tonight Circle card — live data |
| 6 | Open Circle — assignment |
| 7 | Send a message |
| 8 | Add reaction |
| 9 | Baby — log feeding, sleep, nappy |
| 10 | Edit / delete baby event |
| 11 | Calm — Support opens by default; complete or leave each exercise early |
| 12 | Sounds preparation state, or approved preview playback QA when explicitly enabled |
| 13 | Edit profile + Atlas privacy |
| 14 | Submit feedback (Bug / Suggestion + optional details) |
| 14b | Confirm calm success state; rapid resubmit blocked |
| 15 | Deletion request + cancel |
| 16 | Sign out — audio stops |
| 17 | Sign back in |
| 18 | Password reset end-to-end |
| 19 | Browser back/forward — no auth loop |
| 20 | Unknown URL — calm 404 |

---

## Two accounts (same Circle)

| # | Step |
|---|------|
| 21 | A sends — B receives realtime |
| 22 | Typing indicator |
| 23 | Reaction visible |
| 24 | Unread hint |
| 25 | Hide for me |
| 26 | Report message |
| 27 | Atlas presence with both online |

---

## Two accounts (separate Circles)

| # | Step |
|---|------|
| 28 | No cross-circle messages |
| 29 | No cross-family baby events |
| 30 | No unrelated parent SELECT (0009) |

---

## Calm 1A — Support and Sounds

Run C1A–C14 with `NEXT_PUBLIC_CALM_SOUNDS_PREVIEW_ENABLED` unset or `false`. Run C15–C24 only on an approved build made with the flag set to exactly `true`.

| # | Step | Expected |
|---|------|----------|
| C1A | Open `/calm` with a query string | Server redirects to `/calm/support`; query is not forwarded; no loading flash |
| C2A | Check desktop and mobile primary nav on Support, exercise, and Sounds routes | Calm remains active |
| C3A | Move between Support and Sounds | Correct link has `aria-current="page"`, weight, and underline |
| C4A | Open Support on a narrow phone viewport | Six need cards stack; no horizontal overflow |
| C5A | Use keyboard only through each exercise | Visible focus; previous/next/skip/finish controls work; no trap |
| C6A | Advance breathing and grounding steps | Current instruction receives focus; polite step announcement is not duplicated |
| C7A | Enable reduced motion and start optional breathing timer | No pulsing animation; timer can pause/continue; exercise remains usable without timer |
| C8A | Choose Finish early from each exercise | Calm completion/return copy; no score, streak, success, or failure language |
| C9A | Review all Support copy against `docs/Calm.md` | Exact approved wording; no medical, therapeutic, feeding, sleep, or outcome claim |
| C10A | Open Support safety link | Existing `/profile/safety` route opens; no duplicate emergency flow |
| C11A | Open `/calm/sounds` directly | Title and exact copy: “Soundscapes are still being prepared for the Glow beta.” |
| C12A | Inspect disabled Sounds page and network/runtime activity | No catalogue/player/volume/timer/favourite UI; no audio request, autoplay, vibration, notification, or crash |
| C13A | Navigate Support → Sounds → Support | Navigation remains safe; no audio service or mini player appears |
| C14A | Check Tonight before and after Calm use | Tonight UI and behaviour are unchanged; no Calm exercise is embedded |
| C15A | Open approved preview build at `/calm/sounds` | Temporary preview is clearly labelled; nothing autoplays |
| C16A | Select and play each placeholder | One sound/audio owner only; selecting another stops the previous source |
| C17A | Play, pause, resume, and stop | State and audio agree; repeated actions do not crash |
| C18A | Change volume, including minimum and maximum | Audible level and accessible value agree |
| C19A | Set, cancel, and expire each timer option | Correct expiry; no stale or duplicate timer |
| C20A | Navigate to Support while playing, then return to Sounds | Mini player only when a sound is selected/non-idle; full and mini players never appear together |
| C21A | Refresh, sign out, and sign back in | No audible auto-resume; sign-out stops audio and clears timer |
| C22A | Background and lock supported test devices | Record actual behaviour; do not promise iOS Safari continuity |
| C23A | Trigger missing/corrupt asset and offline paths | Calm error state; recovery works; no raw technical detail |
| C24A | Inspect deployed placeholder asset URL with flag off | Confirm public URL is still reachable; record replacement/removal as release blocker |

Production sign-off requires approved licensed or Glow-owned final assets, placeholder removal/replacement, and passes for C15A–C24A on the agreed browser/device matrix.

---

## Moments (Sprint 9.1 + 9.2A + 9.2B)

| # | Step | Expected |
|---|------|----------|
| M1 | Migrations `0015` + `0017`/`0018` repair (or `0016` on fresh) | Processing RPCs + columns exist |
| M2 | Run `moments-verify-0018-repair.sql` | Summary: ALL PASS |
| M3 | `SUPABASE_SERVICE_ROLE_KEY` on Vercel | Processing completes to `ready` |
| M4 | `NEXT_PUBLIC_MOMENTS_ENABLED=false` in production | No Moments card on Baby page |
| M5 | Bucket not public | `moments-private.public = false` |
| M6 | Enable flag on preview only | Baby → Moments card → create → ready thumbnail |
| M7 | Multi-baby isolation | Child A moments not visible on child B routes |
| M8 | Delete moment | Soft-deleted; detail returns 404 |
| M9 | Processing failure | Calm message + Try again (owner only) |
| M10 | Privacy | No storage paths or signed URLs in page source/logs |

---

## Sign-off

| Role | Name | Date | Result |
|------|------|------|--------|
| Release Manager | | | |
| Product (Michael) | | | |
