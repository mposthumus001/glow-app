-- =============================================================================
-- Sprint 3.5 — Presence Aggregation Engine
-- =============================================================================
-- Populates and maintains public.map_clusters from privacy-eligible presence.
-- Does not alter map_clusters table structure.
--
-- Privacy:
--   - online_status = true
--   - app_state IN ('active', 'background')
--   - map_visibility <> 'hidden'
--   - last_seen_at within 3 minutes
--   - suburb_area clusters only when count >= 5
--   - never store parent IDs on map_clusters
--   - coords only as AVG of coarse approximate_lat/lng (never exact GPS)
--
-- Realtime: map_clusters is already in supabase_realtime (0002). Re-add is
-- idempotent below for environments that skipped 0002.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- refresh_map_clusters()
-- Rebuilds country / state / suburb_area aggregates from eligible presence.
-- ---------------------------------------------------------------------------
create or replace function public.refresh_map_clusters()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := timezone('utc', now());
  v_stale_before timestamptz := v_now - interval '3 minutes';
begin
  -- Serialize refreshes within a transaction (beta-safe).
  perform pg_advisory_xact_lock(87201401);

  -- Guard: if somehow invoked while already refreshing in this txn, no-op.
  if current_setting('glow.refreshing_map_clusters', true) = 'on' then
    return;
  end if;
  perform set_config('glow.refreshing_map_clusters', 'on', true);

  with eligible as (
    select
      p.state,
      p.suburb_area,
      p.map_visibility,
      p.approximate_lat,
      p.approximate_lng
    from public.presence p
    where p.online_status = true
      and p.app_state in ('active', 'background')
      and p.map_visibility <> 'hidden'
      and p.last_seen_at >= v_stale_before
  ),
  next_rows as (
    -- Country
    select
      'country'::public.map_cluster_level as level,
      null::public.au_state as state,
      null::text as suburb_area,
      count(*)::integer as online_count,
      null::double precision as approximate_lat,
      null::double precision as approximate_lng
    from eligible
    having count(*) > 0

    union all

    -- State (includes state_only + suburb_area parents)
    select
      'state'::public.map_cluster_level,
      e.state,
      null::text,
      count(*)::integer,
      null::double precision,
      null::double precision
    from eligible e
    group by e.state
    having count(*) > 0

    union all

    -- Suburb-area (k-anonymity: >= 5). Coarse AVG coords only when present.
    select
      'suburb_area'::public.map_cluster_level,
      e.state,
      e.suburb_area,
      count(*)::integer,
      avg(e.approximate_lat) filter (
        where e.approximate_lat is not null and e.approximate_lng is not null
      ),
      avg(e.approximate_lng) filter (
        where e.approximate_lat is not null and e.approximate_lng is not null
      )
    from eligible e
    where e.map_visibility = 'suburb_area'
      and e.suburb_area is not null
    group by e.state, e.suburb_area
    having count(*) >= 5
  ),
  deleted as (
    delete from public.map_clusters mc
    where not exists (
      select 1
      from next_rows n
      where n.level = mc.level
        and (
          (mc.level = 'country')
          or (mc.level = 'state' and mc.state is not distinct from n.state)
          or (
            mc.level = 'suburb_area'
            and mc.state is not distinct from n.state
            and mc.suburb_area is not distinct from n.suburb_area
          )
        )
    )
    returning mc.id
  ),
  updated as (
    update public.map_clusters mc
    set
      online_count = n.online_count,
      approximate_lat = n.approximate_lat,
      approximate_lng = n.approximate_lng,
      updated_at = v_now
    from next_rows n
    where mc.level = n.level
      and (
        (mc.level = 'country')
        or (mc.level = 'state' and mc.state is not distinct from n.state)
        or (
          mc.level = 'suburb_area'
          and mc.state is not distinct from n.state
          and mc.suburb_area is not distinct from n.suburb_area
        )
      )
    returning mc.id
  )
  insert into public.map_clusters (
    level,
    state,
    suburb_area,
    online_count,
    approximate_lat,
    approximate_lng,
    updated_at
  )
  select
    n.level,
    n.state,
    n.suburb_area,
    n.online_count,
    n.approximate_lat,
    n.approximate_lng,
    v_now
  from next_rows n
  where not exists (
    select 1
    from public.map_clusters mc
    where mc.level = n.level
      and (
        (n.level = 'country')
        or (n.level = 'state' and mc.state is not distinct from n.state)
        or (
          n.level = 'suburb_area'
          and mc.state is not distinct from n.state
          and mc.suburb_area is not distinct from n.suburb_area
        )
      )
  );

  perform set_config('glow.refreshing_map_clusters', 'off', true);
