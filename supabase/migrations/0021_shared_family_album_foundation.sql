-- =============================================================================
-- Sprint 9.3 — Shared Family Album foundation (explicit Moment sharing)
-- =============================================================================
-- Separate from signup public.families (household scope).
-- Existing private Moments stay private until shared_family_moments row exists.
-- Owner-only sharing in v1. No Family Album UI in this sprint.
-- Invite tokens: raw token returned once; only SHA-256 hash stored (7-day expiry).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.shared_family_status as enum (
  'active',
  'archived'
);

create type public.shared_family_member_role as enum (
  'owner',
  'member'
);

create type public.shared_family_member_status as enum (
  'active',
  'removed',
  'left'
);

create type public.shared_family_invite_status as enum (
  'pending',
  'accepted',
  'revoked',
  'expired'
);

-- ---------------------------------------------------------------------------
-- shared_families
-- ---------------------------------------------------------------------------
create table public.shared_families (
  id uuid primary key default gen_random_uuid(),
  owner_parent_id uuid not null references public.parents (id) on delete cascade,
  name text not null,
  status public.shared_family_status not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  archived_at timestamptz,

  constraint shared_families_name_length check (
    char_length(trim(name)) between 1 and 80
  ),
  constraint shared_families_archived_consistency check (
    (status = 'archived' and archived_at is not null)
    or (status = 'active' and archived_at is null)
  )
);

comment on table public.shared_families is
  'Invited sharing group for explicit Moment album sharing. Not signup households.';

create index shared_families_owner_active_idx
  on public.shared_families (owner_parent_id)
  where status = 'active';

create trigger shared_families_set_updated_at
  before update on public.shared_families
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- shared_family_members
-- ---------------------------------------------------------------------------
create table public.shared_family_members (
  id uuid primary key default gen_random_uuid(),
  shared_family_id uuid not null references public.shared_families (id) on delete cascade,
  parent_id uuid not null references public.parents (id) on delete cascade,
  role public.shared_family_member_role not null,
  status public.shared_family_member_status not null default 'active',
  joined_at timestamptz not null default timezone('utc', now()),
  removed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),

  constraint shared_family_members_removed_consistency check (
    (status in ('removed', 'left') and removed_at is not null)
    or (status = 'active' and removed_at is null)
  ),
  constraint shared_family_members_owner_role_active check (
    role <> 'owner' or status = 'active'
  )
);

comment on table public.shared_family_members is
  'Membership history for shared family groups. One active row per parent per group.';

create unique index shared_family_members_active_unique
  on public.shared_family_members (shared_family_id, parent_id)
  where status = 'active';

create index shared_family_members_parent_active_idx
  on public.shared_family_members (parent_id)
  where status = 'active';

create trigger shared_family_members_set_updated_at
  before update on public.shared_family_members
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- shared_family_invites
-- ---------------------------------------------------------------------------
create table public.shared_family_invites (
  id uuid primary key default gen_random_uuid(),
  shared_family_id uuid not null references public.shared_families (id) on delete cascade,
  invited_email_normalized text not null,
  invited_by_parent_id uuid not null references public.parents (id) on delete cascade,
  invite_token_hash text not null,
  status public.shared_family_invite_status not null default 'pending',
  expires_at timestamptz not null,
  accepted_by_parent_id uuid references public.parents (id) on delete set null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),

  constraint shared_family_invites_email_length check (
    char_length(invited_email_normalized) between 3 and 320
  ),
  constraint shared_family_invites_token_hash_length check (
    char_length(invite_token_hash) = 64
  ),
  constraint shared_family_invites_expires_after_create check (
    expires_at > created_at
  ),
  constraint shared_family_invites_accepted_consistency check (
    (status = 'accepted' and accepted_at is not null and accepted_by_parent_id is not null)
    or (status <> 'accepted' and accepted_at is null and accepted_by_parent_id is null)
  ),
  constraint shared_family_invites_revoked_consistency check (
    (status = 'revoked' and revoked_at is not null)
    or (status <> 'revoked' and revoked_at is null)
  )
);

comment on table public.shared_family_invites is
  'Email invitations. Raw token never stored — SHA-256 hex hash only. Beta expiry: 7 days.';

