-- =============================================================================
-- Sprint 6.1 — Private Beta RLS hardening
-- =============================================================================
-- Tightens parent profile enumeration and assignment helper authorization.
-- Adds circle message update guards.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Helper: active circle co-membership (for scoped parent reads)
-- ---------------------------------------------------------------------------
create or replace function public.shares_active_circle_with(p_peer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.circle_members cm_self
    join public.circle_members cm_peer
      on cm_self.circle_id = cm_peer.circle_id
    where cm_self.parent_id = auth.uid()
      and cm_self.status = 'active'
      and cm_self.deleted_at is null
      and cm_peer.parent_id = p_peer_id
      and cm_peer.status = 'active'
      and cm_peer.deleted_at is null
  );
$$;

comment on function public.shares_active_circle_with(uuid) is
  'True when auth.uid() and p_peer_id are active members of the same circle.';

revoke all on function public.shares_active_circle_with(uuid) from public;
grant execute on function public.shares_active_circle_with(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- parents SELECT — replace global enumeration with scoped access
-- ---------------------------------------------------------------------------
drop policy if exists "parents_select_authenticated" on public.parents;

create policy "parents_select_scoped"
  on public.parents for select
  to authenticated
  using (
    deleted_at is null
    and (
      id = auth.uid()
      or public.is_staff()
      or public.shares_active_circle_with(id)
    )
  );

comment on policy "parents_select_scoped" on public.parents is
  'Own row, staff, or active circle co-members only. Clients should still select minimal columns.';

-- ---------------------------------------------------------------------------
-- parent_baby_age_months — restrict to self or staff
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
  if p_parent_id is distinct from auth.uid() and not public.is_staff() then
    raise exception 'not authorized'
      using errcode = '42501';
  end if;

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

-- ---------------------------------------------------------------------------
-- circle_messages UPDATE — freeze privileged columns on user edits
-- ---------------------------------------------------------------------------
create or replace function public.guard_circle_message_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_staff() then
    if new.parent_id is distinct from old.parent_id
      or new.circle_id is distinct from old.circle_id
      or new.moderation_status is distinct from old.moderation_status
      or new.prompt_id is distinct from old.prompt_id
      or new.deleted_at is distinct from old.deleted_at
    then
      raise exception 'cannot modify protected message fields'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists circle_messages_guard_update on public.circle_messages;

create trigger circle_messages_guard_update
  before update on public.circle_messages
  for each row
  execute function public.guard_circle_message_update();
