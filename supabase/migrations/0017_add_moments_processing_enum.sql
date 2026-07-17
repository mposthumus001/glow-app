-- =============================================================================
-- Sprint 9.2A repair (step 1) — add processing enum value only
-- =============================================================================
-- PostgreSQL requires enum additions to commit before the new value is used.
-- Run this migration alone; apply 0018 in a separate transaction afterward.
-- Safe when the value already exists. Does not drop or recreate the enum.
-- =============================================================================

do $$
begin
  alter type public.moment_processing_status add value 'processing';
exception
  when duplicate_object then null;
end $$;
