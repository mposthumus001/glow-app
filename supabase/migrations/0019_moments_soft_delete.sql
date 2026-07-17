-- =============================================================================
-- Sprint 9.2B fix — owner soft-delete for private Moments
-- =============================================================================
-- Problem: client multi-step updates could report success without verifying
-- soft-delete, and UI swallowed failures. This migration adds an atomic
-- owner-only soft-delete RPC and a cleanup flag for Storage follow-up.
-- =============================================================================

-- Flag for best-effort Storage cleanup after soft-delete
alter table public.moment_media
  add column if not exists storage_cleanup_required boolean not null default false;

comment on column public.moment_media.storage_cleanup_required is
  'True when soft-delete succeeded but Storage object removal still needs follow-up.';

-- Explicitly document that soft-delete (deleted_at) is allowed for owners.
-- Ownership and non-private visibility remain blocked.
create or replace function public.guard_moments_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or coalesce(auth.role(), '') = 'service_role' then
    return new;
  end if;

  if new.owner_parent_id is distinct from old.owner_parent_id
     or new.family_id is distinct from old.family_id then
    raise exception 'Cannot change moment ownership';
  end if;

  if new.visibility is distinct from old.visibility
     and new.visibility <> 'private' then
    raise exception 'Shared visibility is not available yet';
  end if;

  -- Soft-delete (setting deleted_at) is intentionally allowed for the owner.
  return new;
end;
$$;

-- Atomic owner soft-delete: verifies ownership + baby link, soft-deletes
-- moment + media, returns Storage paths for best-effort cleanup.
create or replace function public.soft_delete_private_moment(
  p_moment_id uuid,
  p_baby_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_parent_id uuid := auth.uid();
  v_moment_id uuid;
  v_now timestamptz := timezone('utc', now());
  v_paths text[] := array[]::text[];
  v_row record;
begin
  if v_parent_id is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if p_moment_id is null or p_baby_id is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  select m.id
  into v_moment_id
  from public.moments m
  where m.id = p_moment_id
    and m.owner_parent_id = v_parent_id
    and m.deleted_at is null
  for update;

  if v_moment_id is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if not exists (
    select 1
    from public.moment_children mc
    where mc.moment_id = v_moment_id
      and mc.baby_id = p_baby_id
  ) then
    return jsonb_build_object('ok', false, 'error', 'wrong_baby');
  end if;

  -- Collect Storage paths before soft-delete hides rows from normal SELECT.
  for v_row in
    select mm.storage_path, mm.thumbnail_path, mm.original_path
    from public.moment_media mm
    where mm.moment_id = v_moment_id
      and mm.owner_parent_id = v_parent_id
      and mm.deleted_at is null
  loop
    if v_row.storage_path is not null and length(v_row.storage_path) > 0 then
      v_paths := array_append(v_paths, v_row.storage_path);
    end if;
    if v_row.thumbnail_path is not null and length(v_row.thumbnail_path) > 0 then
      v_paths := array_append(v_paths, v_row.thumbnail_path);
    end if;
    if v_row.original_path is not null and length(v_row.original_path) > 0 then
      v_paths := array_append(v_paths, v_row.original_path);
    end if;
  end loop;

  update public.moment_media
  set deleted_at = v_now
  where moment_id = v_moment_id
    and owner_parent_id = v_parent_id
    and deleted_at is null;

  update public.moments
  set deleted_at = v_now
  where id = v_moment_id
    and owner_parent_id = v_parent_id
    and deleted_at is null;

  return jsonb_build_object(
    'ok', true,
    'moment_id', v_moment_id,
    'storage_paths', to_jsonb(v_paths)
  );
end;
$$;

comment on function public.soft_delete_private_moment(uuid, uuid) is
  'Owner-only atomic soft-delete for a private Moment linked to a baby. '
  'Does not hard-delete rows. Returns Storage paths for best-effort cleanup.';

revoke all on function public.soft_delete_private_moment(uuid, uuid) from public;
grant execute on function public.soft_delete_private_moment(uuid, uuid) to authenticated;

-- Keep UPDATE RLS owner-scoped; soft-delete sets deleted_at while WITH CHECK
-- still freezes ownership, family_id, and private visibility.
drop policy if exists "moments_update_own" on public.moments;

create policy "moments_update_own"
  on public.moments for update
  to authenticated
  using (
    owner_parent_id = auth.uid()
    and deleted_at is null
  )
  with check (
    owner_parent_id = auth.uid()
    and family_id = public.current_family_id()
    and visibility = 'private'
  );
