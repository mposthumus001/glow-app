# Release Checklist — Private Beta

## Pre-deploy

- [ ] `npm run lint` / `build` / `test` — pass
- [ ] No secrets / real tester emails in diff
- [ ] Migrations `0001`–`0010` reviewed
- [ ] `APP_VERSION` aligned with `package.json` (`0.10.0-beta.2`)

## Supabase — migrations

Apply **in order**. Do not re-run historical migrations blindly.

| Order | File |
|-------|------|
| 1–9 | Existing (`0001` … `0009`) |
| 10 | `0010_closed_beta_access.sql` |

### Verification SQL (after 0010)

```sql
-- Columns + enum
select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'beta_testers'
  and column_name in ('email_normalized', 'status', 'activated_at', 'revoked_at');

-- Functions
select proname from pg_proc
where proname in (
  'is_beta_email_allowed',
  'hook_before_user_created_beta_allowlist',
  'normalize_beta_email'
);

-- Boolean check (should be false for unknown)
select public.is_beta_email_allowed('nobody@example.invalid');
```

### Rollback considerations

- Forward-only. To reopen signup in an emergency: **disable** the Before User Created hook in Dashboard (do not drop the function unless necessary).
- Reverting `0010` schema changes requires a dedicated down-migration — prefer hotfix forward.

## Supabase — Auth hook (manual)

1. Dashboard → **Authentication → Hooks**
2. Enable **Before User Created**
3. Type: Postgres
4. Function: `public.hook_before_user_created_beta_allowlist`
5. Save
6. Test:
   - Invited email → signup succeeds
   - Unknown email → rejected with private-beta message
7. Emergency disable: turn the hook off in the same page

**Do not claim the hook is active merely because the migration ran.**

## Supabase — seed testers

- [ ] Copy `supabase/seed-beta-testers.template.sql`
- [ ] Fill ~10 emails locally (gitignored `seed-beta-testers.local.sql`)
- [ ] Run in SQL Editor
- [ ] Run audit query for Auth users missing from allowlist
- [ ] Seed approved QA accounts only

## Vercel env

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `NEXT_PUBLIC_SITE_URL` (production canonical URL)
- [ ] Auth redirect URLs include production + preview
- [ ] Service role **not** in client env

## Post-deploy smoke

- [ ] Invited signup
- [ ] Uninvited rejected
- [ ] Case-insensitive invited email
- [ ] Password reset + email confirm redirects
- [ ] Existing tester login
- [ ] Full `docs/BETA_TEST_CHECKLIST.md`

## Rollback

1. Promote previous Vercel deployment.
2. Disable Auth hook if signup gate misbehaves (monitor open signup risk).
3. DB: hotfix via new migration.

## Version

Private beta: `0.10.0-beta.N`
