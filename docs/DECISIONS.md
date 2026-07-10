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
