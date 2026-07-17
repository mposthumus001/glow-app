# Changelog

## Unreleased

### Sprint 9.2B — Baby Moments album UI

Private child-scoped Moments experience on the Baby page (no new nav item).

#### Added
- `MomentsPreviewCard` on `/baby` (below child summary, above Today)
- Routes: `/baby/[babyId]/moments`, `/new`, `/[momentId]`
- Album grid, create flow (photo picker → signed upload → processing), detail with favourite/delete
- Processing poll (`useMomentProcessingPoll`, 3s) and owner retry UI
- Server queries + actions: preview/album/detail fetch, soft-delete, favourite toggle
- Tests: `src/features/moments/momentsUi.test.ts`

#### Security / privacy
- Storage paths and signed upload URLs never rendered in markup
- Short-lived signed display/thumbnail URLs resolved server-side only
- Cross-child and cross-owner access returns 404 via `verifyMomentAccess`
- Feature flag remains `NEXT_PUBLIC_MOMENTS_ENABLED=false` until QA sign-off

### Sprint 9.2A — Secure Moments image processing

Trusted Node.js worker processes uploaded originals into privacy-safe WebP display + thumbnail.

#### Added
- Migration `0016_moments_image_processing.sql` — `processing` status, `original_path`, completion RPCs
- `sharp` pipeline: EXIF orientation, metadata strip, max 2048px display, 400px thumb
- `src/lib/supabase/admin.ts` — server-only service role client
- `POST /api/moments/process`, `requestMomentMediaProcessing`, `retryMomentMediaProcessing`, `getMomentMediaStatus`
- Typed outcomes for Sprint 9.2B UI (`src/features/moments/processing/outcomes.ts`)
- Ops: `supabase/ops/moments-retry-processing.sql`
- Tests: MIME sniff, sharp processing, paths, outcomes

#### Security
- Magic-byte MIME validation; decompression bomb pixel cap
- Only service role may mark `ready` via `complete_moment_media_processing`
- Original upload deleted after processing; `original_cleanup_required` on delete failure
- Sentry scrubbing extended for storage URLs and path patterns

### Sprint 9.1 — Glow Moments foundation

Private photo Moments backend: schema, Storage, RLS, server actions. No album UI yet.

#### Added
- Migration `0015_moments_foundation.sql` — `moments`, `moment_children`, `moment_media`, `moment_tags`, `moment_tag_links`
- Private Storage bucket `moments-private` (8 MB, JPEG/PNG/WebP)
- RPCs: `create_private_moment`, `create_moment_media_upload_slot`, `finalize_moment_media_upload`, `moments_parent_media_bytes`
- Feature module `src/features/moments/` — validation, quota (1 GB), signed upload/download actions, age-at-date helper
- 12 seeded system milestone tags (labels only)
- Feature flag `NEXT_PUBLIC_MOMENTS_ENABLED` (default false)
- Ops: `supabase/ops/MOMENTS_ROLLOUT.md`, verify/cleanup/quota SQL

#### Security
- Owner-only RLS — household co-parents cannot read each other's private Moments
- Storage path prefix validation; signed URLs only (120s TTL)
- Sentry scrubbing extended for storage paths, captions, filenames, signed URLs

### Sprint 7.1 — Private Beta Hardening

Production error monitoring and structured beta feedback before Moments.

#### Added
- `@sentry/nextjs` — client, server, edge instrumentation; Vercel source map upload when configured
- `src/lib/monitoring/` — privacy scrubbing, operational vs unexpected error helpers
- Feature-scoped error boundaries: global, Circle, Atlas, Baby, Calm, Profile
- Migration `0014_beta_feedback.sql` — structured feedback (Bug / Confusing / Suggestion / Other)
- Enhanced `FeedbackForm` — summary, optional details, route/version/viewport capture, contact permission

#### Changed
- Version `0.11.0-beta.1`
- `reportClientError` delegates to Sentry when DSN configured
- `/profile/about` shows deployment environment outside production

### Production Circle assignment (no auto-create)

Automatic post-onboarding Circle membership into the best matching **active**
Circle with capacity. Unmatched parents get a calm holding state instead of
an auto-created Circle.

