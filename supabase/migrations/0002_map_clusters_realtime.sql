-- =============================================================================
-- Sprint 3.2 — Realtime for map cluster aggregates (Glow Atlas)
-- =============================================================================
-- Atlas reads counts from map_cluster_public; Realtime listens on the
-- underlying map_clusters table so hierarchy badges update live.

do $$
begin
  alter publication supabase_realtime add table public.map_clusters;
exception when duplicate_object then null;
end $$;
