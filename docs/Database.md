# Glow Database

Version

2.0

## Main Tables

parents

families

babies

presence

map_clusters

circles

circle_members

circle_rules

circle_messages

baby_events

media_library

preferences

subscriptions

analytics_events

reports

moderation_actions

daily_activity

connections

circle_invites

---

All tables use RLS.

Supabase Auth is the source of identity.

Presence never stores exact GPS.

---

## Circle assignment (Sprint 4.4)

### RPC

`assign_parent_to_circle(p_parent_id uuid default auth.uid()) → jsonb`

* SECURITY DEFINER; callable by authenticated users for self only (staff may assign any parent).
* Returns `{ outcome, circle_id, membership_id }` where `outcome` is `existing`, `assigned`, or `created`.

### Helpers

* `parent_baby_age_months(parent_id)` — documented whole-month age rule.
* `circle_rule_matches_parent(...)` — wildcard/null rule fields.
* `circle_active_member_count(circle_id)` — active, non-deleted members only.

### RLS changes (migration 0004)

| Policy | Change |
|--------|--------|
| `circle_members_insert_self` | **Dropped** — parents cannot self-join |
| `circle_members_insert_staff` | **Added** — staff-only direct insert |
| `circles_insert_authenticated` | **Dropped** |
| `circles_insert_staff` | **Added** |

Read/update policies for members unchanged. Message isolation unchanged (`circle_messages` scoped to active membership).

### Backfill

Unassigned onboarded parents: sign in and visit `/circle` — one assignment attempt per page load (idempotent).

---

## Reactions & read state (Sprint 4.5)

### Tables

* `circle_message_reactions` — curated enum `reaction_type`
* `circle_members.last_read_message_id` — private read marker (added in 0005)

### RPC

`advance_circle_read_state(circle_id, message_id)` — monotonic read advance for `auth.uid()`.

### RLS

Reactions: existing policies from 0001 (members read/insert own delete). Read marker: `circle_members_update_self` (own row only).

---