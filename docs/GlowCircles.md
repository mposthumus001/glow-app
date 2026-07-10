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

## Assignment (Sprint 4.4)

Automatic matching after onboarding completes (and on `/circle` when still unassigned).

### Lifecycle

1. Parent completes onboarding → server persists profile + optional baby → `assign_parent_to_circle`.
2. If already in an active circle → return existing membership (idempotent).
3. Else evaluate `circle_rules` against parent state, feeding method, first-child flag, and baby age.
4. Join the best eligible **active** circle with capacity, or create a new **active** circle with a privacy-safe name.
5. `/circle` retries assignment once when no membership is found (backfill for pre-4.4 parents).

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

### Rule priority

Lower `circle_rules.priority` wins. Ties break on specificity → fuller circle → oldest circle → stable id.

### Capacity

Only `circles.status = 'active'`. Count `circle_members` where `status = 'active'` and `deleted_at IS NULL`. Skip full circles.

### Concurrency

Per-parent advisory transaction lock; row lock on selected circle before insert.

### Privacy

Generated circle names use state + age band only. Matching details are never shown to other members.

### Known limitations

* No manual circle picker in app.
* Realtime channel authorization still client-gated (see Sprint 4.3).
* Reactions, read receipts, unread counts, persistent prompts — not in this sprint.

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
