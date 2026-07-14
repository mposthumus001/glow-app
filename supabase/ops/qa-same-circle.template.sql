-- =============================================================================
-- ONE-TIME PRODUCTION OPS — Place four QA testers in the same dedicated Circle
-- =============================================================================
-- File: supabase/ops/qa-same-circle.template.sql  (committed — NO real emails)
--
-- BEFORE RUNNING:
--   1. Copy this file to qa-same-circle.local.sql (gitignored).
--   2. Replace TESTER_1_EMAIL … TESTER_4_EMAIL with real Auth emails.
--   3. Run in Supabase Dashboard → SQL Editor as postgres / service role.
--
-- Do NOT run via authenticated PostgREST (RLS blocks circle/member inserts).
--
-- Schema verified against migrations 0001–0010:
--   • auth.users.id = parents.id (1:1)
--   • circle_members unique (circle_id, parent_id) — not one-active-circle-per-parent
--   • Active membership: status = 'active' AND deleted_at IS NULL
--   • Leave lifecycle: status = 'left' + deleted_at (matches assign_parent_to_circle)
--   • No left_at / ended_at on circle_members
--   • circle_status: forming | active | paused | archived
--   • circle_member_status: active | left | removed | muted
--   • assign_parent_to_circle only considers circles with circle_rules rows
--   • This script does NOT modify assign_parent_to_circle or global circle_rules
--
-- Idempotent: safe to run twice. Scope: only the four listed emails.
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 0) Config — replace placeholders in your *.local.sql copy
-- ---------------------------------------------------------------------------
create temporary table _qa_tester_emails (
  email_normalized text primary key
) on commit drop;

insert into _qa_tester_emails (email_normalized) values
  (lower(trim('TESTER_1_EMAIL'))),
  (lower(trim('TESTER_2_EMAIL'))),
  (lower(trim('TESTER_3_EMAIL'))),
  (lower(trim('TESTER_4_EMAIL')));

-- ---------------------------------------------------------------------------
-- 1) Resolve auth.users → parents; fail clearly if missing or not onboarded
-- ---------------------------------------------------------------------------
create temporary table _qa_auth_users (
  email_normalized text primary key,
  user_id uuid not null
) on commit drop;

insert into _qa_auth_users (email_normalized, user_id)
select e.email_normalized, u.id
from _qa_tester_emails e
join auth.users u
  on lower(trim(u.email)) = e.email_normalized;

do $$
declare
  v_missing_auth text;
begin
  select string_agg(e.email_normalized, ', ' order by e.email_normalized)
    into v_missing_auth
  from _qa_tester_emails e
  where not exists (
    select 1 from _qa_auth_users a where a.email_normalized = e.email_normalized
  );

  if v_missing_auth is not null then
    raise exception
      'QA same-circle aborted: auth user not found for: %',
      v_missing_auth;
  end if;
end $$;

create temporary table _qa_parents (
  email_normalized text primary key,
  parent_id uuid not null,
  display_name text not null,
  state public.au_state not null
) on commit drop;

insert into _qa_parents (email_normalized, parent_id, display_name, state)
select
  a.email_normalized,
  p.id,
  p.display_name,
  p.state
from _qa_auth_users a
join public.parents p
  on p.id = a.user_id
 and p.deleted_at is null;

do $$
declare
  v_missing_parent text;
begin
  select string_agg(a.email_normalized, ', ' order by a.email_normalized)
    into v_missing_parent
  from _qa_auth_users a
  where not exists (
    select 1 from _qa_parents p where p.email_normalized = a.email_normalized
  );

  if v_missing_parent is not null then
    raise exception
      'QA same-circle aborted: parent record not found for: %',
      v_missing_parent;
  end if;
end $$;

do $$
declare
  v_incomplete text;
begin
  select string_agg(q.email_normalized, ', ' order by q.email_normalized)
    into v_incomplete
  from _qa_parents q
  join public.parents p on p.id = q.parent_id
  where p.feeding_method is null
     or trim(p.display_name) = 'New parent';

  if v_incomplete is not null then
    raise exception
      'QA same-circle aborted: onboarding incomplete for: %. Complete onboarding first.',
      v_incomplete;
  end if;

  if (select count(*) from _qa_parents) <> 4 then
    raise exception
      'QA same-circle aborted: expected exactly 4 resolved parents, found %',
      (select count(*) from _qa_parents);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 2) Create or reuse dedicated QA Circle (no matching rules on this circle)
