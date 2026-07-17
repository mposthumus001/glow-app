-- =============================================================================
-- Glow Moments — quota audit per parent
-- Beta cap: 1 GB (1073741824 bytes)
-- =============================================================================

select
  mm.owner_parent_id,
  count(*) filter (where mm.processing_status in ('pending', 'ready')) as media_count,
  coalesce(sum(mm.size_bytes) filter (
    where mm.processing_status in ('pending', 'ready')
  ), 0) as used_bytes,
  round(
    coalesce(sum(mm.size_bytes) filter (
      where mm.processing_status in ('pending', 'ready')
    ), 0) / 1073741824.0 * 100,
    2
  ) as pct_of_quota
from public.moment_media mm
where mm.deleted_at is null
group by mm.owner_parent_id
having coalesce(sum(mm.size_bytes) filter (
  where mm.processing_status in ('pending', 'ready')
), 0) > 0
order by used_bytes desc;

-- Parents at or over quota
select *
from (
  select
    mm.owner_parent_id,
    coalesce(sum(mm.size_bytes), 0) as used_bytes
  from public.moment_media mm
  where mm.deleted_at is null
    and mm.processing_status in ('pending', 'ready')
  group by mm.owner_parent_id
) q
where used_bytes >= 1073741824;
