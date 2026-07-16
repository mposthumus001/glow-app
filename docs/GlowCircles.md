# Glow Circles

Automatically matched.

Small trusted groups.

Maximum 12 members.

Realtime messaging.

Daily prompts.

Supportive.

Safe.

Private.

---

## Assignment (Sprint 4.4 + production hardening)

Automatic matching after onboarding completes (and on `/circle` when still unassigned).

### Lifecycle

1. Parent completes onboarding → server persists profile + optional baby → `assignParentToBestCircle` → `assign_parent_to_circle` RPC.
2. If already in an active circle → return existing membership (idempotent; do not move).
3. Else evaluate `circle_rules` against parent state, feeding method, first-child flag, and baby age.
4. Join the best eligible **active** circle with capacity.
5. If none fit → return `no_match` (onboarding still succeeds). Parent sees a calm holding state.
6. `/circle` retries assignment once when no membership is found (backfill / later capacity).

**Production policy:** Glow never auto-creates Circles for unmatched parents and never places someone in an unsuitable Circle. Staff seed `circles` + `circle_rules`; admins resolve unmatched parents via SQL.

### Matching criteria

| Field | Source | Notes |
|-------|--------|-------|
| State | `parents.state` | No suburb / exact location |
| Feeding | `parents.feeding_method` | Rule null = wildcard |
| First child | `parents.first_child` | Rule null = wildcard |
| Baby age | earliest `babies` row | DOB preferred; due date fallback |

### Baby age (whole months)

* DOB set → floor months from DOB to today (min 0).
* Due date only, future → `0` (expecting).
* Due date only, past → floor months since due date.
* No dates → age unknown; age-banded rules do not match.

### Priority order

1. All required rule fields match (`circle_rule_matches_parent`).
2. Lowest `circle_rules.priority` (lower number = higher priority).
3. Highest rule specificity (count of non-null constraint groups; age min/max count as one).
4. Highest current active membership count below capacity (fill existing Circles).
5. Oldest `circles.created_at`, then stable `circles.id`.

### Capacity

Only `circles.status = 'active'`. Count `circle_members` where `status = 'active'` and `deleted_at IS NULL`. Skip full circles. After `FOR UPDATE` on the chosen circle row, re-count before insert so two concurrent assignments cannot take the same final seat.

### Concurrency & idempotency

* Per-parent `pg_advisory_xact_lock(hashtext('circle_assign:' || parent_id))`.
* `SELECT … FOR UPDATE OF circles` on the chosen circle; capacity re-check under the lock.
* Existing active membership returned unchanged.
* Unique `(circle_id, parent_id)`; inactive rows may be reactivated via `ON CONFLICT` when rejoining the same circle — never creates a second active membership for the parent.

### no_match behaviour

RPC returns:

```json
{
  "outcome": "no_match",
  "reason": "no_eligible_active_circle",
  "parent_id": "…",
  "parent_state": "NSW",
  "feeding_method": "…",
  "first_child": true,
  "baby_age_months": 5
}
```

Parents see: **“We're finding the right Circle for you.”**  
Admins: run `supabase/ops/circle-assignment-admin-check.sql` (unmatched onboarded parents + capacity). Postgres also `RAISE LOG`s `circle_assignment_no_match`.

### Privacy

Matching details are never shown to other members. Circle names remain staff-defined (no auto-generated names in production assignment).

### Known limitations

* No manual circle picker in app.
* Staff must ensure seeded Circles + rules cover beta cohorts.
* Realtime channel authorization still client-gated (see Sprint 4.3).
* Moderator dashboard and automated enforcement deferred.

---

## Daily prompts (Sprint 4.6)

### Data model

* `prompt_library` — curated global templates (no runtime AI).
* `circle_prompts` — one row per circle per calendar `prompt_date` (unique constraint).
* `circle_messages.prompt_id` — optional FK when a message responds to the prompt.

### Selection strategy

Server-side `ensure_circle_daily_prompt(circle_id)` (SECURITY DEFINER):

1. Resolve **today** as a calendar date in **`Australia/Sydney`** (DST-aware via Postgres `timezone()`).
2. Return existing active row for `(circle_id, prompt_date)` if present.
3. Else pick library index: `abs(hashtext(circle_id || prompt_date)) % active_library_count`.
4. Insert idempotently; concurrent calls safe via unique constraint.

Prompt text is stable for the same circle + date across devices. No streaks, completion counters, or participation metrics.

### Timezone

* Store `prompt_date` as `date` (calendar day, not UTC instant).
* “Today” resolved server-side in **Australia/Sydney** including daylight saving.
* Clients do not independently decide the prompt day.

### Safety guidelines (prompt library)

Prompts must be emotionally appropriate, optional, and must not request sensitive medical, legal, financial, location, trauma, or identifying information.

### UI

* `CirclePromptCard` — warm, optional, single CTA “Share something”.
* Focuses composer and sets `sendPromptId` for the next send only.
* Restrained “prompt” label on messages with `prompt_id`.
* Graceful fallback when no prompt is available.

