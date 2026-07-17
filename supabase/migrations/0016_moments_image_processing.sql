-- =============================================================================
-- Sprint 9.2A — Moments secure image processing
-- =============================================================================
-- Adds processing state, distinct original/display paths, trusted completion RPCs.
-- storage_path becomes privacy-safe display.webp; original_path holds upload.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Enum: add processing state
-- ---------------------------------------------------------------------------
do $$
begin
  alter type public.moment_processing_status add value 'processing';
exception
  when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- moment_media columns
-- ---------------------------------------------------------------------------
alter table public.moment_media
  add column if not exists original_path text,
  add column if not exists processed_size_bytes bigint,
  add column if not exists thumbnail_size_bytes bigint,
  add column if not exists processing_error_code text,
  add column if not exists original_cleanup_required boolean not null default false,
  add column if not exists processing_started_at timestamptz,
  add column if not exists processing_completed_at timestamptz;

comment on column public.moment_media.original_path is
  'Private upload object. Deleted after successful processing. Never shown in UI.';

comment on column public.moment_media.storage_path is
  'Privacy-safe display.webp path after processing. Signed download when ready.';

alter table public.moment_media
  add constraint moment_media_original_path_length check (
    original_path is null or char_length(original_path) between 1 and 512
  ),
  add constraint moment_media_processing_error_code_length check (
    processing_error_code is null or char_length(processing_error_code) between 1 and 64
  ),
  add constraint moment_media_processed_size_non_negative check (
    processed_size_bytes is null or processed_size_bytes >= 0
  ),
  add constraint moment_media_thumbnail_size_non_negative check (
    thumbnail_size_bytes is null or thumbnail_size_bytes >= 0
  );

-- Backfill Sprint 9.1 rows: original upload path + display.webp target
update public.moment_media
set
  original_path = storage_path,
  storage_path = regexp_replace(storage_path, '/original\.[^/]+$', '/display.webp')
where original_path is null
  and storage_path ~ '/original\.(jpg|jpeg|png|webp)$';

create index if not exists moment_media_processing_idx
  on public.moment_media (processing_status, processing_started_at)
  where deleted_at is null;

-- ---------------------------------------------------------------------------
-- Path helpers (display + original + thumb)
-- ---------------------------------------------------------------------------
create or replace function public.moments_media_paths(
  p_owner_id uuid,
  p_moment_id uuid,
  p_media_id uuid,
  p_extension text
)
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'original_path',
      p_owner_id::text || '/' || p_moment_id::text || '/' || p_media_id::text
      || '/original.' || case when lower(p_extension) = 'jpeg' then 'jpg' else lower(p_extension) end,
    'storage_path',
      p_owner_id::text || '/' || p_moment_id::text || '/' || p_media_id::text || '/display.webp',
    'thumbnail_path',
      p_owner_id::text || '/' || p_moment_id::text || '/' || p_media_id::text || '/thumb.webp'
  );
$$;

