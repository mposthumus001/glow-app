-- =============================================================================
-- Sprint 9.1 — Glow Moments foundation (private only)
-- =============================================================================
-- Private photo Moments: metadata, child links, media, tags.
-- No shared_families, no shared visibility in this sprint.
-- Storage bucket: moments-private (private, signed URLs only).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.moment_visibility as enum (
  'private',
  'shared_family'
);

create type public.moment_media_type as enum (
  'image'
);

create type public.moment_processing_status as enum (
  'pending',
  'ready',
  'failed'
);

-- ---------------------------------------------------------------------------
-- moments
-- ---------------------------------------------------------------------------
create table public.moments (
  id uuid primary key default gen_random_uuid(),
  owner_parent_id uuid not null references public.parents (id) on delete cascade,
  family_id uuid not null references public.families (id) on delete cascade,
  title text,
  caption text,
  occurred_on date not null,
  visibility public.moment_visibility not null default 'private',
  is_favourite boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,

  constraint moments_title_length check (
    title is null or char_length(title) between 1 and 120
  ),
  constraint moments_caption_length check (
    caption is null or char_length(caption) between 1 and 500
  ),
  constraint moments_sprint91_private_only check (
    visibility = 'private'
  )
);

comment on table public.moments is
  'Private photo moments. Sprint 9.1: owner-only, visibility private.';

comment on constraint moments_sprint91_private_only on public.moments is
  'Drop or relax when shared_family sharing ships (Sprint 9.5+).';

create index moments_owner_occurred_idx
  on public.moments (owner_parent_id, occurred_on desc)
  where deleted_at is null;

create index moments_owner_active_idx
  on public.moments (owner_parent_id)
  where deleted_at is null;

create index moments_owner_favourite_idx
  on public.moments (owner_parent_id, is_favourite)
  where deleted_at is null and is_favourite = true;

create index moments_family_id_idx on public.moments (family_id);

create trigger moments_set_updated_at
  before update on public.moments
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- moment_children
-- ---------------------------------------------------------------------------
create table public.moment_children (
  moment_id uuid not null references public.moments (id) on delete cascade,
  baby_id uuid not null references public.babies (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),

  primary key (moment_id, baby_id)
);

comment on table public.moment_children is
  'Links moments to zero or more babies. No baby_id on moments table.';

create index moment_children_baby_idx on public.moment_children (baby_id);

-- ---------------------------------------------------------------------------
-- moment_media
-- ---------------------------------------------------------------------------
create table public.moment_media (
  id uuid primary key default gen_random_uuid(),
  moment_id uuid not null references public.moments (id) on delete cascade,
  owner_parent_id uuid not null references public.parents (id) on delete cascade,
  storage_path text not null,
  thumbnail_path text,
  original_filename text,
  media_type public.moment_media_type not null default 'image',
  mime_type text not null,
  size_bytes bigint not null default 0,
  width integer,
  height integer,
  processing_status public.moment_processing_status not null default 'pending',
  sort_order smallint not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,

  constraint moment_media_path_length check (
    char_length(storage_path) between 1 and 512
  ),
  constraint moment_media_thumb_length check (
    thumbnail_path is null or char_length(thumbnail_path) between 1 and 512
  ),
  constraint moment_media_filename_length check (
    original_filename is null or char_length(original_filename) between 1 and 255
  ),
  constraint moment_media_mime_length check (
    char_length(mime_type) between 1 and 64
  ),
  constraint moment_media_size_non_negative check (size_bytes >= 0),
  constraint moment_media_size_max check (size_bytes <= 8388608)
);

comment on table public.moment_media is
  'Media metadata for moments-private bucket. Never public URLs.';

create unique index moment_media_storage_path_unique
  on public.moment_media (storage_path)
  where deleted_at is null;

create index moment_media_moment_idx
  on public.moment_media (moment_id)
  where deleted_at is null;

create index moment_media_owner_idx
  on public.moment_media (owner_parent_id)
  where deleted_at is null;

create index moment_media_pending_cleanup_idx
  on public.moment_media (created_at)
  where deleted_at is null and processing_status = 'pending';

