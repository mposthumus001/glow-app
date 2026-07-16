-- =============================================================================
-- Production Circle assignment: match existing Circles only (no auto-create)
-- =============================================================================
-- Replaces assign_parent_to_circle behaviour from 0004:
-- * Prefer best matching active Circle with capacity
-- * Never auto-create Circles for unmatched parents
-- * Return outcome = no_match with structured admin fields
-- * Re-check capacity after FOR UPDATE to prevent last-slot races
-- =============================================================================

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
  v_max_members integer;
  v_rule record;
  v_attempt integer;
  v_skipped uuid[] := array[]::uuid[];
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

  -- Try up to 10 candidates: lock circle row, re-check capacity, then insert.
  for v_attempt in 1..10 loop
    select
      c.id,
      cr.id as rule_id,
      cr.priority,
      c.max_members
    into v_rule
    from public.circle_rules cr
    inner join public.circles c on c.id = cr.circle_id
    where c.deleted_at is null
      and c.status = 'active'
      and not (c.id = any (v_skipped))
      and public.circle_active_member_count(c.id) < c.max_members
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
      public.circle_active_member_count(c.id) desc,
      c.created_at asc,
      c.id asc
    limit 1
    for update of c;

    exit when not found;

    v_circle_id := v_rule.id;
    v_max_members := v_rule.max_members;

    -- Capacity race: waiters serialize on FOR UPDATE; re-count under the lock.
    v_member_count := public.circle_active_member_count(v_circle_id);
    if v_member_count >= v_max_members then
      v_skipped := array_append(v_skipped, v_circle_id);
      continue;
    end if;

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
  end loop;

  -- No suitable active Circle with capacity — do not invent one.
  raise log 'circle_assignment_no_match parent_id=% state=% feeding=% first_child=% baby_age=%',
    p_parent_id,
    v_parent.state,
    v_parent.feeding_method,
    v_parent.first_child,
    v_baby_age;

  return jsonb_build_object(
    'outcome', 'no_match',
    'reason', 'no_eligible_active_circle',
    'parent_id', p_parent_id,
    'parent_state', v_parent.state,
    'feeding_method', v_parent.feeding_method,
    'first_child', v_parent.first_child,
    'baby_age_months', v_baby_age
  );
end;
$$;

comment on function public.assign_parent_to_circle(uuid) is
  'Idempotent Circle assignment into existing active Circles only. Returns no_match when none fit. SECURITY DEFINER — self or staff. Advisory lock + circle row lock + post-lock capacity recheck.';

revoke all on function public.assign_parent_to_circle(uuid) from public;
grant execute on function public.assign_parent_to_circle(uuid) to authenticated;