create unique index shared_family_invites_pending_email_unique
  on public.shared_family_invites (shared_family_id, invited_email_normalized)
  where status = 'pending';

create unique index shared_family_invites_pending_token_hash_unique
  on public.shared_family_invites (invite_token_hash)
  where status = 'pending';

create index shared_family_invites_family_status_idx
  on public.shared_family_invites (shared_family_id, status);

create trigger shared_family_invites_set_updated_at
  before update on public.shared_family_invites
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- shared_family_moments (explicit per-Moment sharing)
-- ---------------------------------------------------------------------------
create table public.shared_family_moments (
  id uuid primary key default gen_random_uuid(),
  shared_family_id uuid not null references public.shared_families (id) on delete cascade,
  moment_id uuid not null references public.moments (id) on delete cascade,
  shared_by_parent_id uuid not null references public.parents (id) on delete cascade,
  shared_at timestamptz not null default timezone('utc', now()),
  removed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),

  constraint shared_family_moments_removed_after_share check (
    removed_at is null or removed_at >= shared_at
  )
);

comment on table public.shared_family_moments is
  'Explicit share link. Moment visibility column stays private; access via this table only.';

create unique index shared_family_moments_active_unique
  on public.shared_family_moments (shared_family_id, moment_id)
  where removed_at is null;

create index shared_family_moments_moment_active_idx
  on public.shared_family_moments (moment_id)
  where removed_at is null;

create trigger shared_family_moments_set_updated_at
  before update on public.shared_family_moments
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.shared_family_normalise_email(p_email text)
returns text
language sql
immutable
as $$
  select lower(trim(p_email));
$$;

comment on function public.shared_family_normalise_email(text) is
  'Lowercase trim for invite matching.';

create or replace function public.shared_family_hash_invite_token(p_raw_token text)
returns text
language sql
immutable
as $$
  select encode(digest(trim(p_raw_token), 'sha256'), 'hex');
$$;

comment on function public.shared_family_hash_invite_token(text) is
  'SHA-256 hex digest for invite token lookup. Raw token never persisted.';

create or replace function public.shared_family_auth_email_normalized()
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
  select public.shared_family_normalise_email(u.email)
  from auth.users u
  where u.id = auth.uid();
$$;

revoke all on function public.shared_family_auth_email_normalized() from public;
grant execute on function public.shared_family_auth_email_normalized() to authenticated;

create or replace function public.shared_family_is_active_group(p_shared_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.shared_families sf
    where sf.id = p_shared_family_id
      and sf.status = 'active'
  );
$$;

create or replace function public.shared_family_is_active_member(
  p_shared_family_id uuid,
  p_parent_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.shared_family_members m
    join public.shared_families sf on sf.id = m.shared_family_id
    where m.shared_family_id = p_shared_family_id
      and m.parent_id = p_parent_id
      and m.status = 'active'
      and sf.status = 'active'
  );
$$;

create or replace function public.shared_family_is_active_owner(
  p_shared_family_id uuid,
  p_parent_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.shared_family_members m
    join public.shared_families sf on sf.id = m.shared_family_id
    where m.shared_family_id = p_shared_family_id
      and m.parent_id = p_parent_id
      and m.role = 'owner'
      and m.status = 'active'
      and sf.status = 'active'
  );
$$;

create or replace function public.shared_family_moment_is_shared(
  p_shared_family_id uuid,
  p_moment_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.shared_family_moments sfm
    join public.shared_families sf on sf.id = sfm.shared_family_id
    join public.moments m on m.id = sfm.moment_id
    where sfm.shared_family_id = p_shared_family_id
      and sfm.moment_id = p_moment_id
      and sfm.removed_at is null
      and sf.status = 'active'
      and m.deleted_at is null
  );
$$;

create or replace function public.shared_family_can_view_moment(
  p_moment_id uuid,
  p_parent_id uuid default auth.uid()
)
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
      and m.deleted_at is null
      and m.owner_parent_id = p_parent_id
  )
  or exists (
    select 1
    from public.shared_family_moments sfm
    join public.shared_families sf on sf.id = sfm.shared_family_id
    join public.shared_family_members mem
      on mem.shared_family_id = sfm.shared_family_id
    join public.moments m on m.id = sfm.moment_id
    where sfm.moment_id = p_moment_id
      and sfm.removed_at is null
      and sf.status = 'active'
      and mem.parent_id = p_parent_id
      and mem.status = 'active'
      and m.deleted_at is null
  );