end;
$$;

comment on function public.refresh_map_clusters() is
  'Rebuilds map_clusters from privacy-eligible presence (3-minute freshness, k>=5 suburbs).';

revoke all on function public.refresh_map_clusters() from public;
grant execute on function public.refresh_map_clusters() to service_role;

-- ---------------------------------------------------------------------------
-- Statement-level trigger on presence → refresh aggregates
-- Only touches map_clusters (no recursive presence writes).
-- ---------------------------------------------------------------------------
create or replace function public.trg_presence_refresh_map_clusters()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.refresh_map_clusters();
  return null;
end;
$$;

comment on function public.trg_presence_refresh_map_clusters() is
  'Statement-level hook: refresh map_clusters after presence changes.';

drop trigger if exists presence_refresh_map_clusters on public.presence;

create trigger presence_refresh_map_clusters
  after insert or update or delete on public.presence
  for each statement
  execute function public.trg_presence_refresh_map_clusters();

-- ---------------------------------------------------------------------------
-- Stale session expiry + refresh (for Supabase Cron / pg_cron later)
-- ---------------------------------------------------------------------------
create or replace function public.expire_stale_presence_and_refresh_clusters()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := timezone('utc', now());
  v_stale_before timestamptz := v_now - interval '3 minutes';
begin
  update public.presence p
  set
    online_status = false,
    app_state = 'offline',
    last_seen_at = v_now,
    approximate_lat = null,
    approximate_lng = null,
    updated_at = v_now
  where p.online_status = true
    and p.last_seen_at < v_stale_before;

  -- Statement trigger also refreshes; call explicitly so clusters update
  -- even when no rows were marked stale (last_seen aging without status change).
  perform public.refresh_map_clusters();
end;
$$;

comment on function public.expire_stale_presence_and_refresh_clusters() is
  'Marks presence offline when last_seen_at older than 3 minutes, then refreshes map_clusters. Schedule via pg_cron when enabled.';

revoke all on function public.expire_stale_presence_and_refresh_clusters() from public;
grant execute on function public.expire_stale_presence_and_refresh_clusters() to service_role;

-- ---------------------------------------------------------------------------
-- Realtime publication (idempotent; also in 0002)
-- ---------------------------------------------------------------------------
do $$
begin
  alter publication supabase_realtime add table public.map_clusters;
exception when duplicate_object then null;
end $$;

-- Initial build for existing presence rows
select public.refresh_map_clusters();

-- =============================================================================
-- Schedule later (pg_cron NOT assumed enabled). Run in SQL editor when ready:
--
--   create extension if not exists pg_cron with schema pg_catalog;
--
--   select cron.schedule(
--     'glow-expire-stale-presence',
--     '*/1 * * * *',
--     $$select public.expire_stale_presence_and_refresh_clusters()$$
--   );
--
-- Or via Supabase Dashboard → Integrations → Cron.
-- =============================================================================

-- =============================================================================
-- Verification queries (run manually after deploy)
-- =============================================================================
-- Eligible active presence:
--   select count(*) as eligible
--   from public.presence
--   where online_status = true
--     and app_state in ('active', 'background')
--     and map_visibility <> 'hidden'
--     and last_seen_at >= timezone('utc', now()) - interval '3 minutes';
--
-- Country cluster:
--   select * from public.map_clusters where level = 'country';
--
-- State clusters:
--   select state, online_count, updated_at
--   from public.map_clusters
--   where level = 'state'
--   order by state;
--
-- Suburb clusters (expect none with only 2 state-only VIC users):
--   select state, suburb_area, online_count, approximate_lat, approximate_lng
--   from public.map_clusters
--   where level = 'suburb_area'
--   order by state, suburb_area;
--
-- Public view (what Atlas reads):
--   select * from public.map_cluster_public order by level, state, suburb_area;
--
-- Stale presence test:
--   update public.presence
--   set last_seen_at = timezone('utc', now()) - interval '4 minutes'
--   where parent_id = '<test-parent-id>';
--   select public.expire_stale_presence_and_refresh_clusters();
--   select online_status, app_state, last_seen_at from public.presence
--   where parent_id = '<test-parent-id>';
--   select * from public.map_clusters where level = 'country';
-- =============================================================================
