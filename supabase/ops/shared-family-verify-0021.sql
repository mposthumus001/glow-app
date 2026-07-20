-- =============================================================================
-- Shared Family Album — Sprint 9.3 foundation verification (after 0021)
-- Read-only / rollback-safe checks. Run in Supabase SQL editor after 0021.
-- Does NOT mutate production data.
-- =============================================================================

with
policy_defs as (
  select
    pol.polname as policy_name,
    rel.relname as table_name,
    case pol.polcmd
      when 'r' then 'SELECT'
      when 'a' then 'INSERT'
      when 'w' then 'UPDATE'
      when 'd' then 'DELETE'
      else pol.polcmd::text
    end as command,
    pg_get_expr(pol.polqual, pol.polrelid) as using_expr,
    pg_get_expr(pol.polwithcheck, pol.polrelid) as with_check_expr
  from pg_policy pol
  join pg_class rel on rel.oid = pol.polrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where nsp.nspname = 'public'
    and rel.relname in (
      'shared_families',
      'shared_family_members',
      'shared_family_invites',
      'shared_family_moments',
      'moments',
      'moment_media',
      'moment_children',
      'moment_tag_links',
      'moment_tags'
    )
),
checks as (
  -- 1. Tables exist
  select
    'table_' || t as check_name,
    to_regclass('public.' || t) is not null as ok,
    ('public.' || t || ' exists')::text as details
  from unnest(array[
    'shared_families',
    'shared_family_members',
    'shared_family_invites',
    'shared_family_moments'
  ]) as t

  union all

  -- 2. Enums exist
  select
    'enum_' || e as check_name,
    exists (
      select 1 from pg_type ty
      join pg_namespace n on n.oid = ty.typnamespace
      where n.nspname = 'public' and ty.typname = e
    ) as ok,
    ('enum public.' || e)::text as details
  from unnest(array[
    'shared_family_status',
    'shared_family_member_role',
    'shared_family_member_status',
    'shared_family_invite_status'
  ]) as e

  union all

  -- 3. RLS enabled on new tables
  select
    'rls_enabled_' || c.relname as check_name,
    c.relrowsecurity as ok,
    (c.relname || ' RLS enabled')::text as details
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname in (
      'shared_families',
      'shared_family_members',
      'shared_family_invites',
      'shared_family_moments'
    )

  union all

  -- 4. Core policies on shared-family tables
  select
    'policy_' || expected as check_name,
    exists (
      select 1 from pg_policies p
      where p.schemaname = 'public'
        and p.tablename = tbl
        and p.policyname = expected
    ) as ok,
    (tbl || '.' || expected)::text as details
  from (values
    ('shared_families', 'shared_families_select_member'),
    ('shared_families', 'shared_families_insert_rpc_only'),
    ('shared_families', 'shared_families_update_owner'),
    ('shared_family_members', 'shared_family_members_select_member'),
    ('shared_family_members', 'shared_family_members_insert_service'),
    ('shared_family_members', 'shared_family_members_update_scoped'),
    ('shared_family_invites', 'shared_family_invites_select_owner'),
    ('shared_family_invites', 'shared_family_invites_insert_owner'),
    ('shared_family_invites', 'shared_family_invites_update_owner'),
    ('shared_family_moments', 'shared_family_moments_select_member'),
    ('shared_family_moments', 'shared_family_moments_insert_owner'),
    ('shared_family_moments', 'shared_family_moments_update_owner')
  ) as expected_policies(tbl, expected)

  union all

  -- 5. Shared read policies on Moments graph
  select
    'policy_' || expected as check_name,
    exists (
      select 1 from pg_policies p
      where p.schemaname = 'public'
        and p.tablename = tbl
        and p.policyname = expected
    ) as ok,
    (tbl || '.' || expected)::text as details
  from (values
    ('moments', 'moments_select_shared_family_member'),
    ('moment_media', 'moment_media_select_shared_family_member'),
    ('moment_children', 'moment_children_select_shared_family_member'),
    ('moment_tag_links', 'moment_tag_links_select_shared_family_member'),
    ('moment_tags', 'moment_tags_select_shared_family_member')
  ) as shared_policies(tbl, expected)

  union all

  -- 6. INSERT blocked on sensitive tables (RPC-only paths)
  select
    'insert_blocked_' || table_name as check_name,
    exists (
      select 1 from policy_defs
      where table_name = pd.table_name
        and command = 'INSERT'
        and coalesce(with_check_expr, '') ilike '%false%'
    ) as ok,
    (table_name || ' INSERT with check (false)')::text as details
  from (values
    ('shared_families'),
    ('shared_family_members'),
    ('shared_family_invites'),
    ('shared_family_moments')
  ) as pd(table_name)

  union all

  -- 7. Shared moment SELECT excludes owner duplicate path
  select
    'shared_moment_select_excludes_owner'::text as check_name,
    exists (
      select 1 from policy_defs
      where table_name = 'moments'
        and policy_name = 'moments_select_shared_family_member'
        and using_expr ilike '%owner_parent_id <> auth.uid()%'
    ) as ok,
    'moments_select_shared_family_member excludes owner row'::text as details

  union all

  -- 8. RPCs exist
  select
    'rpc_' || fn as check_name,
    exists (
      select 1 from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = fn
    ) as ok,
    ('RPC ' || fn)::text as details
  from unnest(array[
    'create_shared_family',
    'create_shared_family_invite',
    'accept_shared_family_invite',
    'revoke_shared_family_invite',
    'remove_shared_family_member',
    'leave_shared_family',
    'share_private_moment',
    'unshare_private_moment',
    'archive_shared_family',
    'rename_shared_family',
    'shared_family_can_access_moment_media'
  ]) as fn

  union all

  -- 9. SECURITY DEFINER + search_path on user RPCs
  select
    'rpc_security_definer_' || fn as check_name,
    exists (
      select 1 from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = fn
        and p.prosecdef = true
        and exists (
          select 1
          from unnest(coalesce(p.proconfig, array[]::text[])) cfg
          where cfg ilike 'search_path=%'
        )
    ) as ok,
    (fn || ' is SECURITY DEFINER with explicit search_path')::text as details
  from unnest(array[
    'create_shared_family',
    'create_shared_family_invite',
    'accept_shared_family_invite',
    'share_private_moment',
    'accept_shared_family_invite'
  ]) as fn

  union all

  -- 10. anon cannot execute sensitive RPCs
  select
    'deny_anon_' || fn as check_name,
    not has_function_privilege(
      'anon',
      to_regprocedure(sig)
    , 'EXECUTE') as ok,
    ('anon denied ' || fn)::text as details
  from (values
    ('create_shared_family', 'public.create_shared_family(text)'),
    ('accept_shared_family_invite', 'public.accept_shared_family_invite(text)'),
    ('share_private_moment', 'public.share_private_moment(uuid, uuid)'),
    ('archive_shared_family', 'public.archive_shared_family(uuid)'),
    ('create_shared_family_invite', 'public.create_shared_family_invite(uuid, text)')
  ) as anon_checks(fn, sig)

  union all

  -- 11. authenticated can execute core RPCs
  select
    'grant_authenticated_create_shared_family'::text as check_name,
    has_function_privilege(
      'authenticated',
      'public.create_shared_family(text)',
      'EXECUTE'
    ) as ok,
    'authenticated EXECUTE create_shared_family'::text as details
  union all
  select
    'grant_authenticated_accept_invite'::text,
    has_function_privilege(
      'authenticated',
      'public.accept_shared_family_invite(text)',
      'EXECUTE'
    ),
    'authenticated EXECUTE accept_shared_family_invite'::text

  union all

  -- 12. Indexes and constraints
  select
    'index_shared_family_members_active_unique'::text as check_name,
    exists (
      select 1 from pg_indexes
      where schemaname = 'public'
        and tablename = 'shared_family_members'
        and indexname = 'shared_family_members_active_unique'
    ) as ok,
    'unique active membership per parent per group'::text as details
  union all
  select
    'index_shared_family_moments_active_unique'::text,
    exists (
      select 1 from pg_indexes
      where schemaname = 'public'
        and tablename = 'shared_family_moments'
        and indexname = 'shared_family_moments_active_unique'
    ),
    'unique active share per family and moment'::text
  union all
  select
    'constraint_invite_token_hash_length'::text,
    exists (
      select 1 from pg_constraint
      where conrelid = 'public.shared_family_invites'::regclass
        and conname = 'shared_family_invites_token_hash_length'
    ),
    'invite_token_hash must be 64 hex chars'::text
  union all
  select
    'no_raw_invite_token_column'::text,
    not exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'shared_family_invites'
        and column_name ilike '%token%'
        and column_name <> 'invite_token_hash'
    ),
    'only invite_token_hash column stores token material'::text

  union all

  -- 13. Membership guards
  select
    'guard_shared_family_members_update_exists'::text as check_name,
    exists (
      select 1 from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'guard_shared_family_members_update'
    ) as ok,
    'guard_shared_family_members_update function exists'::text as details
  union all
  select
    'guard_shared_family_owner_membership_exists'::text,
    exists (
      select 1 from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'guard_shared_family_owner_membership'
    ),
    'final owner protection trigger exists'::text

  union all

  -- 14. Foundation invariants
  select
    'public_families_table_unchanged'::text as check_name,
    to_regclass('public.families') is not null as ok,
    'public.families still present'::text as details
  union all
  select
    'moments_private_only_constraint_intact'::text,
    exists (
      select 1 from pg_constraint
      where conrelid = 'public.moments'::regclass
        and conname = 'moments_sprint91_private_only'
    ),
    'moments visibility remains private-only'::text
  union all
  select
    'zero_automatic_moment_shares'::text,
    not exists (select 1 from public.shared_family_moments),
    'no pre-existing shared_family_moments rows'::text
),
check_results as (
  select
    check_name,
    case when ok then 'PASS' else 'FAIL' end as status,
    details
  from checks
),
all_results as (
  select check_name, status, details, 0 as sort_order
  from check_results

  union all

  select
    '__SUMMARY__'::text as check_name,
    case
      when bool_and(status = 'PASS') then 'ALL PASS'
      else 'CHECK FAILURES'
    end as status,
    (
      count(*) filter (where status = 'PASS')::text
      || ' passed / '
      || count(*) filter (where status = 'FAIL')::text
      || ' failed'
    )::text as details,
    1 as sort_order
  from check_results
)
select check_name, status, details
from all_results
order by sort_order, check_name;
