-- =============================================================================
-- Glow private-beta tester seed TEMPLATE
-- =============================================================================
-- Copy this file locally, replace placeholder emails, then run in the Supabase
-- SQL Editor (service role). Do NOT commit real tester emails.
--
-- Prerequisites: migration 0010_closed_beta_access.sql applied.
-- =============================================================================

-- Invite testers (idempotent upsert)
insert into public.beta_testers (email, email_normalized, status)
values
  (lower(trim('tester1@example.com')), lower(trim('tester1@example.com')), 'invited'),
  (lower(trim('tester2@example.com')), lower(trim('tester2@example.com')), 'invited'),
  (lower(trim('tester3@example.com')), lower(trim('tester3@example.com')), 'invited')
  -- add remaining invites here (~10 total)
on conflict (email_normalized)
do update set
  status = excluded.status,
  revoked_at = case
    when excluded.status = 'revoked' then coalesce(public.beta_testers.revoked_at, timezone('utc', now()))
    else null
  end,
  updated_at = timezone('utc', now());

-- Revoke an invite (blocks NEW account creation only)
-- update public.beta_testers
-- set status = 'revoked', revoked_at = timezone('utc', now())
-- where email_normalized = lower(trim('tester1@example.com'));

-- ---------------------------------------------------------------------------
-- Audit: Auth users whose email is missing from the allowlist
-- Run as service role. Returns email + created_at only — no UUIDs/tokens.
-- Review before inviting; seed missing QA accounts deliberately.
-- ---------------------------------------------------------------------------
-- select
--   lower(trim(u.email)) as email,
--   u.created_at
-- from auth.users u
-- where u.email is not null
--   and not exists (
--     select 1
--     from public.beta_testers bt
--     where bt.email_normalized = lower(trim(u.email))
--   )
-- order by u.created_at;
