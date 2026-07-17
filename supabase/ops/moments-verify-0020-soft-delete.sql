-- =============================================================================
-- Glow Moments — verify soft-delete RLS repair (migration 0020)
-- Read-only / rollback-safe checks. Run in Supabase SQL editor after 0020.
-- Does NOT mutate production Moments data.
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
    and rel.relname in ('moments', 'moment_media')
),
checks as (
  -- 1. RLS remains enabled
  select
    'rls_enabled_moments'::text as check_name,
    exists (
      select 1 from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = 'moments' and c.relrowsecurity
    ) as ok,
    'moments RLS enabled'::text as details
  union all
  select
    'rls_enabled_moment_media'::text,
    exists (
      select 1 from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = 'moment_media' and c.relrowsecurity
    ),
    'moment_media RLS enabled'::text
  union all

  -- 2. SELECT still hides soft-deleted media (privacy intact)
  select
    'select_hides_deleted_media'::text,
    exists (
      select 1 from policy_defs
      where table_name = 'moment_media'
        and policy_name = 'moment_media_select_own'
        and command = 'SELECT'
        and using_expr ilike '%deleted_at%null%'
    ),
    'moment_media_select_own still requires deleted_at is null'::text
  union all

  -- 3. Moments private visibility / owner SELECT intact
  select
    'select_moments_owner_private'::text,
    exists (
      select 1 from policy_defs
      where table_name = 'moments'
        and policy_name = 'moments_select_own'
        and command = 'SELECT'
        and using_expr ilike '%owner_parent_id%'
        and using_expr ilike '%deleted_at%null%'
    ),
    'moments_select_own owner + deleted_at is null'::text
  union all

  -- 4. UPDATE media remains owner-scoped; USING requires active row
  select
    'update_media_owner_using'::text,
    exists (
      select 1 from policy_defs
      where table_name = 'moment_media'
        and policy_name = 'moment_media_update_own'
        and command = 'UPDATE'
        and using_expr ilike '%owner_parent_id%'
        and using_expr ilike '%deleted_at%null%'
    ),
    'moment_media_update_own USING owner + active'::text
  union all

  -- 5. UPDATE WITH CHECK does not require deleted_at is null
  --    (soft-delete NEW row must be allowed by UPDATE policy itself)
  select
    'update_media_with_check_allows_soft_delete'::text,
    exists (
      select 1 from policy_defs
      where table_name = 'moment_media'
        and policy_name = 'moment_media_update_own'
        and command = 'UPDATE'
        and coalesce(with_check_expr, '') ilike '%owner_parent_id%'
        and coalesce(with_check_expr, '') not ilike '%deleted_at%is null%'
    ),
    'moment_media_update_own WITH CHECK owner only (no deleted_at is null)'::text
  union all

  -- 6. RPC exists, SECURITY DEFINER, row_security off
  select
    'rpc_security_definer_row_security_off'::text,
    exists (
      select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'soft_delete_private_moment'
        and p.prosecdef = true
        and exists (
          select 1
          from unnest(coalesce(p.proconfig, array[]::text[])) cfg
          where cfg ilike 'row_security=off'
        )
    ),
    'soft_delete_private_moment is SECURITY DEFINER with row_security=off'::text
  union all

  -- 7. Authenticated can execute; anon cannot
  select
    'rpc_grant_authenticated'::text,
    has_function_privilege(
      'authenticated',
      'public.soft_delete_private_moment(uuid,uuid)',
      'execute'
    ),
    'authenticated EXECUTE on soft_delete_private_moment'::text
  union all
  select
    'rpc_revoke_anon'::text,
    not has_function_privilege(
      'anon',
      'public.soft_delete_private_moment(uuid,uuid)',
      'execute'
    ),
    'anon cannot EXECUTE soft_delete_private_moment'::text
  union all

  -- 8. Media immutable-field guard present
  select
    'guard_moment_media_update_exists'::text,
    exists (
      select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'guard_moment_media_update'
    ),
    'guard_moment_media_update function exists'::text
  union all
  select
    'guard_moment_media_trigger'::text,
    exists (
      select 1
      from pg_trigger t
      join pg_class c on c.oid = t.tgrelid
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = 'moment_media'
        and t.tgname = 'moment_media_guard_update'
        and not t.tgisinternal
    ),
    'moment_media_guard_update trigger installed'::text
  union all

  -- 9. complete/fail remain service_role only
  select
    'complete_rpc_service_role_only'::text,
    has_function_privilege(
      'service_role',
      'public.complete_moment_media_processing(uuid,integer,integer,bigint,bigint,boolean,text)',
      'execute'
    )
    and not has_function_privilege(
      'authenticated',
      'public.complete_moment_media_processing(uuid,integer,integer,bigint,bigint,boolean,text)',
      'execute'
    )
    and not has_function_privilege(
      'anon',
      'public.complete_moment_media_processing(uuid,integer,integer,bigint,bigint,boolean,text)',
      'execute'
    ),
    'complete_moment_media_processing service_role only'::text
  union all
  select
    'fail_rpc_service_role_only'::text,
    has_function_privilege(
      'service_role',
      'public.fail_moment_media_processing(uuid,text)',
      'execute'
    )
    and not has_function_privilege(
      'authenticated',
      'public.fail_moment_media_processing(uuid,text)',
      'execute'
    ),
    'fail_moment_media_processing service_role only'::text
  union all

  -- 10. Documented blocking SELECT clause still present (explains why RPC needs bypass)
  select
    'documented_blocking_select_clause'::text,
    exists (
      select 1 from policy_defs
      where table_name = 'moment_media'
        and policy_name = 'moment_media_select_own'
        and using_expr ~* 'deleted_at\s+is\s+null'
    ),
    'Blocking clause retained on SELECT (RPC bypass is intentional)'::text
),
check_results as (
  select
    check_name,
    case when ok then 'PASS' else 'FAIL' end as status,
    details
  from checks
),
all_results as (
  select
    check_name,
    status,
    details,
    0 as sort_order
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
select
  check_name,
  status,
  details
from all_results
order by sort_order, check_name;
