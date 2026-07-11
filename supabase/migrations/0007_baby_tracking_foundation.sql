-- =============================================================================
-- Glow -- Sprint 5.2: Baby tracking foundation
-- Extends baby_event_type for beta feeding variants.
-- Nappy wet/dirty/both lives in metadata.nappy_type (app-validated).
-- Soft-delete remains the supported delete path (deleted_at).
-- =============================================================================

-- Feeding variants beyond breastfeed / bottle_feed / pump
alter type public.baby_event_type add value if not exists 'formula';
alter type public.baby_event_type add value if not exists 'expressed_milk';
alter type public.baby_event_type add value if not exists 'solids';

comment on column public.baby_events.metadata is
  'Flexible private payload. Nappy entries: {"nappy_type":"wet"|"dirty"|"both"}. '
  'Other-feed notes: {"tracking":"feeding_other"}. Never logged to analytics.';

comment on table public.baby_events is
  'Family-scoped care events (feeding, sleep, nappy, etc.). Soft-delete via deleted_at. '
  'Visible only to family members through RLS.';

-- Prefer soft-delete: keep hard DELETE for staff/cleanup but document soft-delete as app path.
-- Tighten UPDATE so identity columns cannot be reassigned outside the family baby.

drop policy if exists "baby_events_update_family" on public.baby_events;

create policy "baby_events_update_family"
  on public.baby_events for update
  to authenticated
  using (
    deleted_at is null
    and public.is_family_member(family_id)
  )
  with check (
    public.is_family_member(family_id)
    and public.family_owns_baby(baby_id)
  );

-- Soft-delete is an UPDATE; hard DELETE remains family-scoped for completeness.
drop policy if exists "baby_events_delete_family" on public.baby_events;

create policy "baby_events_delete_family"
  on public.baby_events for delete
  to authenticated
  using (public.is_family_member(family_id));
