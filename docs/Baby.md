# Glow Baby

## Beta scope (Sprint 5.2)

Private family baby space for authenticated parents:

* Baby profile summary (name, age/stage, DOB or due date, feeding method)
* Feeding logging
* Sleep logging (completed entries)
* Nappy logging
* Today summary (Australia/Sydney calendar day)
* Recent activity with finite “Earlier activity” pagination

## Out of scope (this sprint)

* Growth charts
* Medical advice or interpretation
* Predictions, reminders, notifications
* Background / live sleep timers
* AI recommendations
* Gamification, goals, or streaks
* Complex analytics

## Schema

Reuses `public.baby_events` (family-scoped).

| Concern | Storage |
|---------|---------|
| Feeding | `event_type` ∈ breastfeed, bottle_feed, formula, expressed_milk, solids, note(+metadata) |
| Sleep | `event_type = sleep`, `started_at` + `ended_at` required |
| Nappy | `event_type = nappy`, `metadata.nappy_type` ∈ wet \| dirty \| both |
| Notes | `notes` text, app cap 280 (DB ≤ 2000) |
| Delete | Soft-delete via `deleted_at` |

Migration `0007_baby_tracking_foundation.sql` adds enum values `formula`, `expressed_milk`, `solids` and tightens update `WITH CHECK` to require `family_owns_baby(baby_id)`.

## Feeding types (product → schema)

| UI | `event_type` | Notes |
|----|--------------|-------|
| Breast | `breastfeed` | Optional `side` |
| Bottle | `bottle_feed` | Optional `amount_ml` |
| Formula | `formula` | Optional `amount_ml` |
| Expressed milk | `expressed_milk` | Optional `amount_ml` |
| Solids | `solids` | |
| Other | `note` | `metadata.tracking = feeding_other` |

Adaptive form: amount only for bottle/formula/expressed; side only for breast.

## Sleep rules

* Completed entries only (start + end)
* End must be after start; duration &gt; 0 and ≤ 24 hours
* Duration derived client-side for display; not stored separately
* No live “still sleeping” timer in beta

## Nappy rules

* Types: wet, dirty, both
* No medical interpretation

## Today summary

* Calendar day resolved in **Australia/Sydney** (DST-aware)
* Feeds / nappies counted by `started_at` within day bounds
* Sleep duration clipped to overlap with the Australian day
* Copy is observational — no goals or competitive language

## Recent activity

* Newest first
* Page size 20
* Explicit “Earlier activity” button (no infinite scroll)
* Edit + soft-delete with confirmation

## Multiple babies

* Schema supports multiple babies per family
* Calm selector when more than one exists
* Selection remembered for the session after the parent chooses; full page reload returns to the earliest baby by `created_at`
* All logs scoped to the selected `baby_id`

## RLS

Existing family policies on `baby_events` / `babies`:

* SELECT / UPDATE / DELETE: `is_family_member(family_id)`
* INSERT: `parent_id = auth.uid()` + family member + `family_owns_baby(baby_id)`
* UPDATE WITH CHECK (Sprint 5.2): family member + `family_owns_baby(baby_id)`

Parents cannot read another family’s babies or events. Client uses the anon key only; `parent_id` is set from the authenticated session.

## Edit / delete

Implemented for beta:

* Family members may edit/soft-delete events for babies in their family
* Delete requires confirmation
* Soft-delete hides rows from SELECT (`deleted_at is null`)
* Hard DELETE remains available via RLS but the app uses soft-delete

## Known limitations

* Baby profile fields are edited via You / onboarding — no dedicated edit form yet
* No realtime subscription on baby events (local reconcile after mutation)
* Offline: standard Supabase client errors; reconnect uses existing shell banner for presence only
* Growth / charts deferred to a later Baby sprint

## Next sprint recommendation

* Calm audio foundations (Sprint 5.x), or
* Baby growth / milestones without medical advice, or
* Optional live sleep timer with a clear architecture
