-- =============================================================================
-- Admin / debug: Circle assignment health (run in SQL Editor as postgres)
-- =============================================================================
-- Shows onboarding completion, membership, unmatched parents, and capacity.
-- Never expose raw results to parents in-app.
-- =============================================================================

-- 1) Parent assignment overview
select
  p.id as parent_id,
  u.email,
  p.display_name,
  p.state,
  p.feeding_method,
  p.first_child,
  (
    p.feeding_method is not null
    and trim(p.display_name) is distinct from 'New parent'
  ) as onboarded,
  public.parent_baby_age_months(p.id) as baby_age_months,
  cm.id as membership_id,
  cm.status as membership_status,
  c.id as circle_id,
  c.name as circle_name,
  c.status as circle_status,
  public.circle_active_member_count(c.id) as circle_member_count,
  c.max_members as circle_capacity
from public.parents p
left join auth.users u on u.id = p.id
left join lateral (
  select cm2.*
  from public.circle_members cm2
  where cm2.parent_id = p.id
    and cm2.status = 'active'
    and cm2.deleted_at is null
  order by cm2.joined_at desc
  limit 1
) cm on true
left join public.circles c on c.id = cm.circle_id
where p.deleted_at is null
order by onboarded desc, u.email nulls last;

-- 2) Unmatched onboarded parents (holding state / admin follow-up)
select
  p.id as parent_id,
  u.email,
  p.display_name,
  p.state,
  p.feeding_method,
  p.first_child,
  public.parent_baby_age_months(p.id) as baby_age_months,
  p.created_at as parent_created_at
from public.parents p
left join auth.users u on u.id = p.id
where p.deleted_at is null
  and p.feeding_method is not null
  and trim(p.display_name) is distinct from 'New parent'
  and not exists (
    select 1
    from public.circle_members cm
    where cm.parent_id = p.id
      and cm.status = 'active'
      and cm.deleted_at is null
  )
order by p.created_at asc;

-- 3) Circle capacity snapshot
select
  c.id as circle_id,
  c.name,
  c.status,
  c.primary_state,
  c.baby_age_min_months,
  c.baby_age_max_months,
  public.circle_active_member_count(c.id) as member_count,
  c.max_members,
  (c.max_members - public.circle_active_member_count(c.id)) as seats_remaining,
  (
    select count(*)::integer
    from public.circle_rules cr
    where cr.circle_id = c.id
  ) as rule_count
from public.circles c
where c.deleted_at is null
order by c.status, c.primary_state, c.name;