create index moment_media_quota_idx
  on public.moment_media (owner_parent_id, processing_status)
  where deleted_at is null and processing_status in ('pending', 'ready');

-- ---------------------------------------------------------------------------
-- moment_tags
-- ---------------------------------------------------------------------------
create table public.moment_tags (
  id uuid primary key default gen_random_uuid(),
  owner_parent_id uuid references public.parents (id) on delete cascade,
  label text not null,
  normalised_label text not null,
  is_system boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,

  constraint moment_tags_label_length check (
    char_length(label) between 1 and 60
  ),
  constraint moment_tags_normalised_length check (
    char_length(normalised_label) between 1 and 60
  ),
  constraint moment_tags_system_owner check (
    (is_system = true and owner_parent_id is null)
    or (is_system = false and owner_parent_id is not null)
  )
);

comment on table public.moment_tags is
  'Curated system tags and parent-scoped custom tags. Labels only — not medical.';

create unique index moment_tags_system_normalised_unique
  on public.moment_tags (normalised_label)
  where is_system = true and deleted_at is null;

create unique index moment_tags_custom_normalised_unique
  on public.moment_tags (owner_parent_id, normalised_label)
  where is_system = false and deleted_at is null;

create trigger moment_tags_set_updated_at
  before update on public.moment_tags
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- moment_tag_links
-- ---------------------------------------------------------------------------
create table public.moment_tag_links (
  moment_id uuid not null references public.moments (id) on delete cascade,
  tag_id uuid not null references public.moment_tags (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),

  primary key (moment_id, tag_id)
);

create index moment_tag_links_tag_idx on public.moment_tag_links (tag_id);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.moments_owner_owns_moment(p_moment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.moments m
    where m.id = p_moment_id
      and m.owner_parent_id = auth.uid()
      and m.deleted_at is null
      and m.visibility = 'private'
  );
$$;

create or replace function public.moments_storage_owner_id(p_path text)
returns uuid
language sql
immutable
as $$
  select nullif(split_part(p_path, '/', 1), '')::uuid;
$$;

comment on function public.moments_storage_owner_id(text) is
  'First path segment must be owner_parent_id UUID.';

create or replace function public.moments_parent_media_bytes(p_parent_id uuid)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(mm.size_bytes), 0)::bigint
  from public.moment_media mm
  where mm.owner_parent_id = p_parent_id
    and mm.deleted_at is null
    and mm.processing_status in ('pending', 'ready');
$$;

comment on function public.moments_parent_media_bytes(uuid) is
  'Total stored bytes for quota (pending + ready). Beta cap: 1 GB.';

create or replace function public.moments_normalise_tag_label(p_label text)
returns text
language sql
immutable
as $$
  select lower(trim(p_label));
$$;

-- ---------------------------------------------------------------------------
-- Guard: prevent client tampering with ownership columns
-- ---------------------------------------------------------------------------
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

  return new;
end;
$$;

create trigger moments_guard_update
  before update on public.moments
  for each row execute function public.guard_moments_update();