-- ---------------------------------------------------------------------------
-- Replace upload slot RPC (original + display paths)
-- ---------------------------------------------------------------------------
create or replace function public.create_moment_media_upload_slot(
  p_moment_id uuid,
  p_mime_type text,
  p_original_filename text,
  p_size_bytes bigint,
  p_extension text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_parent_id uuid := auth.uid();
  v_media_id uuid;
  v_paths jsonb;
  v_original_path text;
  v_display_path text;
  v_thumb_path text;
  v_current_bytes bigint;
  v_quota_bytes bigint := 1073741824;
  v_ext text;
begin
  if v_parent_id is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if not public.moments_owner_owns_moment(p_moment_id) then
    return jsonb_build_object('ok', false, 'error', 'not_owner');
  end if;

  v_ext := lower(trim(coalesce(p_extension, '')));
  if v_ext not in ('jpg', 'jpeg', 'png', 'webp') then
    return jsonb_build_object('ok', false, 'error', 'unsupported_extension');
  end if;

  if lower(trim(p_mime_type)) not in (
    'image/jpeg', 'image/png', 'image/webp'
  ) then
    return jsonb_build_object('ok', false, 'error', 'unsupported_mime');
  end if;

  if p_size_bytes is null or p_size_bytes <= 0 or p_size_bytes > 8388608 then
    return jsonb_build_object('ok', false, 'error', 'invalid_size');
  end if;

  v_current_bytes := public.moments_parent_media_bytes(v_parent_id);
  if v_current_bytes + p_size_bytes > v_quota_bytes then
    return jsonb_build_object('ok', false, 'error', 'quota_exceeded');
  end if;

  v_media_id := gen_random_uuid();
  v_paths := public.moments_media_paths(v_parent_id, p_moment_id, v_media_id, v_ext);
  v_original_path := v_paths->>'original_path';
  v_display_path := v_paths->>'storage_path';
  v_thumb_path := v_paths->>'thumbnail_path';

  insert into public.moment_media (
    id,
    moment_id,
    owner_parent_id,
    original_path,
    storage_path,
    thumbnail_path,
    original_filename,
    media_type,
    mime_type,
    size_bytes,
    processing_status,
    sort_order
  )
  values (
    v_media_id,
    p_moment_id,
    v_parent_id,
    v_original_path,
    v_display_path,
    v_thumb_path,
    nullif(trim(p_original_filename), ''),
    'image',
    lower(trim(p_mime_type)),
    p_size_bytes,
    'pending',
    0
  );

  return jsonb_build_object(
    'ok', true,
    'media_id', v_media_id,
    'original_path', v_original_path,
    'storage_path', v_display_path,
    'thumbnail_path', v_thumb_path
  );
exception
  when others then
    return jsonb_build_object('ok', false, 'error', 'transaction_failed');
end;
$$;

-- ---------------------------------------------------------------------------
-- Finalize upload: confirm bytes uploaded, stay pending (never ready from client)
-- ---------------------------------------------------------------------------
create or replace function public.finalize_moment_media_upload(
  p_media_id uuid,
  p_size_bytes bigint,
  p_width integer default null,
  p_height integer default null,
  p_processing_status public.moment_processing_status default 'pending'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_parent_id uuid := auth.uid();
begin
  if v_parent_id is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if p_processing_status not in ('pending', 'failed') then
    return jsonb_build_object('ok', false, 'error', 'invalid_status');
  end if;

  update public.moment_media mm
  set
    size_bytes = coalesce(p_size_bytes, mm.size_bytes),
    processing_status = 'pending',
    processing_error_code = null,
    processing_started_at = null,
    processing_completed_at = null
  where mm.id = p_media_id
    and mm.owner_parent_id = v_parent_id
    and mm.deleted_at is null
    and mm.processing_status in ('pending', 'failed')
    and exists (
      select 1 from public.moments m
      where m.id = mm.moment_id
        and m.owner_parent_id = v_parent_id
        and m.deleted_at is null
    );

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  return jsonb_build_object('ok', true, 'media_id', p_media_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- Claim for processing (owner, pending or stale processing)
-- ---------------------------------------------------------------------------
create or replace function public.claim_moment_media_processing(p_media_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_parent_id uuid := auth.uid();
  v_row public.moment_media%rowtype;
begin
  if v_parent_id is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select * into v_row
  from public.moment_media mm
  where mm.id = p_media_id
    and mm.owner_parent_id = v_parent_id
    and mm.deleted_at is null
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_row.processing_status = 'ready' then
    return jsonb_build_object('ok', true, 'status', 'ready', 'media_id', p_media_id);
  end if;

  if v_row.processing_status = 'processing'
     and v_row.processing_started_at > timezone('utc', now()) - interval '10 minutes' then
    return jsonb_build_object('ok', true, 'status', 'processing', 'media_id', p_media_id);
  end if;

  if v_row.processing_status not in ('pending', 'failed', 'processing') then
    return jsonb_build_object('ok', false, 'error', 'invalid_status');
  end if;

  update public.moment_media
  set
    processing_status = 'processing',
    processing_started_at = timezone('utc', now()),
    processing_error_code = null
  where id = p_media_id;

  return jsonb_build_object(
    'ok', true,
    'status', 'processing',
    'media_id', p_media_id,
    'original_path', v_row.original_path,
    'storage_path', v_row.storage_path,
    'thumbnail_path', v_row.thumbnail_path,
    'owner_parent_id', v_row.owner_parent_id,
    'moment_id', v_row.moment_id
  );
end;
$$;

revoke all on function public.claim_moment_media_processing(uuid) from public;
grant execute on function public.claim_moment_media_processing(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Complete processing — service role only
-- ---------------------------------------------------------------------------
create or replace function public.complete_moment_media_processing(
  p_media_id uuid,
  p_width integer,
  p_height integer,
  p_processed_size_bytes bigint,
  p_thumbnail_size_bytes bigint,
  p_original_deleted boolean,
  p_mime_type text default 'image/webp'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.moment_media%rowtype;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  select * into v_row
  from public.moment_media
  where id = p_media_id
    and deleted_at is null
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_row.processing_status not in ('processing', 'pending') then
    if v_row.processing_status = 'ready' then
      return jsonb_build_object('ok', true, 'status', 'ready', 'media_id', p_media_id);
    end if;
    return jsonb_build_object('ok', false, 'error', 'invalid_status');
  end if;

  update public.moment_media
  set
    processing_status = 'ready',
    width = p_width,
    height = p_height,
    size_bytes = p_processed_size_bytes,
    processed_size_bytes = p_processed_size_bytes,
    thumbnail_size_bytes = p_thumbnail_size_bytes,
    mime_type = coalesce(p_mime_type, 'image/webp'),
    processing_completed_at = timezone('utc', now()),
    processing_error_code = null,
    original_cleanup_required = not coalesce(p_original_deleted, false)
  where id = p_media_id;

  return jsonb_build_object('ok', true, 'status', 'ready', 'media_id', p_media_id);
end;
$$;

revoke all on function public.complete_moment_media_processing(uuid, integer, integer, bigint, bigint, boolean, text) from public;
grant execute on function public.complete_moment_media_processing(uuid, integer, integer, bigint, bigint, boolean, text) to service_role;

-- ---------------------------------------------------------------------------
-- Fail processing — service role only
-- ---------------------------------------------------------------------------
create or replace function public.fail_moment_media_processing(
  p_media_id uuid,
  p_error_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  update public.moment_media
  set
    processing_status = 'failed',
    processing_error_code = left(trim(p_error_code), 64),
    processing_completed_at = timezone('utc', now())
  where id = p_media_id
    and deleted_at is null
    and processing_status in ('processing', 'pending');

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  return jsonb_build_object('ok', true, 'status', 'failed', 'media_id', p_media_id);
end;
$$;

revoke all on function public.fail_moment_media_processing(uuid, text) from public;
grant execute on function public.fail_moment_media_processing(uuid, text) to service_role;

-- ---------------------------------------------------------------------------
-- Retry — owner resets failed → pending
-- ---------------------------------------------------------------------------
create or replace function public.retry_moment_media_processing(p_media_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_parent_id uuid := auth.uid();
begin
  if v_parent_id is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  update public.moment_media mm
  set
    processing_status = 'pending',
    processing_error_code = null,
    processing_started_at = null,
    processing_completed_at = null,
    original_cleanup_required = false
  where mm.id = p_media_id
    and mm.owner_parent_id = v_parent_id
    and mm.deleted_at is null
    and mm.processing_status = 'failed';

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  return jsonb_build_object('ok', true, 'status', 'pending', 'media_id', p_media_id);
end;
$$;

revoke all on function public.retry_moment_media_processing(uuid) from public;
grant execute on function public.retry_moment_media_processing(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Storage policies: upload to original_path; read display/thumb when ready
-- ---------------------------------------------------------------------------
drop policy if exists "moments_storage_select_own" on storage.objects;
drop policy if exists "moments_storage_insert_own" on storage.objects;

create policy "moments_storage_select_own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'moments-private'
    and public.moments_storage_owner_id(name) = auth.uid()
    and exists (
      select 1
      from public.moment_media mm
      where mm.owner_parent_id = auth.uid()
        and mm.deleted_at is null
        and mm.processing_status = 'ready'
        and (mm.storage_path = name or mm.thumbnail_path = name)
    )
  );

create policy "moments_storage_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'moments-private'
    and public.moments_storage_owner_id(name) = auth.uid()
    and exists (
      select 1
      from public.moment_media mm
      where mm.owner_parent_id = auth.uid()
        and mm.deleted_at is null
        and mm.processing_status in ('pending', 'failed')
        and mm.original_path = name
    )
  );

-- Quota counts ready + pending/processing processed sizes
create or replace function public.moments_parent_media_bytes(p_parent_id uuid)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(
    case
      when mm.processing_status = 'ready' then coalesce(mm.processed_size_bytes, mm.size_bytes, 0)
        + coalesce(mm.thumbnail_size_bytes, 0)
      else coalesce(mm.size_bytes, 0)
    end
  ), 0)::bigint
  from public.moment_media mm
  where mm.owner_parent_id = p_parent_id
    and mm.deleted_at is null
    and mm.processing_status in ('pending', 'processing', 'ready');
$$;
