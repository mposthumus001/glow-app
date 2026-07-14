-- =============================================================================
-- Sprint 6.2 — Closed beta access (allowlist + Before User Created hook)
-- =============================================================================
-- Upgrades beta_testers for invite/active/revoked lifecycle.
-- Adds Auth hook function (enable manually in Supabase Dashboard).
-- Adds boolean RPC for app-side UX checks (never exposes allowlist rows).
-- Activation: handle_new_user marks invited → active after successful signup.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Status enum
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.beta_tester_status as enum ('invited', 'active', 'revoked');
exception
  when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Schema upgrades
-- ---------------------------------------------------------------------------
alter table public.beta_testers
  add column if not exists email_normalized text,
  add column if not exists status public.beta_tester_status,
  add column if not exists activated_at timestamptz,
  add column if not exists revoked_at timestamptz;

-- Backfill normalised email + status from legacy columns
update public.beta_testers
set
  email_normalized = lower(trim(email)),
  email = lower(trim(email)),
  status = case
    when status is not null then status
    when accepted_at is not null then 'active'::public.beta_tester_status
    else 'invited'::public.beta_tester_status
  end,
  activated_at = coalesce(activated_at, accepted_at)
where email_normalized is null or status is null;

alter table public.beta_testers
  alter column email_normalized set not null,
  alter column status set not null,
  alter column status set default 'invited'::public.beta_tester_status;

-- Unique allowlist key (case-insensitive via normalisation)
do $$ begin
  alter table public.beta_testers
    add constraint beta_testers_email_normalized_unique unique (email_normalized);
exception
  when duplicate_object then null;
end $$;

comment on column public.beta_testers.email_normalized is
  'Trimmed lowercase email — unique allowlist key.';
comment on column public.beta_testers.status is
  'invited = may sign up; active = account created; revoked = blocked from new signup.';
comment on column public.beta_testers.notes is
  'Internal staff note — never expose to clients.';

-- Keep email + email_normalized normalised on write
create or replace function public.beta_testers_normalize_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.email_normalized := lower(trim(new.email_normalized));
  if new.email_normalized is null or new.email_normalized = '' then
    new.email_normalized := lower(trim(new.email));
  end if;
  new.email := new.email_normalized;

  if new.status = 'revoked' and new.revoked_at is null then
    new.revoked_at := timezone('utc', now());
  end if;

  if new.status = 'active' and new.activated_at is null then
    new.activated_at := timezone('utc', now());
  end if;

  return new;
end;
$$;

drop trigger if exists beta_testers_normalize_email on public.beta_testers;
create trigger beta_testers_normalize_email
  before insert or update on public.beta_testers
  for each row
  execute function public.beta_testers_normalize_email();

-- ---------------------------------------------------------------------------
-- Email helpers (SECURITY DEFINER — no allowlist leakage)
-- ---------------------------------------------------------------------------
create or replace function public.normalize_beta_email(p_email text)
returns text
language sql
immutable
as $$
  select nullif(lower(trim(coalesce(p_email, ''))), '');
$$;

comment on function public.normalize_beta_email(text) is
  'Trim + lowercase email for beta allowlist comparison.';

