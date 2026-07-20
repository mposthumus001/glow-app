-- =============================================================================
-- 0022 — Fix create_shared_family_invite pgcrypto visibility
-- =============================================================================
-- Production failure (Sprint 9.4B):
--   create_shared_family_invite returned { ok: false, error: 'transaction_failed' }
--   after owner/auth/email checks, before any shared_family_invites row was inserted.
--
-- Root cause:
--   Inline gen_random_bytes(32) inside create_shared_family_invite runs with
--   search_path = public, auth. On Supabase, pgcrypto lives in the extensions
--   schema, so gen_random_bytes is not found at runtime → exception →
--   transaction_failed → generic UI error.
--
-- Fix:
--   Token generation and hashing in helper functions with explicit
--   search_path = public, extensions (same pattern as digest binding at
--   function-create time for shared_family_hash_invite_token).
-- =============================================================================

create or replace function public.shared_family_generate_invite_token_raw()
returns text
language sql
volatile
security definer
set search_path = public, extensions
as $$
  select encode(gen_random_bytes(32), 'hex');
$$;

comment on function public.shared_family_generate_invite_token_raw() is
  '32-byte cryptographically secure invite token as 64-char hex. Not persisted.';

revoke all on function public.shared_family_generate_invite_token_raw() from public;
revoke all on function public.shared_family_generate_invite_token_raw() from anon;

create or replace function public.shared_family_hash_invite_token(p_raw_token text)
returns text
language sql
immutable
security definer
set search_path = public, extensions
as $$
  select encode(digest(trim(p_raw_token), 'sha256'), 'hex');
$$;

create or replace function public.create_shared_family_invite(
  p_shared_family_id uuid,
  p_email text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
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

  v_raw_token := public.shared_family_generate_invite_token_raw();
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

revoke all on function public.create_shared_family_invite(uuid, text) from public;
revoke all on function public.create_shared_family_invite(uuid, text) from anon;
grant execute on function public.create_shared_family_invite(uuid, text) to authenticated;
