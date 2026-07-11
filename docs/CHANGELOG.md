# Changelog

## Milestone 2 – Glow Atlas

### Added
- Australia SVG
- Hierarchical zoom
- Progressive disclosure
- Glass state badges
- Responsive overlays

### Changed
- Home screen redesigned
- Circle card updated
- Reminder card refined

### Fixed
- Badge scaling
- Label overlap
- Overlay clipping

## v0.3 – Realtime Presence

### Added
- Supabase Presence Engine
- Live Atlas updates
- Heartbeat service
- Visibility detection
- Automatic reconnect
- Live cluster support

### Changed
- Glow Atlas now supports realtime data
- Demo presence is now a fallback only

### Fixed
- React hook state management
- Presence hook lifecycle

## v0.3

### Added

Realtime Presence Engine

Presence aggregation

Country clusters

State clusters

Realtime Glow Atlas

Automatic heartbeat

Automatic reconnect

Privacy-safe aggregation

Supabase realtime pipeline

## Unreleased

### Added

* Sprint 5.4 Profile / Settings: parent & baby editing, Atlas privacy, Circle info, Calm prefs, account controls, feedback, deletion requests, and beta legal drafts.
* Migration `0008_profile_settings_trust.sql` (`account_deletion_requests`, `app_feedback`).
* Auth callback route for password recovery redirects.
* `docs/ProfileSettings.md`.
* Sprint 5.3 Glow Calm foundation: curated sound library, shared shell-owned player, sleep timer, favourite/recent, Calm home UI.
* Placeholder Calm WAV assets under `public/calm/placeholders/` (marked for replacement).
* Unit tests for Calm catalogue, player logic, and preference persistence.
* Sprint 5.2 Baby foundation: profile summary, feeding/sleep/nappy logging, today summary, recent activity.
* Migration `0007_baby_tracking_foundation.sql` — `formula`, `expressed_milk`, `solids` event types; tighter baby_events update check.
* `docs/Baby.md` documenting beta Baby scope, schema mapping, RLS, and timezone rules.
* Unit tests for Baby validation, Australia/Sydney day bounds, summary clipping, pagination, and auth contract.
* Sprint 5.1 permanent authenticated app shell with five-destination navigation.
* Routes for Baby and Calm foundations plus Profile / Settings.
* Shared `PageHeader`, shell loading skeleton, route error boundary, and quiet reconnect banner.
* Desktop side navigation and mobile bottom navigation with safe-area support.
* Unit tests for nav active-state resolution and baby age formatting.
* Sprint 4.6 persisted daily prompts, message reporting, per-user hide, and crisis disclaimer.
* Migration `0006_circle_prompts_safety.sql` (`circle_prompts`, `prompt_library`, `hidden_messages`, report reason enum).
* Sprint 4.5 curated Circle reactions with aggregate counts and optimistic toggle.
* Private read markers, unread counts, first-unread positioning, and calm nav hints.
* Migration `0005_reactions_read_state.sql` (reaction enum + read marker + RPC).
* Sprint 4.4 automatic Circle assignment engine via `assign_parent_to_circle` SECURITY DEFINER RPC.
* Rule-based matching (`circle_rules`), baby-age calculation, capacity checks, and deterministic tie-breaking.
* Onboarding hook and `/circle` backfill retry for previously unassigned parents.
* Unit tests for assignment matching logic.
* Sprint 4.3 circle presence and typing indicators on a unified `circle:{id}` channel.
* Ephemeral Realtime Presence with unique-parent online counts and calm copy.
* Debounced typing Broadcast with expiry, self-exclusion, and restrained live region.
* Unit tests for presence/typing helpers and circle scoping.
* Sprint 4.2 realtime Circle messaging: send, optimistic UI, live inserts, pagination, retry.
* CircleMessagingService with circle-scoped Supabase Realtime subscription and dedupe.
* Unit tests for message preparation, ordering, reconciliation, and subscription helpers.
* Your Circle foundation screen (`/circle`) for Milestone 4 / Sprint 4.1.
* Circle feature module with typed repository reads over existing Circle schema.
* Calm circle header, daily prompt card, message-area states, and active composer.
* Navigation into Your Circle from bottom nav and Home “Enter Circle”.
* Animated Glow Atlas headline presence count.
* Animated state presence badge transitions.
* Realtime connection status indicator.
* Empty-state and low-user-state messaging.
* Reduced-motion support for Atlas animations.

### Improved

* Circle header online count now uses live circle Presence instead of map_presence fallback.
* Quiet reconnect status without alarming full-screen errors.
* Circle composer is active with accessible keyboard send (Enter / Shift+Enter).
* Message feed distinguishes own messages calmly without a noisy chat-bubble layout.
* Refined Glow Atlas lighting, glow, and transition behaviour.
* Improved accessibility labels, focus behaviour, and motion preferences.
* Improved realtime visual updates to reduce flicker.
* Optimised Atlas rendering and animation performance.

### Technical

* Sprint 5.4: migration `0008` for deletion requests + feedback; server actions only; no service-role in browser; legal drafts labelled.
* Sprint 5.3: static catalogue (not `media_library`); `CalmPlayerService` singleton + AppShell lifecycle; localStorage prefs; no new audio npm deps.
* Sprint 5.2: reuses `baby_events` with soft-delete; no polling; finite activity pages (20); typed feature module `src/features/baby`.
* Sprint 5.1: `(app)` route group owns shell; PresenceService starts once in AppShell; Atlas/Circle realtime remain feature-scoped.
* Sprint 4.6: prompt assignment server-side only; hide/report insert-only (no new realtime channels); unit tests for prompt/safety logic.
* Sprint 4.5: reaction realtime on existing circle channel; read-state debounce 1500ms; unit tests for reaction/read logic.
* Sprint 4.4 migration `0004_circle_assignment.sql`: assignment RPC, baby-age helper, RLS tightening on `circle_members` and `circles` inserts.
* Completed Sprint 4.3 without database or schema changes; presence/typing are ephemeral only.
* Sprint 4.3 `npm run lint`, `npm run build`, and `npm run test` passed; still awaiting final manual verification, commit, push, and deployment.
* Completed Sprint 4.2 without database or schema changes; relies on existing circle_messages RLS.
* Sprint 4.2 `npm run lint`, `npm run build`, and `npm run test` passed; still awaiting final manual verification, commit, push, and deployment.
* Completed Sprint 4.1 without database or schema changes.
* Sprint 4.1 `npm run lint` and `npm run build` passed; still awaiting manual testing, commit, and deployment.
* Completed Sprint 3.6 without database or schema changes.
* Confirmed `npm run lint` passes.
