-- =============================================================================
-- ROLLBACK — Remove only the four QA memberships from Glow Beta Test Circle
-- =============================================================================
-- File: supabase/ops/qa-same-circle-rollback.template.sql  (committed — NO emails)
--
-- BEFORE RUNNING:
--   1. Copy to qa-same-circle-rollback.local.sql (gitignored).
--   2. Replace TESTER_1_EMAIL … TESTER_4_EMAIL with the same emails used in apply.
--   3. Run as postgres / service role in Supabase SQL Editor.
--
-- Effect:
--   • Sets these four testers' QA membership to status = 'left' (+ deleted_at)
--   • Does NOT delete the Circle row (harmless empty QA circle may remain)
--   • Does NOT delete accounts, parents, babies, messages, logs, or feedback
--   • Does NOT recreate prior Circles
--   • After rollback, /circle runs assign_parent_to_circle on next visit
--
-- Does not affect other users.
-- =============================================================================

begin;

create temporary table _qa_tester_emails (
  email_normalized text primary key
) on commit drop;

insert into _qa_tester_emails (email_normalized) values
  (lower(trim('TESTER_1_EMAIL'))),
  (lower(trim('TESTER_2_EMAIL'))),
  (lower(trim('TESTER_3_EMAIL'))),
  (lower(trim('TESTER_4_EMAIL')));

update public.circle_members cm
set
  status = 'left',
  deleted_at = coalesce(cm.deleted_at, timezone('utc', now()))
from auth.users u
join _qa_tester_emails e
  on lower(trim(u.email)) = e.email_normalized
join public.circles c
  on c.id = cm.circle_id
where cm.parent_id = u.id
  and c.name = 'Glow Beta Test Circle'
  and c.deleted_at is null
  and cm.status = 'active'
  and cm.deleted_at is null;

commit;

-- =============================================================================
-- B) Verification — expect zero active QA memberships for these testers
-- =============================================================================
select
  regexp_replace(e.email_normalized, '(^.).*(@.*$)', '\1***\2') as tester,
  c.name as circle_name,
  cm.status as membership_status,
  cm.deleted_at
from (values
  (lower(trim('TESTER_1_EMAIL'))),
  (lower(trim('TESTER_2_EMAIL'))),
  (lower(trim('TESTER_3_EMAIL'))),
  (lower(trim('TESTER_4_EMAIL')))
) as e(email_normalized)
join auth.users u
  on lower(trim(u.email)) = e.email_normalized
left join public.circle_members cm
  on cm.parent_id = u.id
 and cm.status = 'active'
 and cm.deleted_at is null
left join public.circles c
  on c.id = cm.circle_id
 and c.name = 'Glow Beta Test Circle'
 and c.deleted_at is null
order by e.email_normalized;

-- Expect: 4 rows with membership_status NULL (no active QA membership)
