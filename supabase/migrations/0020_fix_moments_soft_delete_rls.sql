-- =============================================================================
-- 0020 — Repair Moments soft-delete RLS
-- =============================================================================
-- Production failure:
--   soft_delete_private_moment → UPDATE moment_media SET deleted_at = ...
--   ERROR: new row violates row-level security policy for table "moment_media"
--
-- Exact blocking clause (Postgres UPDATE visibility rule):
--   policy "moment_media_select_own"
--   USING ( ... AND deleted_at is null AND exists(moments.deleted_at is null) )
--
-- Postgres requires the NEW row of an UPDATE to remain visible under SELECT
-- policies. Soft-delete sets deleted_at, so the NEW row fails SELECT and the
-- whole RPC transaction rolls back (moments.deleted_at also stays null).
--
-- Fix (approach B — safer for privacy):
--   Keep SELECT hiding soft-deleted rows from ordinary clients.
--   Run soft_delete_private_moment as SECURITY DEFINER with row_security = off
--   AFTER explicit auth.uid() ownership + baby-link checks.
--   Do not broaden SELECT. Do not disable table RLS.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Immutable-field / undelete guard for moment_media (ordinary clients)
-- ---------------------------------------------------------------------------
create or replace function public.guard_moment_media_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') = 'service_role' then
    return new;
  end if;

  if new.owner_parent_id is distinct from old.owner_parent_id
     or new.moment_id is distinct from old.moment_id
     or new.storage_path is distinct from old.storage_path
     or new.original_path is distinct from old.original_path
     or new.thumbnail_path is distinct from old.thumbnail_path
     or new.mime_type is distinct from old.mime_type
     or new.media_type is distinct from old.media_type
  then
    raise exception 'Cannot change moment media ownership or paths'
      using errcode = '42501';
  end if;

  -- Soft-delete allowed (null → timestamp). Undelete blocked for non-service roles.
  if old.deleted_at is not null and new.deleted_at is null then
    raise exception 'Cannot undelete moment media'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists moment_media_guard_update on public.moment_media;

create trigger moment_media_guard_update
  before update on public.moment_media
  for each row execute function public.guard_moment_media_update();

-- ---------------------------------------------------------------------------
-- Keep authenticated UPDATE policy owner-scoped.
-- Soft-delete via direct client UPDATE still cannot satisfy SELECT visibility
-- (by design). Soft-delete must go through soft_delete_private_moment.
-- ---------------------------------------------------------------------------
drop policy if exists "moment_media_update_own" on public.moment_media;

create policy "moment_media_update_own"
  on public.moment_media for update
  to authenticated
  using (
    owner_parent_id = auth.uid()
    and deleted_at is null
  )
  with check (
    owner_parent_id = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- Atomic owner soft-delete RPC — bypasses RLS after ownership validation
-- ---------------------------------------------------------------------------
create or replace function public.soft_delete_private_moment(
  p_moment_id uuid,
  p_baby_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_parent_id uuid := auth.uid();
  v_moment_id uuid;
  v_now timestamptz := timezone('utc', now());
  v_paths text[] := array[]::text[];
  v_row record;
  v_media_updated integer := 0;
  v_moment_updated integer := 0;
begin
  if v_parent_id is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if p_moment_id is null or p_baby_id is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  -- Ownership lock (explicit — never trust client-supplied owner)
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

  -- Collect Storage paths before soft-delete (owner-scoped only)
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

  get diagnostics v_media_updated = row_count;

  update public.moments
  set deleted_at = v_now
  where id = v_moment_id
    and owner_parent_id = v_parent_id
    and deleted_at is null;

  get diagnostics v_moment_updated = row_count;

  if v_moment_updated <> 1 then
    raise exception 'soft_delete_private_moment: moment update failed'
      using errcode = 'P0001';
  end if;

  return jsonb_build_object(
    'ok', true,
    'moment_id', v_moment_id,
    'media_updated', v_media_updated,
    'storage_paths', to_jsonb(v_paths)
  );
end;
$$;

comment on function public.soft_delete_private_moment(uuid, uuid) is
  'Owner-only atomic soft-delete. SECURITY DEFINER + row_security=off after '
  'auth.uid() ownership and baby-link checks. SELECT policies continue to hide '
  'soft-deleted rows from ordinary clients.';

revoke all on function public.soft_delete_private_moment(uuid, uuid) from public;
revoke all on function public.soft_delete_private_moment(uuid, uuid) from anon;
grant execute on function public.soft_delete_private_moment(uuid, uuid) to authenticated;

-- Ensure complete/fail processing RPCs remain service_role only
revoke all on function public.complete_moment_media_processing(uuid, integer, integer, bigint, bigint, boolean, text) from public;
revoke all on function public.complete_moment_media_processing(uuid, integer, integer, bigint, bigint, boolean, text) from authenticated;
revoke all on function public.complete_moment_media_processing(uuid, integer, integer, bigint, bigint, boolean, text) from anon;
grant execute on function public.complete_moment_media_processing(uuid, integer, integer, bigint, bigint, boolean, text) to service_role;

revoke all on function public.fail_moment_media_processing(uuid, text) from public;
revoke all on function public.fail_moment_media_processing(uuid, text) from authenticated;
revoke all on function public.fail_moment_media_processing(uuid, text) from anon;
grant execute on function public.fail_moment_media_processing(uuid, text) to service_role;
