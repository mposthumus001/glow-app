-- =============================================================================
-- Shared Family invite pgcrypto fix verification (after 0022)
-- Run in Supabase SQL editor. Summary row should read ALL PASS.
-- =============================================================================

with checks as (
  select
    'helper_shared_family_generate_invite_token_raw'::text as check_name,
    exists (
      select 1 from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'shared_family_generate_invite_token_raw'
        and p.prosecdef = true
        and exists (
          select 1
          from unnest(coalesce(p.proconfig, array[]::text[])) cfg
          where cfg ilike 'search_path=%extensions%'
        )
    ) as ok,
    'token helper exists with extensions in search_path'::text as details

  union all

  select
    'hash_helper_extensions_search_path'::text,
    exists (
      select 1 from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'shared_family_hash_invite_token'
        and p.prosecdef = true
        and exists (
          select 1
          from unnest(coalesce(p.proconfig, array[]::text[])) cfg
          where cfg ilike 'search_path=%extensions%'
        )
    ),
    'hash helper uses extensions search_path'::text

  union all

  select
    'create_invite_rpc_extensions_search_path'::text,
    exists (
      select 1 from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'create_shared_family_invite'
        and exists (
          select 1
          from unnest(coalesce(p.proconfig, array[]::text[])) cfg
          where cfg ilike 'search_path=%extensions%'
        )
    ),
    'create_shared_family_invite search_path includes extensions'::text

  union all

  select
    'create_invite_uses_token_helper'::text,
    pg_get_functiondef(
      to_regprocedure('public.create_shared_family_invite(uuid, text)')
    ) ilike '%shared_family_generate_invite_token_raw()%',
    'RPC calls shared_family_generate_invite_token_raw() not inline gen_random_bytes'::text

  union all

  select
    'grant_authenticated_create_invite'::text,
    has_function_privilege(
      'authenticated',
      'public.create_shared_family_invite(uuid, text)',
      'EXECUTE'
    ),
    'authenticated EXECUTE create_shared_family_invite'::text
),
combined_results as (
  select
    check_name,
    ok,
    case when ok then 'PASS' else 'FAIL' end as status,
    details
  from checks
  union all
  select
    '__SUMMARY__'::text,
    (select count(*) = 0 from checks where not ok),
    case when (select count(*) from checks where not ok) = 0
      then 'ALL PASS' else 'CHECK FAILURES' end,
    format(
      '%s passed / %s failed of %s checks',
      (select count(*) from checks where ok),
      (select count(*) from checks where not ok),
      (select count(*) from checks)
    )
)
select *
from combined_results
order by case when check_name = '__SUMMARY__' then 1 else 0 end, check_name;
