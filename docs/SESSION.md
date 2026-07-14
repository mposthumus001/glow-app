# Glow Current Session

## Date

2026-07-11

## Current Version

v0.10.0-beta.2

## Active Sprint

**Milestone 6 — Sprint 6.2: Closed Beta Access and Production Launch Controls**

## Sprint 6.2 completed (code)

* Migration `0010_closed_beta_access.sql` — allowlist status lifecycle + Auth hook function + boolean RPC
* Signup UX — private beta copy + server-side allowlist check
* Login copy — invited testers only
* Seed template + gitignored local seed file
* Env validation for required public vars
* Docs + checklist updates
* Unit tests for normalisation, env checks, RLS contracts

## Remaining before inviting testers (ops)

1. Apply migrations `0001`–`0010` to production Supabase
2. **Enable** Before User Created hook in Dashboard → `hook_before_user_created_beta_allowlist`
3. Configure `NEXT_PUBLIC_SITE_URL` on Vercel
4. Seed ~10 invited emails (local template — never commit real emails)
5. Run audit query for existing Auth users missing from allowlist
6. Complete `docs/BETA_TEST_CHECKLIST.md` including closed-access section
7. Legal draft acceptance for closed beta

## Architecture note

Auth hook is available on Free and Pro. Function exists after migration; **Dashboard enablement is mandatory**.

## Known Issues

See `docs/KNOWN_ISSUES.md`
