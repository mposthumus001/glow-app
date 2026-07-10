-- =============================================================================
-- Sprint 4.4 — Circle Assignment Engine
-- =============================================================================
-- Trusted server-side assignment via SECURITY DEFINER RPC.
-- Parents cannot self-insert circle_members or circles (RLS tightened).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Baby age in whole months (documented rule — keep in sync with assignmentLogic.ts)
-- ---------------------------------------------------------------------------
-- 1. Use earliest baby row (created_at ASC) for the parent.
-- 2. If date_of_birth is set: floor whole months from DOB to today (min 0).
-- 3. Else if due_date is set and today >= due_date: floor months since due_date.
-- 4. Else if due_date is in the future: age = 0 (expecting).
-- 5. Else: NULL (no age-specific rule matching).
-- ---------------------------------------------------------------------------
create or replace function public.parent_baby_age_months(p_parent_id uuid)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_dob date;
  v_due date;
  v_months integer;
begin
  select b.date_of_birth, b.due_date
  into v_dob, v_due
  from public.babies b
  where b.parent_id = p_parent_id
    and b.deleted_at is null
  order by b.created_at asc
  limit 1;

  if v_dob is not null then
    v_months := (
      extract(year from age(current_date, v_dob)) * 12
      + extract(month from age(current_date, v_dob))
    )::integer;
    return greatest(0, v_months);
  end if;

  if v_due is not null then
    if current_date >= v_due then
      v_months := (
        extract(year from age(current_date, v_due)) * 12
        + extract(month from age(current_date, v_due))
      )::integer;
      return greatest(0, v_months);
    end if;
    return 0;
  end if;

  return null;
end;
$$;

comment on function public.parent_baby_age_months(uuid) is
  'Whole-month baby age for circle matching. DOB preferred, else due date. See migration 0004.';

-- ---------------------------------------------------------------------------
-- Rule specificity (non-null constraint fields count)
-- ---------------------------------------------------------------------------
create or replace function public.circle_rule_specificity(
  p_state public.au_state,
  p_feeding_method public.feeding_method,
  p_baby_age_min_months integer,
  p_baby_age_max_months integer,
  p_first_child boolean
)
returns integer
language sql
immutable
as $$
  select
    (case when p_state is not null then 1 else 0 end)
    + (case when p_feeding_method is not null then 1 else 0 end)
    + (case when p_first_child is not null then 1 else 0 end)
    + (case when p_baby_age_min_months is not null or p_baby_age_max_months is not null then 1 else 0 end);
$$;

-- ---------------------------------------------------------------------------
-- Does a rule match a parent profile?
-- ---------------------------------------------------------------------------
create or replace function public.circle_rule_matches_parent(
  p_rule_state public.au_state,
  p_rule_feeding public.feeding_method,
  p_rule_age_min integer,
  p_rule_age_max integer,
  p_rule_first_child boolean,
  p_parent_state public.au_state,
  p_parent_feeding public.feeding_method,
  p_parent_first_child boolean,
  p_baby_age_months integer
)
returns boolean
language sql
immutable
as $$
  select
    (p_rule_state is null or p_rule_state = p_parent_state)
    and (p_rule_feeding is null or p_rule_feeding = p_parent_feeding)
    and (p_rule_first_child is null or p_rule_first_child = p_parent_first_child)
    and (
      (p_rule_age_min is null and p_rule_age_max is null)
      or (
        p_baby_age_months is not null
        and (p_rule_age_min is null or p_baby_age_months >= p_rule_age_min)
        and (p_rule_age_max is null or p_baby_age_months <= p_rule_age_max)
      )
    );
$$;