-- ---------------------------------------------------------------------------
do $$
declare
  v_circle_id uuid;
  v_state public.au_state;
  v_name constant text := 'Glow Beta Test Circle';
  v_min_capacity constant int := 4;
begin
  select state into v_state
  from _qa_parents
  order by email_normalized
  limit 1;

  select c.id
    into v_circle_id
  from public.circles c
  where c.name = v_name
    and c.deleted_at is null
  order by c.created_at asc
  limit 1
  for update;

  if v_circle_id is null then
    insert into public.circles (
      name,
      description,
      primary_state,
      baby_age_min_months,
      baby_age_max_months,
      circle_type,
      status,
      max_members
    )
    values (
      v_name,
      'Manual QA Circle for private-beta testing. Not used by auto-assignment (no circle_rules).',
      v_state,
      0,
      60,
      'general',
      'active',
      12
    )
    returning id into v_circle_id;
  else
    update public.circles
    set
      status = 'active',
      max_members = greatest(max_members, 12),
      deleted_at = null,
      description = coalesce(
        description,
        'Manual QA Circle for private-beta testing. Not used by auto-assignment (no circle_rules).'
      )
    where id = v_circle_id;
  end if;

  if (
    select max_members from public.circles where id = v_circle_id
  ) < v_min_capacity then
    raise exception
      'QA same-circle aborted: circle % has max_members < %',
      v_circle_id,
      v_min_capacity;
  end if;

  -- Only this circle: remove rules so assign_parent_to_circle never selects it
  delete from public.circle_rules
  where circle_id = v_circle_id;

  create temporary table _qa_circle (
    circle_id uuid primary key
  ) on commit drop;

  insert into _qa_circle (circle_id) values (v_circle_id);
end $$;

-- ---------------------------------------------------------------------------
-- 3) Leave any other active Circles for THESE four parents only
-- ---------------------------------------------------------------------------
update public.circle_members cm
set
  status = 'left',
  deleted_at = coalesce(cm.deleted_at, timezone('utc', now()))
from _qa_parents q, _qa_circle qc
where cm.parent_id = q.parent_id
  and cm.circle_id is distinct from qc.circle_id
  and cm.status = 'active'
  and cm.deleted_at is null;

-- ---------------------------------------------------------------------------
-- 4) Upsert all four into the QA Circle (idempotent)
-- ---------------------------------------------------------------------------
insert into public.circle_members (circle_id, parent_id, status, deleted_at, joined_at)
select
  qc.circle_id,
  q.parent_id,
  'active',
  null,
  timezone('utc', now())
from _qa_parents q
cross join _qa_circle qc
on conflict (circle_id, parent_id) do update
set
  status = 'active',
  deleted_at = null,
  joined_at = case
    when public.circle_members.status = 'active'
     and public.circle_members.deleted_at is null
    then public.circle_members.joined_at
    else timezone('utc', now())
  end;

-- ---------------------------------------------------------------------------
-- 5) Final guard — exactly four active QA memberships for these parents
-- ---------------------------------------------------------------------------
do $$
declare
  v_active int;
begin
  select count(*)::int
    into v_active
  from public.circle_members cm
  join _qa_parents q on q.parent_id = cm.parent_id
  join _qa_circle qc on qc.circle_id = cm.circle_id
  where cm.status = 'active'
    and cm.deleted_at is null;

  if v_active <> 4 then
    raise exception
      'QA same-circle aborted: expected 4 active QA memberships, found %',
      v_active;
  end if;
end $$;

commit;

-- =============================================================================
-- A) Verification — masked emails (run after commit)
-- =============================================================================
select
  regexp_replace(e.email_normalized, '(^.).*(@.*$)', '\1***\2') as tester,
  c.name as circle_name,
  cm.status as membership_status,
  cm.joined_at,
  (
    select count(*)::int
    from public.circle_members m
    where m.circle_id = c.id
      and m.status = 'active'
      and m.deleted_at is null
  ) as active_member_count
from (values
  (lower(trim('TESTER_1_EMAIL'))),
  (lower(trim('TESTER_2_EMAIL'))),
  (lower(trim('TESTER_3_EMAIL'))),
  (lower(trim('TESTER_4_EMAIL')))
) as e(email_normalized)
join auth.users u
  on lower(trim(u.email)) = e.email_normalized
join public.circle_members cm
  on cm.parent_id = u.id
 and cm.status = 'active'
 and cm.deleted_at is null
join public.circles c
  on c.id = cm.circle_id
 and c.name = 'Glow Beta Test Circle'
 and c.deleted_at is null
order by e.email_normalized;

-- Expect: 4 rows, membership_status = active, active_member_count = 4