---

## Safety foundations (Sprint 4.6)

### Message reports

* Reuses `reports` table with constrained `reason_code` enum: `harmful`, `harassment`, `misinformation`, `privacy`, `spam`, `other`.
* One report per reporter per message (unique index).
* Only active circle members may report messages in their circle (RLS).
* Reporters see only their own reports; no public report indicators.
* Optional note max **500** characters.
* Confirmation copy: *“Thanks for letting us know. We'll keep this report on record for review.”*
* No automated punishment in beta.

### Local hide

* `hidden_messages(parent_id, message_id)` — durable per-user preference, synced across devices.
* Hidden only for the viewer; other members unaffected; no global suppression.
* Client filters hidden IDs after load and after realtime merges — no full refetch.

### Crisis disclaimer

* Peer support only — not emergency, medical, or crisis care.
* Australian wording: call **000** for immediate danger; **Lifeline 13 11 14** for mental health support.
* Shown in report dialog footer and collapsible **Safety & support** on Circle header.

### Moderation boundary (deferred)

* Reports stored privately for future moderator tooling.
* No admin dashboard, no automated enforcement, no user-visible report counts.
* Escalation policy and audit tooling are future work.

---

## Reactions & read state (Sprint 4.5)

### Allowed reaction types

| Type | Emoji | Label |
|------|-------|-------|
| `support` | 💜 | Support |
| `with_you` | 🌙 | With you |
| `tiny_win` | ✨ | Tiny win |
| `sending_care` | 🤍 | Sending care |

No arbitrary emoji picker. Aggregate counts only — never who reacted.

### Reactions

* Persisted in `circle_message_reactions` (unique per message + parent + type).
* Realtime via existing `circle:{circleId}` channel (`postgres_changes` INSERT/DELETE).
* Optimistic toggle with rollback on failure; dedupe by reaction row id.

### Read state (private)

* One marker per parent per circle: `circle_members.last_read_message_id` (+ `last_read_at`).
* Message-id primary for deterministic tie-breaks; timestamp fallback when marker message missing.
* Never exposes who read what or when to other members.

### Unread derivation

Count confirmed messages strictly after the read marker (`created_at`, then `id`).

### Marking read

Only when tab is visible **and** (near newest messages **or** newest unread message observed). Debounced **1500ms** (`READ_STATE_DEBOUNCE_MS`). Page load alone does not mark read.

### First unread

On open, scroll to first unread with a calm “New since you were here” divider; fully-read circles scroll to latest.

### Multi-device

`advance_circle_read_state` RPC + realtime membership UPDATE merge markers monotonically forward only.

### Nav hint

Calm text on Circles tab (e.g. “2 new”) — no red badges or urgency language.

---

## Messaging (Sprint 4.2)

- Messages live in `circle_messages` and are scoped by RLS to active circle members.
- Client messaging is owned by `CircleMessagingService` (not presentation components).
- Ordering: `created_at` ascending, with `id` as a stable tie-break.
- Sends are optimistic, then reconciled to the server row; realtime inserts are deduped by id.
- Pagination uses an explicit “Earlier messages” control (no infinite scroll).
- Composer draft state is isolated so typing does not rerender the feed.
- Display names only — never email, exact location, or private profile fields.

---

## Presence & typing (Sprint 4.3)

### Channel ownership

One channel per active circle: `circle:{circleId}`.

Owned by `CircleMessagingService`:

- `postgres_changes` inserts on `circle_messages`
- Realtime Presence sync/join/leave
- typing Broadcast (`event: typing`)
- reconnect + cleanup

### Presence payload

Ephemeral only (not written to the database):

```
{ parentId, displayName } // first name / short display name
```

Presence key = `parentId` so multiple tabs count as one parent.

### Typing payload

Ephemeral Broadcast (not persisted):

```
{ parentId, displayName, typing, at }
```

### Timing

- Publish typing after **300ms** of input (`TYPING_PUBLISH_DELAY_MS`)
- Refresh while typing every **2000ms** (`TYPING_REFRESH_MS`)
- Expire peer typing after **3000ms** without refresh (`TYPING_EXPIRE_MS`)

### Unique-parent counting

UI counts unique `parentId` values, not raw socket sessions.

### Privacy

- No online member directory
- At most a tiny name preview (“Mia is here with you”) or count-only phrases
- Viewer never sees themselves as typing
- No location, email, or device metadata in payloads

### Reconnect

Messages stay visible; composer draft is local and preserved. Presence may show a quiet “Reconnecting…” line. Stale typing clears on disconnect; channel rejoins with backoff.

### Known limitation

Realtime Presence/Broadcast channels are not RLS-filtered the way `circle_messages` rows are. The client only joins after assignment is confirmed. Hard channel authorization would require Supabase Realtime Authorization (private channels) — not enabled in this sprint.