create or replace function public.is_beta_email_allowed(p_email text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_email text := public.normalize_beta_email(p_email);
begin
  if v_email is null then
    return false;
  end if;

  return exists (
    select 1
    from public.beta_testers bt
    where bt.email_normalized = v_email
      and bt.status in ('invited', 'active')
  );
end;
$$;

comment on function public.is_beta_email_allowed(text) is
  'True when email is invited or active on the private-beta allowlist. Returns boolean only.';

revoke all on function public.normalize_beta_email(text) from public;
revoke all on function public.is_beta_email_allowed(text) from public;
grant execute on function public.normalize_beta_email(text) to anon, authenticated;
grant execute on function public.is_beta_email_allowed(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Before User Created Auth hook (enable in Dashboard → Authentication → Hooks)
-- ---------------------------------------------------------------------------
create or replace function public.hook_before_user_created_beta_allowlist(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := public.normalize_beta_email(event->'user'->>'email');
  v_status public.beta_tester_status;
begin
  if v_email is null then
    return jsonb_build_object(
      'error',
      jsonb_build_object(
        'message',
        'Glow is currently in a small private beta. This email is not on the tester list yet.',
        'http_code',
        403
      )
    );
  end if;

  select bt.status
    into v_status
  from public.beta_testers bt
  where bt.email_normalized = v_email
  limit 1;

  if v_status is null or v_status = 'revoked' then
    return jsonb_build_object(
      'error',
      jsonb_build_object(
        'message',
        'Glow is currently in a small private beta. This email is not on the tester list yet.',
        'http_code',
        403
      )
    );
  end if;

  -- invited or active → allow (idempotent re-signup path if Auth allows)
  return '{}'::jsonb;
end;
$$;

comment on function public.hook_before_user_created_beta_allowlist(jsonb) is
  'Supabase Auth before-user-created hook. Allow invited/active emails only. Enable in Dashboard.';

revoke all on function public.hook_before_user_created_beta_allowlist(jsonb) from public;
revoke all on function public.hook_before_user_created_beta_allowlist(jsonb) from anon, authenticated;
grant execute on function public.hook_before_user_created_beta_allowlist(jsonb) to supabase_auth_admin;

-- Auth admin needs table read for the hook (SECURITY DEFINER also covers this)
grant select on public.beta_testers to supabase_auth_admin;

-- ---------------------------------------------------------------------------
-- Activation after successful Auth user insert (idempotent)
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_family_id uuid := gen_random_uuid();
  v_display_name text;
  v_state public.au_state;
  v_email text := public.normalize_beta_email(new.email);
begin
  v_display_name := coalesce(
    new.raw_user_meta_data ->> 'display_name',
    'New parent'
  );
  v_state := coalesce(
    (new.raw_user_meta_data ->> 'state')::public.au_state,
    'VIC'
  );

  insert into public.families (id, created_by_parent_id, name)
  values (v_family_id, new.id, 'My family');

  insert into public.parents (
    id,
    family_id,
    display_name,
    state,
    role,
    map_visibility,
    subscription_status
  )
  values (
    new.id,
    v_family_id,
    v_display_name,
    v_state,
    'parent',
    'state_only',
    'none'
  );

  insert into public.preferences (parent_id)
  values (new.id);

  insert into public.subscriptions (parent_id)
  values (new.id);

  insert into public.presence (parent_id, state, map_visibility, app_state)
  values (new.id, v_state, 'state_only', 'offline');

  -- Mark allowlist row active when present (never invent rows)
  if v_email is not null then
    update public.beta_testers
    set
      status = 'active',
      activated_at = coalesce(activated_at, timezone('utc', now())),
      accepted_at = coalesce(accepted_at, timezone('utc', now())),
      parent_id = coalesce(parent_id, new.id)
    where email_normalized = v_email
      and status in ('invited', 'active');
  end if;

  return new;
end;
$$;

comment on function public.handle_new_user() is
  'On auth.users insert: creates family/parent/prefs/subscription/presence; activates beta_testers row.';

-- ---------------------------------------------------------------------------
-- RLS: allowlist is staff-only — no normal client listing or self-insert
-- ---------------------------------------------------------------------------
drop policy if exists "beta_testers_select_own_or_staff" on public.beta_testers;
drop policy if exists "beta_testers_write_staff" on public.beta_testers;
drop policy if exists "beta_testers_select_staff" on public.beta_testers;
drop policy if exists "beta_testers_write_staff_only" on public.beta_testers;

create policy "beta_testers_select_staff"
  on public.beta_testers for select
  to authenticated
  using (public.is_admin_or_support());

create policy "beta_testers_write_staff_only"
  on public.beta_testers for all
  to authenticated
  using (public.is_admin_or_support())
  with check (public.is_admin_or_support());

-- ---------------------------------------------------------------------------
-- Audit query helper comment (run as service role / SQL editor — emails only)
-- ---------------------------------------------------------------------------
comment on table public.beta_testers is
  'Private-beta email allowlist. Manage via SQL/service role. Auth hook must be enabled in Dashboard.';