$$;

create or replace function public.shared_family_can_access_moment_media(
  p_shared_family_id uuid,
  p_moment_id uuid,
  p_media_id uuid,
  p_parent_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.shared_family_moments sfm
    join public.shared_families sf on sf.id = sfm.shared_family_id
    join public.shared_family_members mem
      on mem.shared_family_id = sfm.shared_family_id
    join public.moments m on m.id = sfm.moment_id
    join public.moment_media mm on mm.moment_id = m.id
    where sfm.shared_family_id = p_shared_family_id
      and sfm.moment_id = p_moment_id
      and sfm.removed_at is null
      and sf.status = 'active'
      and mem.parent_id = p_parent_id
      and mem.status = 'active'
      and m.id = p_moment_id
      and m.deleted_at is null
      and mm.id = p_media_id
      and mm.deleted_at is null
      and mm.processing_status = 'ready'
  );
$$;

comment on function public.shared_family_can_access_moment_media(uuid, uuid, uuid, uuid) is
  'Server boundary check before issuing short-lived signed URLs. No broad Storage policy.';

-- ---------------------------------------------------------------------------
-- Membership guards
-- ---------------------------------------------------------------------------
create or replace function public.guard_shared_family_members_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') = 'service_role' then
    return new;
  end if;

  if new.shared_family_id is distinct from old.shared_family_id
     or new.parent_id is distinct from old.parent_id
     or new.role is distinct from old.role
     or new.joined_at is distinct from old.joined_at
  then
    raise exception 'Cannot change shared family membership identity'
      using errcode = '42501';
  end if;

  if auth.uid() is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  -- Owner manages other members (removed). Members may only leave themselves.
  if public.shared_family_is_active_owner(old.shared_family_id, auth.uid()) then
    if new.status = 'removed' and old.status = 'active' and old.parent_id <> auth.uid() then
      return new;
    end if;
    if new.status = old.status and new.removed_at is not distinct from old.removed_at then
      return new;
    end if;
  end if;

  if old.parent_id = auth.uid()
     and old.status = 'active'
     and new.status = 'left'
     and old.role = 'member'
  then
    return new;
  end if;

  raise exception 'Insufficient privileges to update membership'
    using errcode = '42501';
end;
$$;

create trigger shared_family_members_guard_update
  before update on public.shared_family_members
  for each row execute function public.guard_shared_family_members_update();

create or replace function public.guard_shared_family_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_active_owners integer;
begin
  if tg_op = 'DELETE' then
    if old.role = 'owner' and old.status = 'active' then
      select count(*) into v_active_owners
      from public.shared_family_members m
      where m.shared_family_id = old.shared_family_id
        and m.role = 'owner'
        and m.status = 'active'
        and m.id <> old.id;
      if v_active_owners = 0 then
        raise exception 'Cannot remove the final owner'
          using errcode = '23514';
      end if;
    end if;
    return old;
  end if;

  if tg_op = 'UPDATE' then
    if old.role = 'owner'
       and old.status = 'active'
       and new.status <> 'active'
    then
      select count(*) into v_active_owners
      from public.shared_family_members m
      where m.shared_family_id = old.shared_family_id
        and m.role = 'owner'
        and m.status = 'active'
        and m.id <> old.id;
      if v_active_owners = 0 then
        raise exception 'Cannot remove the final owner'
          using errcode = '23514';
      end if;
    end if;
  end if;

  return new;
end;
$$;

create trigger shared_family_members_protect_owner
  before update or delete on public.shared_family_members
  for each row execute function public.guard_shared_family_owner_membership();