-- ---------------------------------------------------------------------------
-- Active member count helper
-- ---------------------------------------------------------------------------
create or replace function public.circle_active_member_count(p_circle_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.circle_members cm
  where cm.circle_id = p_circle_id
    and cm.status = 'active'
    and cm.deleted_at is null;
$$;

-- ---------------------------------------------------------------------------
-- Assign parent to circle (idempotent, concurrency-safe)
-- ---------------------------------------------------------------------------
create or replace function public.assign_parent_to_circle(p_parent_id uuid default auth.uid())
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_parent record;
  v_baby_age integer;
  v_existing_circle uuid;
  v_existing_membership uuid;
  v_circle_id uuid;
  v_membership_id uuid;
  v_member_count integer;
  v_rule record;
  v_template record;
  v_age_min integer;
  v_age_max integer;
  v_name text;
  v_new_rule_id uuid;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if p_parent_id is distinct from v_uid and not public.is_staff() then
    raise exception 'Cannot assign circle for another parent';
  end if;

  -- Per-parent advisory lock for idempotency / concurrent requests.
  perform pg_advisory_xact_lock(hashtext('circle_assign:' || p_parent_id::text));

  -- Return existing active membership unchanged.
  select cm.id, cm.circle_id
  into v_existing_membership, v_existing_circle
  from public.circle_members cm
  where cm.parent_id = p_parent_id
    and cm.status = 'active'
    and cm.deleted_at is null
  order by cm.joined_at desc
  limit 1;

  if v_existing_circle is not null then
    return jsonb_build_object(
      'outcome', 'existing',
      'circle_id', v_existing_circle,
      'membership_id', v_existing_membership
    );
  end if;

  select
    p.id,
    p.display_name,
    p.state,
    p.feeding_method,
    p.first_child
  into v_parent
  from public.parents p
  where p.id = p_parent_id
    and p.deleted_at is null;

  if not found then
    raise exception 'Parent profile not found';
  end if;

  if v_parent.feeding_method is null then
    raise exception 'Parent has not completed onboarding';
  end if;

  if trim(v_parent.display_name) = 'New parent' then
    raise exception 'Parent has not completed onboarding';
  end if;

  v_baby_age := public.parent_baby_age_months(p_parent_id);

  -- Select best eligible active circle with capacity.
  -- Order: priority ASC, specificity DESC, member count DESC, oldest circle, id ASC.
  select
    c.id,
    cr.id as rule_id,
    cr.priority,
    mc.member_count,
    c.max_members
  into v_rule
  from public.circle_rules cr
  inner join public.circles c on c.id = cr.circle_id
  cross join lateral (
    select public.circle_active_member_count(c.id) as member_count
  ) mc
  where c.deleted_at is null
    and c.status = 'active'
    and mc.member_count < c.max_members
    and public.circle_rule_matches_parent(
      cr.state,
      cr.feeding_method,
      cr.baby_age_min_months,
      cr.baby_age_max_months,
      cr.first_child,
      v_parent.state,
      v_parent.feeding_method,
      v_parent.first_child,
      v_baby_age
    )
  order by
    cr.priority asc,
    public.circle_rule_specificity(
      cr.state, cr.feeding_method, cr.baby_age_min_months, cr.baby_age_max_months, cr.first_child
    ) desc,
    mc.member_count desc,
    c.created_at asc,
    c.id asc
  limit 1
  for update of c;

  if found then
    v_circle_id := v_rule.id;

    insert into public.circle_members (circle_id, parent_id, status)
    values (v_circle_id, p_parent_id, 'active')
    on conflict (circle_id, parent_id) do update
      set status = 'active',
          deleted_at = null,
          joined_at = timezone('utc', now())
    where public.circle_members.status <> 'active'
       or public.circle_members.deleted_at is not null
    returning id into v_membership_id;

    if v_membership_id is null then
      select cm.id into v_membership_id
      from public.circle_members cm
      where cm.circle_id = v_circle_id and cm.parent_id = p_parent_id;
    end if;

    return jsonb_build_object(
      'outcome', 'assigned',
      'circle_id', v_circle_id,
      'membership_id', v_membership_id
    );
  end if;

  -- No circle with capacity — pick best rule template to derive a new circle.
  select
    cr.id as rule_id,
    cr.state as rule_state,
    cr.feeding_method as rule_feeding,
    cr.baby_age_min_months,
    cr.baby_age_max_months,
    cr.first_child as rule_first_child,
    cr.priority,
    c.primary_state,
    c.baby_age_min_months as circle_age_min,
    c.baby_age_max_months as circle_age_max,
    c.circle_type,
    c.max_members
  into v_template
  from public.circle_rules cr
  inner join public.circles c on c.id = cr.circle_id
  where c.deleted_at is null
    and c.status in ('active', 'forming')
    and public.circle_rule_matches_parent(
      cr.state,
      cr.feeding_method,
      cr.baby_age_min_months,
      cr.baby_age_max_months,
      cr.first_child,
      v_parent.state,
      v_parent.feeding_method,
      v_parent.first_child,
      v_baby_age
    )
  order by
    cr.priority asc,
    public.circle_rule_specificity(
      cr.state, cr.feeding_method, cr.baby_age_min_months, cr.baby_age_max_months, cr.first_child
    ) desc,
    c.created_at asc,
    c.id asc
  limit 1;

  if found then
    v_age_min := coalesce(v_template.baby_age_min_months, v_template.circle_age_min, 0);
    v_age_max := coalesce(v_template.baby_age_max_months, v_template.circle_age_max, 12);
  else
    v_age_min := greatest(0, coalesce(v_baby_age, 0));
    v_age_max := least(60, v_age_min + 6);
    if v_age_max < v_age_min then
      v_age_max := v_age_min;
    end if;
  end if;

  v_name := 'Glow Circle · ' || v_parent.state::text;
  if v_baby_age is not null then
    v_name := v_name || ' · ' || v_age_min::text || '–' || v_age_max::text || ' mo';
  end if;

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
    'A small, trusted space for parents who understand.',
    v_parent.state,
    v_age_min,
    v_age_max,
    case when found then coalesce(v_template.circle_type, 'age_band') else 'age_band' end,
    'active',
    case when found then coalesce(v_template.max_members, 12) else 12 end
  )
  returning id into v_circle_id;

  v_new_rule_id := gen_random_uuid();

  insert into public.circle_rules (
    id,
    circle_id,
    state,
    feeding_method,
    baby_age_min_months,
    baby_age_max_months,
    first_child,
    priority
  )
  values (
    v_new_rule_id,
    v_circle_id,
    v_parent.state,
    null,
    v_age_min,
    v_age_max,
    null,
    50
  );

  insert into public.circle_members (circle_id, parent_id, status)
  values (v_circle_id, p_parent_id, 'active')
  returning id into v_membership_id;

  return jsonb_build_object(
    'outcome', 'created',
    'circle_id', v_circle_id,
    'membership_id', v_membership_id
  );
end;
$$;

comment on function public.assign_parent_to_circle(uuid) is
  'Idempotent circle assignment. SECURITY DEFINER — only self or staff. Uses advisory lock + row lock.';

revoke all on function public.parent_baby_age_months(uuid) from public;
revoke all on function public.circle_rule_specificity(public.au_state, public.feeding_method, integer, integer, boolean) from public;
revoke all on function public.circle_rule_matches_parent(public.au_state, public.feeding_method, integer, integer, boolean, public.au_state, public.feeding_method, boolean, integer) from public;
revoke all on function public.circle_active_member_count(uuid) from public;
revoke all on function public.assign_parent_to_circle(uuid) from public;

grant execute on function public.parent_baby_age_months(uuid) to authenticated;
grant execute on function public.assign_parent_to_circle(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS: assignment is service-owned
-- ---------------------------------------------------------------------------
drop policy if exists "circle_members_insert_self" on public.circle_members;

create policy "circle_members_insert_staff"
  on public.circle_members for insert
  to authenticated
  with check (public.is_staff());

drop policy if exists "circles_insert_authenticated" on public.circles;

create policy "circles_insert_staff"
  on public.circles for insert
  to authenticated
  with check (public.is_staff());
