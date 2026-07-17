-- =============================================================================
-- Glow Moments — Sprint 9.2A repair verification (after 0017 + 0018)
-- Run in Supabase SQL editor after both repair migrations commit.
-- Single read-only statement: detail rows + one __SUMMARY__ row at the end.
-- =============================================================================

with required_columns as (
  select unnest(array[
    'original_path',
    'processed_size_bytes',
    'thumbnail_size_bytes',
    'processing_error_code',
    'original_cleanup_required',
    'processing_started_at',
    'processing_completed_at'
  ]) as column_name
),
required_constraints as (
  select unnest(array[
    'moment_media_original_path_length',
    'moment_media_processing_error_code_length',
    'moment_media_processed_size_non_negative',
    'moment_media_thumbnail_size_non_negative'
  ]) as constraint_name
),
required_rpcs as (
  select unnest(array[
    'create_moment_media_upload_slot',
    'finalize_moment_media_upload',
    'claim_moment_media_processing',
    'complete_moment_media_processing',
    'fail_moment_media_processing',
    'retry_moment_media_processing',
    'moments_parent_media_bytes'
  ]) as function_name
),
required_storage_policies as (
  select unnest(array[
    'moments_storage_select_own',
    'moments_storage_insert_own',
    'moments_storage_update_own',
    'moments_storage_delete_own'
  ]) as policy_name
),
column_checks as (
  select
    'column_' || rc.column_name as check_name,
    exists (
      select 1
      from information_schema.columns c
      where c.table_schema = 'public'
        and c.table_name = 'moment_media'
        and c.column_name = rc.column_name
    ) as ok
  from required_columns rc
),
constraint_checks as (
  select
    'constraint_' || rc.constraint_name as check_name,
    exists (
      select 1
      from pg_constraint con
      where con.conrelid = 'public.moment_media'::regclass
        and con.conname = rc.constraint_name
    ) as ok
  from required_constraints rc
),
enum_checks as (
  select
    'enum_processing_status_value' as check_name,
    exists (
      select 1
      from pg_enum e
      join pg_type t on t.oid = e.enumtypid
      join pg_namespace n on n.oid = t.typnamespace
      where n.nspname = 'public'
        and t.typname = 'moment_processing_status'
        and e.enumlabel = 'processing'
    ) as ok
),
index_checks as (
  select
    'index_moment_media_processing_idx' as check_name,
    exists (
      select 1
      from pg_indexes
      where schemaname = 'public'
        and tablename = 'moment_media'
        and indexname = 'moment_media_processing_idx'
    ) as ok
),
helper_checks as (
  select
    'function_moments_media_paths' as check_name,
    exists (
      select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'moments_media_paths'
    ) as ok
),
rpc_checks as (
  select
    'rpc_' || fn.function_name as check_name,
    exists (
      select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = fn.function_name
    ) as ok
  from required_rpcs fn
),
bucket_checks as (
  select
    'bucket_moments_private_exists' as check_name,
    exists (
      select 1
      from storage.buckets b
      where b.id = 'moments-private'
    ) as ok
  union all
  select
    'bucket_moments_private_not_public',
    coalesce(
      (
        select not b.public
        from storage.buckets b
        where b.id = 'moments-private'
      ),
      false
    )
),
storage_policy_checks as (
  select
    'storage_policy_' || sp.policy_name as check_name,
    exists (
      select 1
      from pg_policies pol
      where pol.schemaname = 'storage'
        and pol.tablename = 'objects'
        and pol.policyname = sp.policy_name
    ) as ok
  from required_storage_policies sp
),
privilege_checks as (
  select
    'grant_authenticated_upload_slot' as check_name,
    has_function_privilege(
      'authenticated',
      to_regprocedure('public.create_moment_media_upload_slot(uuid, text, text, bigint, text)'),
      'EXECUTE'
    ) as ok
  union all
  select
    'grant_authenticated_finalize_upload',
    has_function_privilege(
      'authenticated',
      to_regprocedure('public.finalize_moment_media_upload(uuid, bigint, integer, integer, public.moment_processing_status)'),
      'EXECUTE'
    )
  union all
  select
    'grant_authenticated_claim_processing',
    has_function_privilege(
      'authenticated',
      to_regprocedure('public.claim_moment_media_processing(uuid)'),
      'EXECUTE'
    )
  union all
  select
    'grant_authenticated_retry_processing',
    has_function_privilege(
      'authenticated',
      to_regprocedure('public.retry_moment_media_processing(uuid)'),
      'EXECUTE'
    )
  union all
  select
    'deny_authenticated_complete_processing',
    not has_function_privilege(
      'authenticated',
      to_regprocedure('public.complete_moment_media_processing(uuid, integer, integer, bigint, bigint, boolean, text)'),
      'EXECUTE'
    )
  union all
  select
    'deny_authenticated_fail_processing',
    not has_function_privilege(
      'authenticated',
      to_regprocedure('public.fail_moment_media_processing(uuid, text)'),
      'EXECUTE'
    )
  union all
  select
    'deny_anon_complete_processing',
    not has_function_privilege(
      'anon',
      to_regprocedure('public.complete_moment_media_processing(uuid, integer, integer, bigint, bigint, boolean, text)'),
      'EXECUTE'
    )
  union all
  select
    'deny_anon_fail_processing',
    not has_function_privilege(
      'anon',
      to_regprocedure('public.fail_moment_media_processing(uuid, text)'),
      'EXECUTE'
    )
  union all
  select
    'grant_service_role_complete_processing',
    has_function_privilege(
      'service_role',
      to_regprocedure('public.complete_moment_media_processing(uuid, integer, integer, bigint, bigint, boolean, text)'),
      'EXECUTE'
    )
  union all
  select
    'grant_service_role_fail_processing',
    has_function_privilege(
      'service_role',
      to_regprocedure('public.fail_moment_media_processing(uuid, text)'),
      'EXECUTE'
    )
),
foundation_checks as (
  select
    'foundation_moments_table' as check_name,
    to_regclass('public.moments') is not null as ok
  union all
  select
    'foundation_moment_media_table',
    to_regclass('public.moment_media') is not null
  union all
  select
    'foundation_create_private_moment_rpc',
    exists (
      select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'create_private_moment'
    )
  union all
  select
    'foundation_private_only_constraint',
    exists (
      select 1
      from pg_constraint
      where conrelid = 'public.moments'::regclass
        and conname = 'moments_sprint91_private_only'
    )
),
all_checks as (
  select check_name, ok from column_checks
  union all select check_name, ok from constraint_checks
  union all select check_name, ok from enum_checks
  union all select check_name, ok from index_checks
  union all select check_name, ok from helper_checks
  union all select check_name, ok from rpc_checks
  union all select check_name, ok from bucket_checks
  union all select check_name, ok from storage_policy_checks
  union all select check_name, ok from privilege_checks
  union all select check_name, ok from foundation_checks
),
summary as (
  select
    count(*) filter (where ok) as passed,
    count(*) filter (where not ok) as failed,
    count(*) as total
  from all_checks
),
combined_results as (
  select
    ac.check_name,
    ac.ok,
    case when ac.ok then 'PASS' else 'FAIL' end as status,
    null::bigint as passed,
    null::bigint as failed,
    null::bigint as total,
    null::text as summary
  from all_checks ac

  union all

  select
    '__SUMMARY__' as check_name,
    (s.failed = 0) as ok,
    case when s.failed = 0 then 'ALL PASS' else 'CHECK FAILURES' end as status,
    s.passed,
    s.failed,
    s.total,
    case when s.failed = 0 then 'ALL PASS' else 'CHECK FAILURES' end as summary
  from summary s
)
select
  check_name,
  ok,
  status,
  passed,
  failed,
  total,
  summary
from combined_results
order by
  case when check_name = '__SUMMARY__' then 1 else 0 end,
  check_name;
