-- =============================================================================
-- Glow Moments — RLS verification (Sprint 9.1)
-- Run in Supabase SQL editor after migration 0015.
-- =============================================================================

-- 1. Policies exist
select schemaname, tablename, policyname, cmd
from pg_policies
where tablename in (
  'moments',
  'moment_children',
  'moment_media',
  'moment_tags',
  'moment_tag_links'
)
order by tablename, policyname;

-- 2. Storage policies
select policyname, cmd
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
  and policyname like 'moments_storage_%'
order by policyname;

-- 3. Bucket is private
select id, public, file_size_limit, allowed_mime_types
from storage.buckets
where id = 'moments-private';

-- 4. System tags seeded
select count(*) as system_tag_count
from public.moment_tags
where is_system = true
  and deleted_at is null;

-- Expected: 12 system tags

-- 5. Sprint 9.1 private-only constraint
select conname
from pg_constraint
where conrelid = 'public.moments'::regclass
  and conname = 'moments_sprint91_private_only';
