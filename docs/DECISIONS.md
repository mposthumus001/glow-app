## 2026-07-11 — Glow Calm foundation (Sprint 5.3)

Decision:
Ship Calm beta with a static typed sound catalogue in `src/features/calm/catalogue.ts` and a singleton `CalmPlayerService` owned by the authenticated `AppShell`. Use one `HTMLAudioElement` for the session. Persist volume / favourite / recent / selected sound id in `localStorage`. Do not auto-resume audible playback after refresh. Do not persist sleep timers. Use Glow-generated placeholder WAVs clearly marked for replacement. Do not wire `media_library` or seed CDN URLs for playback yet.

Reason:
Delivers a useful private Calm experience without pretending a CMS/CDN exists, without fake controls, and without music-app patterns. Matches existing singleton-service ownership (Presence). Keeps Atlas untouched.

Player ownership:
`useCalmPlayerLifecycle()` in AppShell keeps the service alive across routes; `LogoutButton` calls `handleLogout()`.

Limitation:
Placeholder audio only; iOS Safari background/lock playback unreliable; no listener counts, downloads, or stories in this sprint.

---

## 2026-07-11 — Baby foundation & basic tracking (Sprint 5.2)

Decision:
Ship a deliberately small Baby beta on `/baby` using the existing `baby_events` table. Extend the event-type enum only for formula / expressed milk / solids. Store nappy wet/dirty/both in `metadata.nappy_type`. Prefer completed sleep entries over a live timer. Resolve “today” in Australia/Sydney. Support edit + soft-delete with confirmation. Show a calm multi-baby selector when the family has more than one baby.

Reason:
Delivers useful private tracking for beta without medical advice, charts, notifications, or gamification. Reusing `baby_events` avoids parallel tables and keeps family RLS intact.

Timezone:
Australia/Sydney calendar day for summary counts; sleep duration clipped to day overlap.

Delete behaviour:
App soft-deletes (`deleted_at`); SELECT policies already hide soft-deleted rows. Hard DELETE remains RLS-permitted but unused by the client.

Limitation:
No dedicated baby profile editor yet (link to You). No realtime subscription on baby events — reconcile with a one-shot reload after mutation. Growth charts deferred.

---

## 2026-07-11 — Permanent app shell (Sprint 5.1)

Decision:
Introduce a single authenticated route group `(app)` with `AppShell` owning mobile bottom nav, desktop side nav, safe areas, presence lifecycle, and global reconnect UI. Keep Atlas cluster realtime on Tonight and Circle messaging on `/circle` only. Primary destinations are Tonight, Circle, Baby, Calm, and You (Profile) — five maximum. Baby and Calm ship as intentional placeholders without fake data or audio.

Reason:
Gives Glow a stable consumer shell for private beta without a dashboard aesthetic, prevents duplicate realtime subscriptions across navigations, and keeps feature ownership clear.

Route map:
`/` Tonight · `/circle` · `/baby` · `/calm` · `/profile` · auth routes outside the shell.

Limitation:
Profile Atlas privacy is read-only until a dedicated settings sprint; Tonight still mixes some mock Circle preview copy.

---

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

---

## 2026-07-11 — Circle reactions & private read state (Sprint 4.5)

Decision:
Use existing `circle_message_reactions` with a migrated curated enum (`support`, `with_you`, `tiny_win`, `sending_care`). Extend the unified `circle:{id}` channel with reaction `postgres_changes`. Store private read state on `circle_members.last_read_message_id` with monotonic `advance_circle_read_state` RPC. Show aggregate reaction counts only — never reactor lists or per-message seen-by.

Reason:
Calm, supportive engagement without social pressure. Read state answers “where do I resume?” for the authenticated parent only.

Debounce:
Read writes debounced at 1500ms; require visible tab + observed/near-bottom messages.

Limitation:
Unread counts on nav are server-rendered on page load; live count updates inside Circle session only until next navigation.

---

## 2026-07-11 — Daily prompts & safety foundations (Sprint 4.6)

Decision:
Persist one daily prompt per circle per calendar date using a curated `prompt_library` and server-side `ensure_circle_daily_prompt`. Resolve “today” in **Australia/Sydney** and store `prompt_date` as a calendar `date`. Prompt responses reuse `circle_messages` with optional `prompt_id`. Safety MVP: constrained message reports (existing `reports` table + `reason_code`), durable per-user hide in `hidden_messages`, and crisis disclaimer copy. No automated moderation or admin UI.

Reason:
Calm, optional conversation starters without device-clock drift or AI runtime risk. Reports and hides stay private and scoped; hide survives refresh and realtime without new channels or full refetch.

Hide persistence:
Database table `hidden_messages` (not localStorage) for cross-device consistency.

Moderation boundary:
Store reports only; no punishment automation; moderator tooling deferred.

Limitation:
Report review is manual/off-platform for beta; Realtime channel authorization unchanged from 4.3.

---
