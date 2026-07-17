-- =============================================================================
-- Glow Moments — retry failed / stale processing (Sprint 9.2A)
-- Run in Supabase SQL editor as service role / postgres.
-- =============================================================================

-- 1. Failed media eligible for parent retry (UI calls retry_moment_media_processing)
select
  mm.id,
  mm.owner_parent_id,
  mm.processing_error_code,
  mm.processing_completed_at
from public.moment_media mm
where mm.deleted_at is null
  and mm.processing_status = 'failed'
order by mm.processing_completed_at desc nulls last;

-- 2. Stale processing claims (> 10 minutes) — safe to reclaim
select
  mm.id,
  mm.owner_parent_id,
  mm.processing_started_at,
  mm.original_path
from public.moment_media mm
where mm.deleted_at is null
  and mm.processing_status = 'processing'
  and mm.processing_started_at < timezone('utc', now()) - interval '10 minutes'
order by mm.processing_started_at asc;

-- 3. Ready rows needing original cleanup (deletion failed after processing)
select
  mm.id,
  mm.owner_parent_id,
  mm.original_path,
  mm.original_cleanup_required
from public.moment_media mm
where mm.deleted_at is null
  and mm.processing_status = 'ready'
  and mm.original_cleanup_required = true;

-- Optional: reset stale processing → pending for automated retry
-- update public.moment_media
-- set
--   processing_status = 'pending',
--   processing_started_at = null,
--   processing_error_code = null
-- where deleted_at is null
--   and processing_status = 'processing'
--   and processing_started_at < timezone('utc', now()) - interval '10 minutes';

-- Optional: delete orphaned originals after manual review (service role storage API)
-- select original_path from public.moment_media
-- where processing_status = 'ready' and original_cleanup_required = true;