-- ---------------------------------------------------------------------------
-- RPC: atomic private moment creation
-- ---------------------------------------------------------------------------
create or replace function public.create_private_moment(
  p_title text,
  p_caption text,
  p_occurred_on date,
  p_baby_ids uuid[] default array[]::uuid[],
  p_tag_ids uuid[] default array[]::uuid[],
  p_custom_tag_labels text[] default array[]::text[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_parent_id uuid := auth.uid();
  v_family_id uuid;
  v_moment_id uuid;
  v_baby_id uuid;
  v_tag_id uuid;
  v_label text;
  v_normalised text;
  v_custom_tag_id uuid;
begin
  if v_parent_id is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select p.family_id
  into v_family_id
  from public.parents p
  where p.id = v_parent_id
    and p.deleted_at is null
    and p.family_id is not null;

  if v_family_id is null then
    return jsonb_build_object('ok', false, 'error', 'no_family');
  end if;

  if p_occurred_on is null then
    return jsonb_build_object('ok', false, 'error', 'occurred_on_required');
  end if;

  if p_title is not null and char_length(trim(p_title)) = 0 then
    return jsonb_build_object('ok', false, 'error', 'invalid_title');
  end if;

  if p_caption is not null and char_length(trim(p_caption)) = 0 then
    return jsonb_build_object('ok', false, 'error', 'invalid_caption');
  end if;

  foreach v_baby_id in array coalesce(p_baby_ids, array[]::uuid[]) loop
    if not exists (
      select 1
      from public.babies b
      where b.id = v_baby_id
        and b.family_id = v_family_id
        and b.deleted_at is null
    ) then
      return jsonb_build_object('ok', false, 'error', 'invalid_baby', 'baby_id', v_baby_id);
    end if;
  end loop;

  foreach v_tag_id in array coalesce(p_tag_ids, array[]::uuid[]) loop
    if not exists (
      select 1
      from public.moment_tags t
      where t.id = v_tag_id
        and t.deleted_at is null
        and (
          t.is_system = true
          or t.owner_parent_id = v_parent_id
        )
    ) then
      return jsonb_build_object('ok', false, 'error', 'invalid_tag', 'tag_id', v_tag_id);
    end if;
  end loop;

  insert into public.moments (
    owner_parent_id,
    family_id,
    title,
    caption,
    occurred_on,
    visibility
  )
  values (
    v_parent_id,
    v_family_id,
    nullif(trim(p_title), ''),
    nullif(trim(p_caption), ''),
    p_occurred_on,
    'private'
  )
  returning id into v_moment_id;

  foreach v_baby_id in array coalesce(p_baby_ids, array[]::uuid[]) loop
    insert into public.moment_children (moment_id, baby_id)
    values (v_moment_id, v_baby_id);
  end loop;

  foreach v_tag_id in array coalesce(p_tag_ids, array[]::uuid[]) loop
    insert into public.moment_tag_links (moment_id, tag_id)
    values (v_moment_id, v_tag_id)
    on conflict do nothing;
  end loop;

  foreach v_label in array coalesce(p_custom_tag_labels, array[]::text[]) loop
    v_normalised := public.moments_normalise_tag_label(v_label);
    if v_normalised is null or char_length(v_normalised) = 0 then
      continue;
    end if;

    select t.id
    into v_custom_tag_id
    from public.moment_tags t
    where t.owner_parent_id = v_parent_id
      and t.is_system = false
      and t.normalised_label = v_normalised
      and t.deleted_at is null
    limit 1;

    if v_custom_tag_id is null then
      insert into public.moment_tags (
        owner_parent_id,
        label,
        normalised_label,
        is_system
      )
      values (
        v_parent_id,
        trim(v_label),
        v_normalised,
        false
      )
      returning id into v_custom_tag_id;
    end if;

    insert into public.moment_tag_links (moment_id, tag_id)
    values (v_moment_id, v_custom_tag_id)
    on conflict do nothing;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'moment_id', v_moment_id
  );
exception
  when others then
    return jsonb_build_object('ok', false, 'error', 'transaction_failed');
end;
$$;

comment on function public.create_private_moment(text, text, date, uuid[], uuid[], text[]) is
  'Atomic private moment creation. Derives family_id server-side. Sprint 9.1.';

revoke all on function public.create_private_moment(text, text, date, uuid[], uuid[], text[]) from public;
grant execute on function public.create_private_moment(text, text, date, uuid[], uuid[], text[]) to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: pending media upload slot
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
  v_storage_path text;
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
  v_storage_path := v_parent_id::text || '/' || p_moment_id::text || '/' || v_media_id::text || '/original.' || case when v_ext = 'jpeg' then 'jpg' else v_ext end;
  v_thumb_path := v_parent_id::text || '/' || p_moment_id::text || '/' || v_media_id::text || '/thumb.webp';

  insert into public.moment_media (
    id,
    moment_id,
    owner_parent_id,
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
    v_storage_path,
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
    'storage_path', v_storage_path,
    'thumbnail_path', v_thumb_path
  );
exception
  when others then
    return jsonb_build_object('ok', false, 'error', 'transaction_failed');
end;
$$;

comment on function public.create_moment_media_upload_slot(uuid, text, text, bigint, text) is
  'Creates pending media metadata and canonical storage paths. Sprint 9.1.';

revoke all on function public.create_moment_media_upload_slot(uuid, text, text, bigint, text) from public;
grant execute on function public.create_moment_media_upload_slot(uuid, text, text, bigint, text) to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: finalize media after upload (processing boundary — status only in 9.1)
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

  if p_processing_status not in ('pending', 'ready', 'failed') then
    return jsonb_build_object('ok', false, 'error', 'invalid_status');
  end if;

  -- Sprint 9.1: only processing service may set ready; clients keep pending.
  if p_processing_status = 'ready' then
    return jsonb_build_object('ok', false, 'error', 'processing_not_available');
  end if;

  update public.moment_media mm
  set
    size_bytes = coalesce(p_size_bytes, mm.size_bytes),
    width = p_width,
    height = p_height,
    processing_status = p_processing_status
  where mm.id = p_media_id
    and mm.owner_parent_id = v_parent_id
    and mm.deleted_at is null
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

revoke all on function public.finalize_moment_media_upload(uuid, bigint, integer, integer, public.moment_processing_status) from public;
grant execute on function public.finalize_moment_media_upload(uuid, bigint, integer, integer, public.moment_processing_status) to authenticated;

-- ---------------------------------------------------------------------------
-- Seed system tags
-- ---------------------------------------------------------------------------
insert into public.moment_tags (label, normalised_label, is_system, owner_parent_id)
values
  ('First smile', 'first smile', true, null),
  ('First laugh', 'first laugh', true, null),
  ('First bath', 'first bath', true, null),
  ('First solid food', 'first solid food', true, null),
  ('First tooth', 'first tooth', true, null),
  ('First crawl', 'first crawl', true, null),
  ('First steps', 'first steps', true, null),
  ('First word', 'first word', true, null),
  ('First haircut', 'first haircut', true, null),
  ('First birthday', 'first birthday', true, null),
  ('Family time', 'family time', true, null),
  ('Just because', 'just because', true, null);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.moments enable row level security;
alter table public.moment_children enable row level security;
alter table public.moment_media enable row level security;
alter table public.moment_tags enable row level security;
alter table public.moment_tag_links enable row level security;

-- moments: owner-only (not household co-parents)
create policy "moments_select_own"
  on public.moments for select
  to authenticated
  using (
    owner_parent_id = auth.uid()
    and deleted_at is null
  );

create policy "moments_insert_own"
  on public.moments for insert
  to authenticated
  with check (
    owner_parent_id = auth.uid()
    and family_id = public.current_family_id()
    and visibility = 'private'
    and deleted_at is null
  );

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

create policy "moments_select_staff"
  on public.moments for select
  to authenticated
  using (public.is_staff());

-- moment_children: via owned moment + household baby
create policy "moment_children_select_own"
  on public.moment_children for select
  to authenticated
  using (
    exists (
      select 1 from public.moments m
      where m.id = moment_id
        and m.owner_parent_id = auth.uid()
        and m.deleted_at is null
    )
  );

create policy "moment_children_insert_own"
  on public.moment_children for insert
  to authenticated
  with check (
    exists (
      select 1 from public.moments m
      where m.id = moment_id
        and m.owner_parent_id = auth.uid()
        and m.deleted_at is null
    )
    and public.family_owns_baby(baby_id)
  );

create policy "moment_children_delete_own"
  on public.moment_children for delete
  to authenticated
  using (
    exists (
      select 1 from public.moments m
      where m.id = moment_id
        and m.owner_parent_id = auth.uid()
        and m.deleted_at is null
    )
  );

-- moment_media
create policy "moment_media_select_own"
  on public.moment_media for select
  to authenticated
  using (
    owner_parent_id = auth.uid()
    and deleted_at is null
    and exists (
      select 1 from public.moments m
      where m.id = moment_id
        and m.owner_parent_id = auth.uid()
        and m.deleted_at is null
    )
  );

create policy "moment_media_insert_own"
  on public.moment_media for insert
  to authenticated
  with check (
    owner_parent_id = auth.uid()
    and exists (
      select 1 from public.moments m
      where m.id = moment_id
        and m.owner_parent_id = auth.uid()
        and m.deleted_at is null
    )
  );

create policy "moment_media_update_own"
  on public.moment_media for update
  to authenticated
  using (owner_parent_id = auth.uid() and deleted_at is null)
  with check (owner_parent_id = auth.uid());

create policy "moment_media_select_staff"
  on public.moment_media for select
  to authenticated
  using (public.is_staff());

-- moment_tags
create policy "moment_tags_select_system"
  on public.moment_tags for select
  to authenticated
  using (is_system = true and deleted_at is null);

create policy "moment_tags_select_own_custom"
  on public.moment_tags for select
  to authenticated
  using (
    is_system = false
    and owner_parent_id = auth.uid()
    and deleted_at is null
  );

create policy "moment_tags_insert_own_custom"
  on public.moment_tags for insert
  to authenticated
  with check (
    is_system = false
    and owner_parent_id = auth.uid()
    and deleted_at is null
  );

create policy "moment_tags_update_own_custom"
  on public.moment_tags for update
  to authenticated
  using (
    is_system = false
    and owner_parent_id = auth.uid()
    and deleted_at is null
  )
  with check (
    is_system = false
    and owner_parent_id = auth.uid()
  );

create policy "moment_tags_select_staff"
  on public.moment_tags for select
  to authenticated
  using (public.is_staff());

-- moment_tag_links
create policy "moment_tag_links_select_own"
  on public.moment_tag_links for select
  to authenticated
  using (
    exists (
      select 1 from public.moments m
      where m.id = moment_id
        and m.owner_parent_id = auth.uid()
        and m.deleted_at is null
    )
  );

create policy "moment_tag_links_insert_own"
  on public.moment_tag_links for insert
  to authenticated
  with check (
    exists (
      select 1 from public.moments m
      where m.id = moment_id
        and m.owner_parent_id = auth.uid()
        and m.deleted_at is null
    )
    and exists (
      select 1 from public.moment_tags t
      where t.id = tag_id
        and t.deleted_at is null
        and (t.is_system = true or t.owner_parent_id = auth.uid())
    )
  );

create policy "moment_tag_links_delete_own"
  on public.moment_tag_links for delete
  to authenticated
  using (
    exists (
      select 1 from public.moments m
      where m.id = moment_id
        and m.owner_parent_id = auth.uid()
        and m.deleted_at is null
    )
  );

-- Grants
grant select, insert, update on public.moments to authenticated;
grant select, insert, delete on public.moment_children to authenticated;
grant select, insert, update on public.moment_media to authenticated;
grant select, insert, update on public.moment_tags to authenticated;
grant select, insert, delete on public.moment_tag_links to authenticated;

grant execute on function public.moments_owner_owns_moment(uuid) to authenticated;
grant execute on function public.moments_parent_media_bytes(uuid) to authenticated;
grant execute on function public.moments_normalise_tag_label(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Storage bucket (private)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'moments-private',
  'moments-private',
  false,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = 8388608,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

-- Storage RLS: owner path prefix + pending media row
create policy "moments_storage_select_own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'moments-private'
    and public.moments_storage_owner_id(name) = auth.uid()
    and exists (
      select 1
      from public.moment_media mm
      where mm.storage_path = name
        and mm.owner_parent_id = auth.uid()
        and mm.deleted_at is null
        and mm.processing_status in ('pending', 'ready')
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
      where mm.storage_path = name
        and mm.owner_parent_id = auth.uid()
        and mm.deleted_at is null
        and mm.processing_status = 'pending'
    )
  );

create policy "moments_storage_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'moments-private'
    and public.moments_storage_owner_id(name) = auth.uid()
  )
  with check (
    bucket_id = 'moments-private'
    and public.moments_storage_owner_id(name) = auth.uid()
  );

create policy "moments_storage_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'moments-private'
    and public.moments_storage_owner_id(name) = auth.uid()
    and exists (
      select 1
      from public.moment_media mm
      where (mm.storage_path = name or mm.thumbnail_path = name)
        and mm.owner_parent_id = auth.uid()
    )
  );