#### Changed
- Migration `0013_circle_assignment_no_auto_create.sql` — RPC returns
  `no_match` when no eligible Circle exists; capacity re-check under row lock.
- `assignParentToBestCircle` wrapper; onboarding redirects to `/circle`.
- Holding copy: “We're finding the right Circle for you.”
- Admin SQL: `supabase/ops/circle-assignment-admin-check.sql`.

### Password recovery flow

Fixes recovery links landing on the normal login screen instead of a
new-password form.

#### Changed
- `resetPasswordForEmail` now redirects to
  `/auth/callback?next=/auth/reset-password` (dedicated reset route).
- New `/auth/reset-password` page waits for `PASSWORD_RECOVERY` or an
  already-established recovery session, then shows new/confirm password.
- On success: update password → sign out → `/login?reset=success`.
- Auth callback `next` paths are validated against open redirects.
- Removed the fragile Account-page `PasswordRecoveryPanel` that only
  listened for a client `PASSWORD_RECOVERY` event after server code exchange.

### Synthetic Atlas Preview (beta ambient density)

Optional, renderer-only ambient lights (~5,000 by default) so the Atlas
still feels visually alive while real beta presence is sparse. See
`docs/GlowAtlas.md` → Synthetic Atlas Preview.

#### Added
- `map/syntheticAtlasData.ts` — deterministic, seeded, population-weighted
  point generator with state-polygon containment; module-level cache;
  GeoJSON properties are only `{ synthetic: true }`.
- `map/syntheticPreviewConfig.ts` — `NEXT_PUBLIC_ATLAS_SYNTHETIC_PREVIEW`
  / `_COUNT` parsing, 5000 default / 8000 cap, disclosure
  (`"Full community preview · N simulated parents online"`).
- Dedicated MapLibre source (`glow-synthetic-preview`) shared by heatmap +
  per-parent halo/core layers; cool density + warm-lavender simulated
  parents vs warmer real presence; inserted below presence; never
  interactive; disclosure rendered outside the canvas in `GlowAtlas.tsx`.
- Pure tests: allocation, determinism, containment, isolation from
  `buildPresenceGeoJson`, style never bakes synthetic in when disabled.

#### Truthfulness
- Zero coupling to Auth, `map_clusters`, `AtlasPresence`, realtime, badges,
  or live captions — no fake DB rows or fake users.

### Glow Atlas MapLibre Replacement (Checkpoints A–E)

Replaces the SVG-illustration Glow Atlas (previous "Glow Atlas Redesign"
entry below) with a real MapLibre GL JS map. See `docs/GlowAtlas.md` for the
full architecture record.

#### Added
- MapLibre GL JS map (`react-map-gl/maplibre`), client-only via
  `next/dynamic`; local Australia states GeoJSON (Natural Earth 1:10m,
  public domain — `data/geo/`) as the always-present base layer, with an
  optional PMTiles context layer and graceful fallback.
