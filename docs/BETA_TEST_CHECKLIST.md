# Beta Test Checklist — Production Smoke Test

Run against **production** (or production-like preview) after migrations `0001`–`0010` and Auth hook enablement.

Mark each item Pass / Fail / N/A.

## Environment preflight

- [ ] `NEXT_PUBLIC_SUPABASE_URL` set on Vercel
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` set on Vercel
- [ ] `NEXT_PUBLIC_SITE_URL` set to production URL
- [ ] Supabase redirect URLs include production + preview
- [ ] Migrations `0001`–`0010` applied
- [ ] Before User Created hook **enabled** (`hook_before_user_created_beta_allowlist`)
- [ ] `beta_testers` seeded with invited emails

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
| 11 | Calm — play / pause / timer |
| 12 | Navigate while Calm plays |
| 13 | Edit profile + Atlas privacy |
| 14 | Submit feedback |
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

## Sign-off

| Role | Name | Date | Result |
|------|------|------|--------|
| Release Manager | | | |
| Product (Michael) | | | |
