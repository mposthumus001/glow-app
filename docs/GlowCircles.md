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

## Messaging (Sprint 4.2)

- Messages live in `circle_messages` and are scoped by RLS to active circle members.
- Client messaging is owned by `CircleMessagingService` (not presentation components).
- Ordering: `created_at` ascending, with `id` as a stable tie-break.
- Sends are optimistic, then reconciled to the server row; realtime inserts are deduped by id.
- Pagination uses an explicit “Earlier messages” control (no infinite scroll).
- Composer draft state is isolated so typing does not rerender the feed.
- Display names only — never email, exact location, or private profile fields.
