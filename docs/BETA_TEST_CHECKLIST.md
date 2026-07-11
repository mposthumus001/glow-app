# Beta Test Checklist — Production Smoke Test

Sprint 6.1. Run against **production** (or production-like preview) after migrations `0001`–`0009` are applied.

Mark each item Pass / Fail / N/A. Two-account items need **Account A** and **Account B**.

## Environment preflight

- [ ] `NEXT_PUBLIC_SUPABASE_URL` set on Vercel
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` set on Vercel
- [ ] `NEXT_PUBLIC_SITE_URL` set to production URL
- [ ] Supabase redirect URLs include production + preview origins
- [ ] Migrations `0001`–`0009` applied
- [ ] `beta_testers` seeded with invited emails (if using allowlist workflow)

---

## Single account

| # | Step | Device notes |
|---|------|--------------|
| 1 | Sign up with invited email | Mobile + desktop |
| 2 | Confirm email (if enabled) and sign in | |
| 3 | Complete onboarding — required fields clear, optional marked | No exact location requested |
| 4 | Land on Tonight — Atlas loads, live count or empty state | Refresh page |
| 5 | Tonight Circle card shows real Circle or matching state | Not mock names |
| 6 | Open Circle — assignment completes or shows calm unassigned copy | |
| 7 | Send a message | Composer preserves text on brief offline |
| 8 | Add reaction to a message | |
| 9 | Open Baby — log feeding, sleep, nappy | Today summary updates (AU/Sydney) |
| 10 | Edit or delete a baby event | Confirmation on delete |
| 11 | Open Calm — play, pause, switch sound, set sleep timer | |
| 12 | Navigate Tonight → Circle → Baby → Calm → You — audio continues | |
| 13 | Edit profile (You) and Atlas privacy | Hidden users excluded from map |
| 14 | Submit feedback (Help) | Success confirmation |
| 15 | Request account deletion, then cancel | |
| 16 | Sign out — audio stops, returns to login | |
| 17 | Sign back in — lands on Tonight, onboarding skipped | |
| 18 | Password reset: email link → set new password on Account page | Login forgot-password path |
| 19 | Browser back/forward across shell routes | No auth loop |
| 20 | Unknown URL shows calm 404 with shell (when logged in) | `/profile/unknown` |

---

## Two accounts (same Circle)

Requires **Account A** and **Account B** matched into the same Circle.

| # | Step |
|---|------|
| 21 | A sends message — B receives in realtime |
| 22 | B typing indicator visible to A (brief) |
| 23 | B reaction visible to A |
| 24 | Unread hint updates for B after A sends |
| 25 | B hides a message — only B's feed affected |
| 26 | B reports a message — calm confirmation, no public indicator |
| 27 | Atlas presence count changes when both online (country/state level) |

---

## Two accounts (separate Circles)

| # | Step |
|---|------|
| 28 | A cannot see B's Circle messages |
| 29 | A cannot see B's baby events |
| 30 | A cannot read B's parent row via direct query (0009) |

---

## Sign-off

| Role | Name | Date | Result |
|------|------|------|--------|
| Release Manager | | | |
| Product (Michael) | | | |