- `map/camera.ts` + `map/stateBounds.ts` — pure, node-testable `fitBounds`
  target calculation from real geographic bounds; geometry/proximity-based
  per-state camera bbox (excludes ACT's remote Jervis Bay Territory exclave,
  includes Tasmania's legitimate nearby islands); responsive
  level-aware padding; global + per-level zoom ceilings; Australia
  `maxBounds`; reduced-motion-aware instant/900ms transitions.
- `map/presenceGeoJson.ts` — privacy-safe `AtlasPresence` → GeoJSON
  transform (state/city/suburb `FeatureCollection`s); suburb features
  enforce the `MIN_SUBURB_PRESENCE_COUNT` (`= 5`) floor
  (`utils/privacyConstants.ts`, shared with `useGlowAtlas`); halo + core
  circle GL layers with count-scaled, capped intensity; realtime
  `source.setData` updates with no style/map reinitialization.
- `map/GlowMapBadges.tsx` — the small set of disclosed, interactive
  state/city/suburb badges as MapLibre `<Marker>`s positioned by real `geo`
  coordinates; a national-specific label layout (fixed per-state pixel
  offsets, zero overlap/edge-overflow verified at 360/390/430px + desktop)
  keeping all 8 states/territories visible at country level, plus an
  external leader-line badge for ACT.
- `map/GlowMapChrome.tsx` — breadcrumbs, Back, and a keyboard-accessible
  Reset-to-Australia control, outside the map's own pan/zoom coordinate
  space.
- Corrected ACT geometry: regenerated `data/geo/australia-states.geojson`
  from Natural Earth's 1:10m (vs. previous 1:50m) admin-1 dataset — ACT went
  from a ~20-vertex blob to a recognisable 157-vertex Canberra territory.
- New tests: `camera.test.ts`, `stateBounds.test.ts`, `presenceGeoJson.test.ts`,
  `glowMapStyle.test.ts`, `australiaStatesGeoJson.test.ts`,
  `mapClustersToPresence.test.ts` (privacy boundary coverage: suburb counts
  0/4/5, duplicate-row aggregation, and a serialization check that
  `approximate_lat`/`approximate_lng` never reach `AtlasPresence`).

#### Changed
- `AttributionControl` moved to `bottom-left` (was MapLibre's default
  `bottom-right`), which was overlapping the Tasmania national badge at
  360/390px whenever PMTiles was active.
- City/suburb levels no longer render the selected state as a large opaque
  fill slab — fill is reduced to a near-invisible contextual boundary at
  those levels so presence lights and disclosed badges stay the visual
  focus.
- "Showing simplified map" moved from an in-canvas overlay to a status line
  below the map card, alongside the existing privacy/helper text.
- The MapLibre default compass/navigation control is not rendered at all
  (the custom Reset-to-Australia control replaces it); only the contained,
  compact `AttributionControl` remains as a map control.

#### Removed
- The SVG rendering path this MapLibre implementation replaces:
  `GlowAtlasSVG.tsx`, `BaseMapLayer.tsx`, `GlowLightLayer.tsx`,
  `OverlayLayer.tsx`, their SVG/licence assets, and the one-off scripts that
  generated/validated them (`build-glow-atlas-svg.mjs`,
  `generate-australia-map-svg.mjs`, `validate-atlas-anchors.mjs`,
  `build-au10m-states.mjs`). See `docs/GlowAtlas.md` for the full list and
  the confirmation process (repository-wide reference search before each
  deletion).
- `src/features/glow-map/` — a separate, unreferenced legacy prototype
  directory with zero live imports anywhere in the app.
- The temporary `/qa-glowmap-refine` QA harness route.
- Stale `GlowAtlasSVG`/`ATLAS_SVG_VIEWBOX`/`BaseMapLayer`/`GlowLightLayer`/
  `OverlayLayer` exports from `features/glow-atlas/index.ts`.

#### Performance
- MapLibre initializes exactly once per mounted `<GlowAtlas>`; realtime
  presence ticks use `source.setData` only, never a style rebuild.
- `GlowMapBadges` memoised; selected-feature emphasis uses
  `map.setFeatureState`, never a source replacement.

#### Accessibility
- MapLibre canvas kept `aria-hidden`/quiet for screen readers; the caption
  outside the canvas is the one non-`aria-live` textual activity summary;
  `GlowAtlasLiveStatus` remains the only actively-announced region, avoiding
  duplicate announcements.
- Every interactive control (badges, Back, Reset, breadcrumbs) has a visible
  focus ring and a clear accessible name; keyboard users can reach and
  activate all of them.

### Glow Atlas Redesign (Checkpoints A–E)

#### Added
- Real lat/lng projection pipeline (`utils/projection.ts`) — `latLngToPercent`
  calibrated against `AU_GEO_BOUNDS`, with a documented, optional
  `displayOffset` (dx/dy + required `reason`) for coastal clipping, badge
  collision, or readability exceptions.
- `states.ts`/`cities.ts`/`suburbs.ts` migrated to a `geo`-first builder
  pattern (`defineState`/`defineCity`/`defineSuburb`); all screen anchors are
  now derived, not hand-eyeballed.
- `featured`/`featuredPriority` data fields replacing the VIC/Melbourne-only
  disclosure allowlists with a generic preferred-then-top-N mechanism
  (`deriveFeaturedIds`, `utils/disclosure.ts`).
- Real badge collision footprint, top-chrome exclusion band, and a capped
  country-level collision pass (previously unbounded/no collision at all).
- Materially redesigned visual treatment: unified cross-map SVG gradients,
  active/selected state hierarchy, candle-like layered-halo lights, warmer
  glass badges with a presence-dot, and a wider/lower-padding mobile card so
  the map reads as the Tonight screen's hero feature at 360–430px.
- `zoomTransitionFor()` / `UI_FADE_TRANSITION` — reduced-motion-aware zoom
  reposition transition and a shared 350ms/`easeOut` chrome-fade token
  (aligned with `docs/STYLEGUIDE.md`).
- Client-side k-anonymity re-check (`MIN_SUBURB_CLUSTER_SIZE`), stable
  `AtlasPresence` field references across realtime ticks (`reconcilePresence`),
  and normalized/longest-match suburb matching (`matchSuburb.ts`).
- New tests: `projection.test.ts`, `disclosure.test.ts`, `matchSuburb.test.ts`.

#### Changed
- `AnimatedCount` gained an `announce` prop so nested counts inside an
  already-labelled badge/paragraph stop double-announcing to screen readers.
- All interactive Atlas controls (badges, back button, breadcrumbs) now show
  a visible focus ring.
- `suburbCounts` aggregation now accumulates like `cityCounts` instead of
  overwriting, fixing a silent undercount when two raw labels fuzzy-match the
  same Atlas suburb.
- `useMapClusterPresence` selects an explicit column list instead of `*`,
  dropping unused `approximate_lat`/`approximate_lng` from the wire payload.

#### Removed
- Dead components superseded by `BaseMapLayer`/`GlowLightLayer`/
  `OverlayLayer`: `GlowLights`, `GlowTransition`, `GlowStateLayer`,
  `GlowCityLayer`, `GlowSuburbLayer`, `StateHitLayer` (its focus-ring pattern
  was ported forward before deletion).

#### Performance
- `BaseMapLayer`, `GlowLightLayer`, `OverlayLayer`, and `GlowBadge` are all
  memoised, with stable callback props from `OverlayLayer` so the
  memoisation is actually effective on realtime ticks.

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

### Sprint 6.2 — Closed Beta Access

#### Added
- Migration `0010_closed_beta_access.sql` — allowlist status lifecycle, Auth hook function, boolean RPC
- Server-side `checkBetaSignupAccess` + `is_beta_email_allowed`
- Calm private-beta denial copy on signup
- Seed template `supabase/seed-beta-testers.template.sql` (placeholders only)
- Env validation helpers for required public vars
- Unit tests for email normalisation, env checks, allowlist contracts

#### Changed
- Signup/login copy — private beta, invited testers only
- `beta_testers` RLS — staff-only (no client allowlist listing)
- App version → `0.10.0-beta.2`
- Docs: Beta, Security, Release/Checklists, Roadmap, DECISIONS

#### Security
- Primary gate: Supabase Before User Created hook (Dashboard enable required)
- App check is UX fallback only — never client-only enforcement

---

### Sprint 6.1 — Private Beta Audit & Hardening

#### Added
- Migration `0009_beta_rls_hardening.sql` — scoped `parents` SELECT, `parent_baby_age_months` auth guard, message update trigger
- Password recovery panel on Account page + login forgot-password form
- Calm user-facing error helper (`src/lib/errors/calm-messages.ts`)
- Privacy-conscious client error reporting hook (dev-only)
- `not-found.tsx` for root and authenticated shell
- Audit docs: `RLS_ACCESS_MATRIX`, `SECURITY_AUDIT`, `BETA_TEST_CHECKLIST`, `KNOWN_ISSUES`, `RELEASE_CHECKLIST`
- `.env.example`
- Unit tests: calm messages, tonight circle preview, RLS contract

#### Changed
- Tonight Circle card uses live Circle data (removed `tonightMock`)
- "Open your Circle" CTA links to `/circle`
- App version → `0.10.0-beta.1`
- `docs/Beta.md` — full private beta program documentation

#### Fixed
- Incomplete password-reset flow (no set-password UI after email link)
- Raw Supabase auth errors shown on login/signup/profile actions
- Global `parents` table enumeration (critical RLS)

#### Security
- See `docs/SECURITY_AUDIT.md` and `docs/RLS_ACCESS_MATRIX.md`

---

## Unreleased (prior sprints)

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