-- ---------------------------------------------------------------------------
-- RPC: create_shared_family
-- ---------------------------------------------------------------------------
create or replace function public.create_shared_family(p_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_parent_id uuid := auth.uid();
  v_name text := trim(p_name);
  v_family_id uuid;
  v_member_id uuid;
begin
  if v_parent_id is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if v_name is null or char_length(v_name) = 0 or char_length(v_name) > 80 then
    return jsonb_build_object('ok', false, 'error', 'invalid_name');
  end if;

  insert into public.shared_families (owner_parent_id, name)
  values (v_parent_id, v_name)
  returning id into v_family_id;

  insert into public.shared_family_members (
    shared_family_id,
    parent_id,
    role,
    status
  )
  values (
    v_family_id,
    v_parent_id,
    'owner',
    'active'
  )
  returning id into v_member_id;

  return jsonb_build_object(
    'ok', true,
    'shared_family_id', v_family_id,
    'member_id', v_member_id
  );
exception
  when others then
    return jsonb_build_object('ok', false, 'error', 'transaction_failed');
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: create_shared_family_invite
-- ---------------------------------------------------------------------------
create or replace function public.create_shared_family_invite(
  p_shared_family_id uuid,
  p_email text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_parent_id uuid := auth.uid();
  v_email text;
  v_raw_token text;
  v_token_hash text;
  v_invite_id uuid;
  v_expires_at timestamptz := timezone('utc', now()) + interval '7 days';
begin
  if v_parent_id is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if not public.shared_family_is_active_owner(p_shared_family_id, v_parent_id) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  v_email := public.shared_family_normalise_email(p_email);
  if v_email is null or char_length(v_email) < 3 or char_length(v_email) > 320 then
    return jsonb_build_object('ok', false, 'error', 'invalid_email');
  end if;

  if v_email = public.shared_family_auth_email_normalized() then
    return jsonb_build_object('ok', false, 'error', 'invalid_email');
  end if;

  if exists (
    select 1
    from public.shared_family_members m
    join auth.users u on u.id = m.parent_id
    where m.shared_family_id = p_shared_family_id
      and m.status = 'active'
      and public.shared_family_normalise_email(u.email) = v_email
  ) then
    return jsonb_build_object('ok', false, 'error', 'already_member');
  end if;

  v_raw_token := encode(gen_random_bytes(32), 'hex');
  v_token_hash := public.shared_family_hash_invite_token(v_raw_token);

  insert into public.shared_family_invites (
    shared_family_id,
    invited_email_normalized,
    invited_by_parent_id,
    invite_token_hash,
    expires_at
  )
  values (
    p_shared_family_id,
    v_email,
    v_parent_id,
    v_token_hash,
    v_expires_at
  )
  returning id into v_invite_id;

  return jsonb_build_object(
    'ok', true,
    'invite_id', v_invite_id,
    'invite_token', v_raw_token,
    'expires_at', v_expires_at
  );
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'error', 'invite_pending');
  when others then
    return jsonb_build_object('ok', false, 'error', 'transaction_failed');
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: accept_shared_family_invite (atomic, idempotent)
-- ---------------------------------------------------------------------------
create or replace function public.accept_shared_family_invite(p_raw_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_parent_id uuid := auth.uid();
  v_email text;
  v_token_hash text;
  v_invite public.shared_family_invites%rowtype;
  v_member_id uuid;
  v_now timestamptz := timezone('utc', now());
begin
  if v_parent_id is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if p_raw_token is null or char_length(trim(p_raw_token)) = 0 then
    return jsonb_build_object('ok', false, 'error', 'invalid_invite');
  end if;

  v_email := public.shared_family_auth_email_normalized();
  if v_email is null then
    return jsonb_build_object('ok', false, 'error', 'invalid_invite');
  end if;

  v_token_hash := public.shared_family_hash_invite_token(p_raw_token);

  select *
  into v_invite
  from public.shared_family_invites i
  where i.invite_token_hash = v_token_hash
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'invalid_invite');
  end if;

  if v_invite.status = 'accepted' then
    if v_invite.accepted_by_parent_id = v_parent_id then
      return jsonb_build_object(
        'ok', true,
        'shared_family_id', v_invite.shared_family_id,
        'status', 'accepted'
      );
    end if;
    return jsonb_build_object('ok', false, 'error', 'invalid_invite');
  end if;

  if v_invite.status <> 'pending' then
    return jsonb_build_object('ok', false, 'error', 'invalid_invite');
  end if;

  if v_invite.expires_at <= v_now then
    update public.shared_family_invites
    set status = 'expired'
    where id = v_invite.id;
    return jsonb_build_object('ok', false, 'error', 'invalid_invite');
  end if;

  if v_invite.invited_email_normalized <> v_email then
    return jsonb_build_object('ok', false, 'error', 'invalid_invite');
  end if;

  if not public.shared_family_is_active_group(v_invite.shared_family_id) then
    return jsonb_build_object('ok', false, 'error', 'invalid_invite');
  end if;

  select m.id
  into v_member_id
  from public.shared_family_members m
  where m.shared_family_id = v_invite.shared_family_id
    and m.parent_id = v_parent_id
    and m.status = 'active'
  limit 1;

  if v_member_id is null then
    insert into public.shared_family_members (
      shared_family_id,
      parent_id,
      role,
      status
    )
    values (
      v_invite.shared_family_id,
      v_parent_id,
      'member',
      'active'
    )
    returning id into v_member_id;
  end if;

  update public.shared_family_invites
  set
    status = 'accepted',
    accepted_by_parent_id = v_parent_id,
    accepted_at = v_now
  where id = v_invite.id;

  return jsonb_build_object(
    'ok', true,
    'shared_family_id', v_invite.shared_family_id,
    'member_id', v_member_id,
    'status', 'accepted'
  );
exception
  when others then
    return jsonb_build_object('ok', false, 'error', 'transaction_failed');
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: revoke_shared_family_invite
-- ---------------------------------------------------------------------------
create or replace function public.revoke_shared_family_invite(p_invite_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_parent_id uuid := auth.uid();
  v_now timestamptz := timezone('utc', now());
begin
  if v_parent_id is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  update public.shared_family_invites i
  set
    status = 'revoked',
    revoked_at = v_now
  from public.shared_families sf
  where i.id = p_invite_id
    and i.shared_family_id = sf.id
    and sf.owner_parent_id = v_parent_id
    and sf.status = 'active'
    and i.status = 'pending';

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  return jsonb_build_object('ok', true, 'invite_id', p_invite_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: remove_shared_family_member
-- ---------------------------------------------------------------------------
create or replace function public.remove_shared_family_member(p_member_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_parent_id uuid := auth.uid();
  v_now timestamptz := timezone('utc', now());
  v_row public.shared_family_members%rowtype;
begin
  if v_parent_id is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select m.*
  into v_row
  from public.shared_family_members m
  where m.id = p_member_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if not public.shared_family_is_active_owner(v_row.shared_family_id, v_parent_id) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  if v_row.parent_id = v_parent_id then
    return jsonb_build_object('ok', false, 'error', 'cannot_remove_self');
  end if;

  if v_row.status <> 'active' then
    return jsonb_build_object('ok', true, 'member_id', p_member_id, 'status', v_row.status);
  end if;

  update public.shared_family_members
  set
    status = 'removed',
    removed_at = v_now
  where id = p_member_id;

  return jsonb_build_object('ok', true, 'member_id', p_member_id, 'status', 'removed');
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: leave_shared_family
-- ---------------------------------------------------------------------------
create or replace function public.leave_shared_family(p_shared_family_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_parent_id uuid := auth.uid();
  v_now timestamptz := timezone('utc', now());
  v_role public.shared_family_member_role;
begin
  if v_parent_id is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select m.role
  into v_role
  from public.shared_family_members m
  where m.shared_family_id = p_shared_family_id
    and m.parent_id = v_parent_id
    and m.status = 'active'
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_role = 'owner' then
    return jsonb_build_object('ok', false, 'error', 'owner_must_archive');
  end if;

  update public.shared_family_members
  set
    status = 'left',
    removed_at = v_now
  where shared_family_id = p_shared_family_id
    and parent_id = v_parent_id
    and status = 'active';

  return jsonb_build_object('ok', true, 'shared_family_id', p_shared_family_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: share_private_moment / unshare_private_moment (owner-only v1)
-- ---------------------------------------------------------------------------
create or replace function public.share_private_moment(
  p_shared_family_id uuid,
  p_moment_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_parent_id uuid := auth.uid();
  v_share_id uuid;
begin
  if v_parent_id is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if not public.shared_family_is_active_owner(p_shared_family_id, v_parent_id) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  if not exists (
    select 1
    from public.moments m
    where m.id = p_moment_id
      and m.owner_parent_id = v_parent_id
      and m.deleted_at is null
  ) then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  select sfm.id
  into v_share_id
  from public.shared_family_moments sfm
  where sfm.shared_family_id = p_shared_family_id
    and sfm.moment_id = p_moment_id
    and sfm.removed_at is null
  limit 1;

  if v_share_id is not null then
    return jsonb_build_object(
      'ok', true,
      'share_id', v_share_id,
      'shared_family_id', p_shared_family_id,
      'moment_id', p_moment_id
    );
  end if;

  insert into public.shared_family_moments (
    shared_family_id,
    moment_id,
    shared_by_parent_id
  )
  values (
    p_shared_family_id,
    p_moment_id,
    v_parent_id
  )
  returning id into v_share_id;

  return jsonb_build_object(
    'ok', true,
    'share_id', v_share_id,
    'shared_family_id', p_shared_family_id,
    'moment_id', p_moment_id
  );
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'error', 'already_shared');
  when others then
    return jsonb_build_object('ok', false, 'error', 'transaction_failed');
end;
$$;

create or replace function public.unshare_private_moment(
  p_shared_family_id uuid,
  p_moment_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_parent_id uuid := auth.uid();
  v_now timestamptz := timezone('utc', now());
begin
  if v_parent_id is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if not public.shared_family_is_active_owner(p_shared_family_id, v_parent_id) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  update public.shared_family_moments sfm
  set removed_at = v_now
  where sfm.shared_family_id = p_shared_family_id
    and sfm.moment_id = p_moment_id
    and sfm.removed_at is null;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  return jsonb_build_object(
    'ok', true,
    'shared_family_id', p_shared_family_id,
    'moment_id', p_moment_id
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: archive_shared_family / rename_shared_family
-- ---------------------------------------------------------------------------
create or replace function public.archive_shared_family(p_shared_family_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_parent_id uuid := auth.uid();
  v_now timestamptz := timezone('utc', now());
begin
  if v_parent_id is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  update public.shared_families sf
  set
    status = 'archived',
    archived_at = v_now
  where sf.id = p_shared_family_id
    and sf.owner_parent_id = v_parent_id
    and sf.status = 'active';

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  return jsonb_build_object('ok', true, 'shared_family_id', p_shared_family_id);
end;
$$;

create or replace function public.rename_shared_family(
  p_shared_family_id uuid,
  p_name text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_parent_id uuid := auth.uid();
  v_name text := trim(p_name);
begin
  if v_parent_id is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if v_name is null or char_length(v_name) = 0 or char_length(v_name) > 80 then
    return jsonb_build_object('ok', false, 'error', 'invalid_name');
  end if;

  update public.shared_families sf
  set name = v_name
  where sf.id = p_shared_family_id
    and sf.owner_parent_id = v_parent_id
    and sf.status = 'active';

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  return jsonb_build_object('ok', true, 'shared_family_id', p_shared_family_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS — new tables
-- ---------------------------------------------------------------------------
alter table public.shared_families enable row level security;
alter table public.shared_family_members enable row level security;
alter table public.shared_family_invites enable row level security;
alter table public.shared_family_moments enable row level security;

create policy "shared_families_select_member"
  on public.shared_families for select
  to authenticated
  using (
    status = 'active'
    and public.shared_family_is_active_member(id, auth.uid())
  );

create policy "shared_families_insert_rpc_only"
  on public.shared_families for insert
  to authenticated
  with check (false);

create policy "shared_families_update_owner"
  on public.shared_families for update
  to authenticated
  using (
    owner_parent_id = auth.uid()
    and status = 'active'
  )
  with check (
    owner_parent_id = auth.uid()
  );

create policy "shared_family_members_select_member"
  on public.shared_family_members for select
  to authenticated
  using (
    public.shared_family_is_active_member(shared_family_id, auth.uid())
  );

create policy "shared_family_members_insert_service"
  on public.shared_family_members for insert
  to authenticated
  with check (false);

create policy "shared_family_members_update_scoped"
  on public.shared_family_members for update
  to authenticated
  using (
    public.shared_family_is_active_owner(shared_family_id, auth.uid())
    or (parent_id = auth.uid() and role = 'member' and status = 'active')
  )
  with check (
    shared_family_id = shared_family_id
    and parent_id = parent_id
    and role = role
  );

create policy "shared_family_invites_select_owner"
  on public.shared_family_invites for select
  to authenticated
  using (
    public.shared_family_is_active_owner(shared_family_id, auth.uid())
  );

create policy "shared_family_invites_insert_owner"
  on public.shared_family_invites for insert
  to authenticated
  with check (false);

create policy "shared_family_invites_update_owner"
  on public.shared_family_invites for update
  to authenticated
  using (
    public.shared_family_is_active_owner(shared_family_id, auth.uid())
  )
  with check (
    public.shared_family_is_active_owner(shared_family_id, auth.uid())
  );

create policy "shared_family_moments_select_member"
  on public.shared_family_moments for select
  to authenticated
  using (
    removed_at is null
    and public.shared_family_is_active_member(shared_family_id, auth.uid())
    and exists (
      select 1 from public.moments m
      where m.id = moment_id
        and m.deleted_at is null
    )
  );

create policy "shared_family_moments_insert_owner"
  on public.shared_family_moments for insert
  to authenticated
  with check (false);

create policy "shared_family_moments_update_owner"
  on public.shared_family_moments for update
  to authenticated
  using (
    removed_at is null
    and public.shared_family_is_active_owner(shared_family_id, auth.uid())
  )
  with check (
    public.shared_family_is_active_owner(shared_family_id, auth.uid())
  );

-- ---------------------------------------------------------------------------
-- RLS — shared read access for explicitly shared Moments (visibility stays private)
-- ---------------------------------------------------------------------------
create policy "moments_select_shared_family_member"
  on public.moments for select
  to authenticated
  using (
    deleted_at is null
    and public.shared_family_can_view_moment(id, auth.uid())
    and owner_parent_id <> auth.uid()
  );

create policy "moment_media_select_shared_family_member"
  on public.moment_media for select
  to authenticated
  using (
    deleted_at is null
    and processing_status = 'ready'
    and owner_parent_id <> auth.uid()
    and exists (
      select 1
      from public.shared_family_moments sfm
      join public.shared_family_members mem
        on mem.shared_family_id = sfm.shared_family_id
      join public.shared_families sf on sf.id = sfm.shared_family_id
      join public.moments m on m.id = sfm.moment_id
      where sfm.moment_id = moment_media.moment_id
        and sfm.removed_at is null
        and sf.status = 'active'
        and mem.parent_id = auth.uid()
        and mem.status = 'active'
        and m.deleted_at is null
    )
  );

create policy "moment_children_select_shared_family_member"
  on public.moment_children for select
  to authenticated
  using (
    exists (
      select 1
      from public.shared_family_moments sfm
      join public.shared_family_members mem
        on mem.shared_family_id = sfm.shared_family_id
      join public.shared_families sf on sf.id = sfm.shared_family_id
      join public.moments m on m.id = sfm.moment_id
      where sfm.moment_id = moment_children.moment_id
        and sfm.removed_at is null
        and sf.status = 'active'
        and mem.parent_id = auth.uid()
        and mem.status = 'active'
        and m.deleted_at is null
        and m.owner_parent_id <> auth.uid()
    )
  );

create policy "moment_tag_links_select_shared_family_member"
  on public.moment_tag_links for select
  to authenticated
  using (
    exists (
      select 1
      from public.shared_family_moments sfm
      join public.shared_family_members mem
        on mem.shared_family_id = sfm.shared_family_id
      join public.shared_families sf on sf.id = sfm.shared_family_id
      join public.moments m on m.id = sfm.moment_id
      where sfm.moment_id = moment_tag_links.moment_id
        and sfm.removed_at is null
        and sf.status = 'active'
        and mem.parent_id = auth.uid()
        and mem.status = 'active'
        and m.deleted_at is null
        and m.owner_parent_id <> auth.uid()
    )
  );

create policy "moment_tags_select_shared_family_member"
  on public.moment_tags for select
  to authenticated
  using (
    is_system = true
    or exists (
      select 1
      from public.moment_tag_links mtl
      join public.shared_family_moments sfm on sfm.moment_id = mtl.moment_id
      join public.shared_family_members mem
        on mem.shared_family_id = sfm.shared_family_id
      join public.shared_families sf on sf.id = sfm.shared_family_id
      join public.moments m on m.id = sfm.moment_id
      where mtl.tag_id = moment_tags.id
        and sfm.removed_at is null
        and sf.status = 'active'
        and mem.parent_id = auth.uid()
        and mem.status = 'active'
        and m.deleted_at is null
        and m.owner_parent_id <> auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Grants / revokes
-- ---------------------------------------------------------------------------
grant select on public.shared_families to authenticated;
grant select, update on public.shared_family_members to authenticated;
grant select, update on public.shared_family_invites to authenticated;
grant select, update on public.shared_family_moments to authenticated;

revoke all on function public.create_shared_family(text) from public;
revoke all on function public.create_shared_family(text) from anon;
grant execute on function public.create_shared_family(text) to authenticated;

revoke all on function public.create_shared_family_invite(uuid, text) from public;
revoke all on function public.create_shared_family_invite(uuid, text) from anon;
grant execute on function public.create_shared_family_invite(uuid, text) to authenticated;

revoke all on function public.accept_shared_family_invite(text) from public;
revoke all on function public.accept_shared_family_invite(text) from anon;
grant execute on function public.accept_shared_family_invite(text) to authenticated;

revoke all on function public.revoke_shared_family_invite(uuid) from public;
revoke all on function public.revoke_shared_family_invite(uuid) from anon;
grant execute on function public.revoke_shared_family_invite(uuid) to authenticated;

revoke all on function public.remove_shared_family_member(uuid) from public;
revoke all on function public.remove_shared_family_member(uuid) from anon;
grant execute on function public.remove_shared_family_member(uuid) to authenticated;

revoke all on function public.leave_shared_family(uuid) from public;
revoke all on function public.leave_shared_family(uuid) from anon;
grant execute on function public.leave_shared_family(uuid) to authenticated;

revoke all on function public.share_private_moment(uuid, uuid) from public;
revoke all on function public.share_private_moment(uuid, uuid) from anon;
grant execute on function public.share_private_moment(uuid, uuid) to authenticated;

revoke all on function public.unshare_private_moment(uuid, uuid) from public;
revoke all on function public.unshare_private_moment(uuid, uuid) from anon;
grant execute on function public.unshare_private_moment(uuid, uuid) to authenticated;

revoke all on function public.archive_shared_family(uuid) from public;
revoke all on function public.archive_shared_family(uuid) from anon;
grant execute on function public.archive_shared_family(uuid) to authenticated;

revoke all on function public.rename_shared_family(uuid, text) from public;
revoke all on function public.rename_shared_family(uuid, text) from anon;
grant execute on function public.rename_shared_family(uuid, text) to authenticated;

revoke all on function public.shared_family_can_access_moment_media(uuid, uuid, uuid, uuid) from public;
revoke all on function public.shared_family_can_access_moment_media(uuid, uuid, uuid, uuid) from anon;
grant execute on function public.shared_family_can_access_moment_media(uuid, uuid, uuid, uuid) to authenticated;

revoke all on function public.shared_family_is_active_group(uuid) from public;
revoke all on function public.shared_family_hash_invite_token(text) from public;
revoke all on function public.shared_family_normalise_email(text) from public;
revoke all on function public.shared_family_moment_is_shared(uuid, uuid) from public;

revoke all on function public.shared_family_is_active_member(uuid, uuid) from public;
revoke all on function public.shared_family_is_active_owner(uuid, uuid) from public;
revoke all on function public.shared_family_can_view_moment(uuid, uuid) from public;
grant execute on function public.shared_family_is_active_member(uuid, uuid) to authenticated;
grant execute on function public.shared_family_is_active_owner(uuid, uuid) to authenticated;
grant execute on function public.shared_family_can_view_moment(uuid, uuid) to authenticated;
