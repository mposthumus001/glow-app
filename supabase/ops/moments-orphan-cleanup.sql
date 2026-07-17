-- =============================================================================
-- Glow Moments — orphan pending media cleanup (manual / scheduled)
-- Sprint 9.1: run periodically until automated job ships.
-- =============================================================================

-- Rows pending longer than 24 hours (no upload or processing never started)
select
  mm.id,
  mm.owner_parent_id,
  mm.original_path,
  mm.storage_path,
  mm.created_at
from public.moment_media mm
where mm.deleted_at is null
  and mm.processing_status = 'pending'
  and mm.created_at < timezone('utc', now()) - interval '24 hours'
order by mm.created_at asc;

-- Stale processing (> 10 minutes) — see moments-retry-processing.sql
select count(*) as stale_processing_count
from public.moment_media mm
where mm.deleted_at is null
  and mm.processing_status = 'processing'
  and mm.processing_started_at < timezone('utc', now()) - interval '10 minutes';

-- Optional: soft-delete stale pending rows (review before running)
-- update public.moment_media
-- set deleted_at = timezone('utc', now())
-- where deleted_at is null
--   and processing_status = 'pending'
--   and created_at < timezone('utc', now()) - interval '24 hours';

-- Optional: remove storage objects after soft-delete (service role / dashboard)
-- delete from storage.objects
-- where bucket_id = 'moments-private'
--   and name in (
--     select storage_path from public.moment_media
--     where deleted_at is not null
--   );
