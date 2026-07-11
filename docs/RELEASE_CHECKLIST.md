# Release Checklist — Private Beta

## Pre-deploy

- [ ] `npm run lint` / `build` / `test` — pass
- [ ] No secrets in diff
- [ ] Migrations `0001`–`0009` reviewed
- [ ] `APP_VERSION` aligned with `package.json`

## Supabase

- [ ] Apply migrations
- [ ] Seed `beta_testers`
- [ ] Auth redirect URLs configured
- [ ] Service role **not** in client env

## Vercel

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `NEXT_PUBLIC_SITE_URL`

## Rollback

1. Promote previous Vercel deployment.
2. DB: forward-only migrations — hotfix via new migration if needed.
3. Disable signups in Supabase if abuse detected.

## Version

Private beta: `0.10.0-beta.N`
