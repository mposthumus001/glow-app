## 2026-07-10

Decision:
Glow Atlas will use a permanent Australia SVG with overlay layers rather than a mapping library.

Reason:
Provides complete design control, smoother animations, and a stable foundation for realtime presence.

---

## 2026-07-10 — Circle realtime messaging

Decision:
Glow Circles messaging uses a dedicated client `CircleMessagingService` with optimistic sends, postgres_changes filtered by `circle_id`, and pure merge/dedupe helpers. Presentation components never talk to Supabase directly. Pagination is explicit (“Earlier messages”), not infinite scroll.

Reason:
Keeps the calm product tone, makes reconciliation/deduplication testable, mirrors the Presence service isolation pattern, and relies on existing RLS without schema changes.

---

## 2026-07-11 — Circle presence & typing channel ownership

Decision:
Extend the existing circle messaging channel to `circle:{circleId}` as the single owner of message inserts, ephemeral Presence, and typing Broadcast. Count unique `parentId`s (not sockets). Keep typing ephemeral with 300ms publish delay, 2s refresh, 3s expiry. Do not persist circle presence or typing to Postgres.

Reason:
Avoids duplicate subscriptions, matches Atlas’s unique-parent presence pattern, and keeps the Circle experience calm and privacy-safe without schema/RLS changes.

Limitation:
Presence/Broadcast are not RLS-scoped; membership is enforced by only joining after assignment. Private Realtime Authorization remains a future hardening step.

---

## 2026-07-11 — Circle assignment engine (Sprint 4.4)

Decision:
Automatic Circle assignment runs only server-side via `public.assign_parent_to_circle` (SECURITY DEFINER). Matching reads `circle_rules`, respects active circle capacity, and prefers filling existing circles before creating new ones. New circles start as `active` so messaging works immediately. Parents cannot INSERT into `circle_members` or `circles` directly — only staff or the definer function.

Reason:
Deterministic, idempotent, concurrency-safe matching without trusting client-provided circle IDs. Keeps assignment logic auditable in Postgres with advisory + row locks.

Concurrency:
Per-parent `pg_advisory_xact_lock(hashtext('circle_assign:' || parent_id))` plus `SELECT … FOR UPDATE OF circles` on the chosen circle before capacity check and insert.

Idempotency:
Return existing active membership unchanged; unique `(circle_id, parent_id)` constraint; ON CONFLICT reactivation for stale rows.

Baby age:
Earliest baby row; DOB → floor whole months; else due date (0 if future, else months since due); NULL if no dates — age-specific rules require a computed age.

Selection order:
1. rule `priority` ASC (lower = higher priority)
2. rule specificity DESC (non-null fields)
3. active member count DESC
4. circle `created_at` ASC
5. circle `id` ASC

Limitations:
No exact suburb matching; no cross-state assignment; template-less parents get a state + age-band circle; Realtime channel auth unchanged from 4.3.
