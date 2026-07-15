# Glow Atlas

Purpose

Allow parents to see they are not alone.

## Hierarchy

Australia → State → City → Suburb → Neighbourhood

The frontend never displays exact user locations. Only aggregated,
privacy-safe clusters from `map_cluster_public` (see Privacy below).

## Architecture — MapLibre GL JS (Checkpoints A–E)

Glow Atlas is a MapLibre GL JS map (via `react-map-gl/maplibre`), not an SVG
illustration. `map/GlowMap.tsx` is the only file that touches the MapLibre
instance directly, and is loaded via `next/dynamic({ ssr: false })` from
`components/GlowAtlas.tsx` — MapLibre registers the `pmtiles://` protocol and
touches `window`/`document` at module load time, so it must never render on
the server.

```
components/GlowAtlas.tsx        top-level section: caption, helper/status text,
                                 mounts <GlowMap> inside an aspect-ratio card
map/GlowMap.tsx                 owns the MapLibre instance (init once), camera
                                 fitBounds effect, PMTiles probe/fallback,
                                 AttributionControl
map/glowMapStyle.ts             the MapLibre StyleSpecification: local states
                                 GeoJSON source/layers + presence source/layers
map/GlowMapChrome.tsx           breadcrumbs, Back, Reset — HTML, outside the
                                 map's own pan/zoom coordinate space
map/GlowMapBadges.tsx           the small set of disclosed, interactive
                                 state/city/suburb <Marker> badges
map/camera.ts                   pure fitBounds-target calculation (bounds,
                                 padding, maxZoom, duration) — no MapLibre
                                 import, fully node-testable
map/stateBounds.ts              per-state camera bbox derived from the real
                                 GeoJSON polygons (see Camera below)
map/presenceGeoJson.ts          AtlasPresence → privacy-safe GeoJSON
                                 FeatureCollections (state/city/suburb)
hooks/useGlowAtlas.ts           selection/breadcrumb/back state machine +
                                 badge disclosure (unchanged data model from
                                 before the MapLibre migration)
```

Only `map/GlowMap.tsx` and `map/GlowMapBadges.tsx` import MapLibre/
`react-map-gl` — every other module above is plain, SSR-safe TypeScript with
no rendering-library dependency, which is what keeps `camera.ts`,
`stateBounds.ts`, and `presenceGeoJson.ts` directly unit-testable with the
project's plain `node --test` runner.

## Geographic data — source & licence

The authoritative state/territory geometry is
`data/geo/australia-states.geojson` (Natural Earth 1:10m Admin-1
Cultural Vectors, public domain — see `data/geo/ATTRIBUTION.md` for the full
provenance, including why the ACT geometry was regenerated at 1:10m instead
of 1:50m, and why Jervis Bay Territory is a separate disconnected polygon in
the same ACT feature rather than reshaping the mainland Canberra polygon).
This file is:

- the fill/line layer MapLibre renders for every state/territory
  (`glowMapStyle.ts`);
- the click/tap hit-area for state selection;
- the **source of truth for every state's camera bbox** (`stateBounds.ts` —
  see Camera below).

City and suburb anchors have no polygon dataset; each is still authored as a
real `geo: { lat, lng }` point (`data/states.ts`, `data/cities.ts`,
`data/suburbs.ts`), and city/suburb camera targets are a bbox synthesized
from that point plus a small, documented latitude radius
(`camera.ts`'s `boundsFromPointRadius`, `CITY_BBOX_RADIUS_LAT_DEG` /
`SUBURB_BBOX_RADIUS_LAT_DEG`) rather than a polygon.

`utils/projection.ts`'s `latLngToPercent`/`resolveDisplayAnchor` (calibrated
against `AU_GEO_BOUNDS`) still exist and are still imported by
`data/states.ts`/`cities.ts`/`suburbs.ts` and `map/camera.ts` (`clamp`) — see
**Known risks** below for the one place this percentage-space math still
actively shapes what renders, even though on-screen *position* now always
comes from real MapLibre `<Marker longitude lat>` coordinates, not a percent
offset into an SVG viewBox.

## Camera & bounds hierarchy (Checkpoint B)

`map/camera.ts`'s `resolveCameraTarget` is pure and node-testable
(`camera.test.ts`): given a selection (`country` / `state` / `city` /
`suburb`) and the map container's own measured viewport size, it returns a
`{ bounds, padding, maxZoom, durationMs }` target that `GlowMap.tsx` turns
into a single `map.fitBounds()` call.

- **Bounds** always come from real geography: `AUSTRALIA_BOUNDS` (national),
  `getStateCameraBounds(code)` (per-state, derived from the GeoJSON polygon —
  see below), or a point-radius bbox for city/suburb. Padding/zoom-ceiling
  numbers are the only hand-tuned UX constants, and they never crop or
  override the geographic bbox itself, only the empty margin around it.
- **Per-state bounds** (`stateBounds.ts`) are computed from the same
  authoritative GeoJSON, not hand-authored — but a naive bbox over *every*
  ring in a state's `MultiPolygon` breaks down for two real cases: ACT's
  bbox would balloon to include the remote Jervis Bay Territory exclave, and
  a naive "biggest polygon only" fix would then also exclude Tasmania's
  legitimate nearby islands (King Island, Flinders Island). The actual rule
  is geometry/proximity-based: every ring within a documented distance of a
  state's dominant landmass is included in its camera bbox; rings beyond
  that distance (Jervis Bay Territory, ~280km from Canberra) are treated as
  remote exclaves and excluded. See `stateBounds.ts` and
  `stateBounds.test.ts` for the exact threshold and coverage of ACT,
  Tasmania, and a mainland state with islands.
- **Padding** is responsive to the map container's own measured size (not
  the window), and level-aware: `resolveCountryPadding` keeps a looser
  margin that the country level's fixed badge offsets
  (`GlowMapBadges.tsx`'s `NATIONAL_LABEL_OFFSET`) were tuned against;
  `resolveStatePadding` is tighter, right-sized to the chrome it actually
  has to clear (`GlowResetControl`'s 28px circle plus a small margin) so
  wide states like WA/NT/SA aren't zoomed out further than their own
  geometry needs.
- **Zoom limits**: `GLOBAL_MIN_ZOOM = 2.5`, `GLOBAL_MAX_ZOOM = 15` on the
  MapLibre instance itself, plus a declarative per-level ceiling
  (`LEVEL_MAX_ZOOM`: country 5.5, state 9, city 12, suburb 13.5) so
  `fitBounds` never zooms in absurdly tight on a compact polygon or a small
  synthesized point radius.
- **Pan restriction**: `resolveMaxBounds()` derives a comfortable margin
  around `AUSTRALIA_BOUNDS` (not a hand-picked corner) so the coastline
  never sits flush against the edge of the pannable area.
- **Manual pan/zoom is always preserved** after every automated camera move
  — `fitBounds` runs once per logical selection change, never re-runs on
  its own, and manual map movement never mutates `useGlowAtlas`'s logical
  `currentLevel`.
- **Reduced motion**: `durationMs` is `0` whenever `useGlowReducedMotion()`
  (or the very first camera placement on mount) applies; otherwise every
  automated move glides over `CAMERA_DURATION_MS` (900ms).

## Privacy-safe presence GeoJSON (Checkpoint C)

`map/presenceGeoJson.ts`'s `buildPresenceGeoJson` turns `AtlasPresence` (the
existing `stateCounts`/`cityCounts`/`suburbCounts`/`suburbParents` shape —
unchanged by the MapLibre migration) plus the static geographic catalog into
three separate `FeatureCollection`s (state, city, suburb):

- Every feature's coordinate is one of the catalog's own approved aggregate
  anchors (`AtlasState`/`AtlasCity`/`AtlasSuburb.geo`) — never an exact
  parent coordinate, and `approximate_lat`/`approximate_lng` from
  `map_cluster_public` never reach this module or any GeoJSON source (see
  `data/mapClustersToPresence.ts`, which strips them before `AtlasPresence`
  is even constructed — verified directly by
  `mapClustersToPresence.test.ts`).
- Suburb features enforce `online_count >= MIN_SUBURB_PRESENCE_COUNT` (`= 5`,
  `utils/privacyConstants.ts` — the single source of truth imported by both
  `presenceGeoJson.ts` and `useGlowAtlas.ts`'s badge disclosure, so the
  k-anonymity floor can't drift between the two). A count of 4 produces
  **no** suburb feature, badge, or announcement; a count of 5 does.
- `intensityForCount` normalizes counts to a 0–1 intensity with a square-root
  curve and a per-level cap (`PRESENCE_INTENSITY_CAP`), so a very large count
  brightens/grows a light without an unbounded blob.

`glowMapStyle.ts` renders each collection as a separate warm **core** circle
layer plus a softer, larger **halo** circle layer beneath it (GL
`circle-radius`/`circle-opacity` expressions driven by each feature's
intensity) — deliberately not a standard pin or a numbered cluster bubble.
Selection emphasis (the "subtle atmospheric" glow on the active region) uses
MapLibre `feature-state`, not a source rewrite, so selecting a state doesn't
touch the GeoJSON source itself.

**Realtime updates**: `GlowMap.tsx` calls
`map.getSource(id).setData(...)` on every presence tick — the MapLibre
instance and its style are never recreated or re-initialized for a realtime
update. `reconcilePresence` (unchanged from before the migration) still
reuses object references when counts are numerically unchanged, so a no-op
tick doesn't invalidate the GeoJSON-building `useMemo`s either.

## Disclosure and badges

- `utils/disclosure.ts` (`discloseStateBadges`/`discloseCityBadges`/
  `discloseSuburbBadges`, `featured`/`featuredPriority` data fields) is
  unchanged from before the MapLibre migration and still decides *which*
  state/city/suburb badges are disclosed as interactive.
- `map/GlowMapBadges.tsx` renders exactly one MapLibre `<Marker>` per
  disclosed badge, positioned by that entity's real `geo` coordinate (never
  a percent offset) — `react-map-gl` reprojects it on every pan/zoom
  automatically. Clicking a badge calls straight back into
  `useGlowAtlas`'s `selectState`/`selectCity`/`selectSuburb`, which drives
  both the logical selection and the Checkpoint B camera move.
- **Country level** always discloses all 8 states/territories — a
  declarative, hand-authored `NATIONAL_LABEL_OFFSET` (fixed CSS pixel nudge
  per state, screenshot-verified at 360/390/430px + desktop for zero
  overlap and zero edge overflow) replaces the old generic
  viewport-collision pass, which previously silently dropped SA/NT/ACT at
  this level. ACT gets its own compact, external leader-line badge
  (`ActLeaderBadge`) instead of an in-place label, since its territory is
  too small at country zoom for one.
- **State level** discloses city badges; **city/suburb level** discloses
  suburb-area badges (privacy-permitted only — see above).

## Reduced motion

`useGlowReducedMotion()` is respected everywhere in the MapLibre path:
automated camera moves collapse to `duration: 0` (see Camera above), and
`GlowBadge`/status-line transitions still skip scale-pop/pulse/breathing
animation in favour of an instant or fade-only state change. Manual pan/
pinch/zoom is never restricted by this preference.

## Accessibility

- The MapLibre canvas itself is `aria-hidden` and kept quiet for screen
  readers — the only accessible surface is `GlowAtlas.tsx`'s own textual
  caption (a concise, non-`aria-live` activity summary) plus each disclosed
  badge's own `aria-label` (`"{label}: {count} parent(s) awake"`).
- Every interactive control (badges, `GlowBackButton`, `GlowResetControl`,
  `GlowBreadcrumbs` links) has a visible `focus-visible` ring and a clear
  accessible name; keyboard users can reach and activate all of them without
  the map trapping focus.
- `GlowAtlasLiveStatus` is the one place connection-state changes are
  actively announced — the caption text is not an `aria-live` region, so
  navigating levels or a realtime tick never produces duplicate/competing
  announcements.

## Basemap: local GeoJSON + optional PMTiles context (Checkpoint A/D)

The state/territory GeoJSON fill/line layer is always present and is a
first-party bundled asset (~275KB) — the map is fully functional with zero
network dependency beyond the Next.js bundle itself.

`NEXT_PUBLIC_ATLAS_PMTILES_URL` (optional) additionally layers real-world
coastline/road/label *context* underneath it, served from a `.pmtiles`
archive over HTTP range requests via the `pmtiles://` protocol
(`maplib-gl.addProtocol`). This variable is:

- **optional** — if unset, the map renders the local GeoJSON only, with no
  error and no production failure;
- **never a committed file** — `.pmtiles` is git-ignored (`*.pmtiles`,
  `public/atlas/*.pmtiles`) and must be hosted externally (CDN/object
  storage) in production, never bundled into the deployment;
- **probed once per mount** with a bounded timeout; on failure (missing URL,
  network error, invalid archive), `GlowMap.tsx` sets a `pmtilesLoadFailed`
  flag and hides the PMTiles layer via `setLayoutProperty(..., 'visibility',
  'none')` — never a full `setStyle()` replacement, so the local GeoJSON and
  presence layers already on the map are never cleared or reinitialized by
  a probe failure. The fallback does not retry or spam status updates.
- reflected outside the canvas as a small "Showing simplified map" status
  line, next to the privacy/helper text below the map card — never an
  overlay on top of the geography or presence lights.
- credited with a compact `AttributionControl` (`"© OpenStreetMap
  contributors"`) whenever the PMTiles layer is actually active, and with no
  custom attribution text when it isn't. The control sits at **bottom-left**
  (Checkpoint E) rather than MapLibre's `bottom-right` default, specifically
  because every national badge near the map's bottom edge (Tasmania, and the
  ACT leader line) is offset toward the *east* side of the card — bottom-left
  sits over open ocean/WA at every level this app renders, so the control
  can never obstruct a disclosed badge.

**To update the PMTiles URL or dataset**: set `NEXT_PUBLIC_ATLAS_PMTILES_URL`
to any Australia-covering `.pmtiles` archive served over HTTPS with
byte-range support (verified in this project's pre-Checkpoint-E pass against
a public Protomaps daily build, `https://build.protomaps.com/<date>.pmtiles`
— confirm your own hosting choice supports `Accept-Ranges`/`206 Partial
Content` before relying on it in production). No code change is required to
swap the URL.

## Removed SVG architecture (Checkpoint E)

The original SVG illustration this MapLibre implementation replaces is
retired. Removed in Checkpoint E, after confirming zero remaining live
imports:

- `components/GlowAtlasSVG.tsx`, `components/BaseMapLayer.tsx`,
  `components/GlowLightLayer.tsx`, `components/OverlayLayer.tsx` — the SVG
  render/zoom/overlay-chrome layer components MapLibre replaced.
- `assets/australia-states.svg`, `assets/ATTRIBUTION.md`,
  `assets/AUSTRALIA_MAP_LICENSE.md` — the old Wikimedia/Lokal_Profil
  (CC BY-SA) SVG asset and its licence docs, superseded by
  `data/geo/australia-states.geojson` (Natural Earth, public domain — see
  Geographic data above).
- `scripts/build-glow-atlas-svg.mjs`, `scripts/generate-australia-map-svg.mjs`
  — one-off generators for the now-deleted SVG asset/component.
- `scripts/validate-atlas-anchors.mjs`, `build-au10m-states.mjs` — temporary
  validation/data-generation scripts from earlier in the Atlas work,
  explicitly self-documented as temporary; the states-GeoJSON generation
  process they captured is preserved in prose in `data/geo/ATTRIBUTION.md`.
- `src/features/glow-map/` — an entirely separate, unreferenced legacy
  prototype directory (its own `GlowMap.tsx`, `AustraliaMapSvg.tsx`,
  `GlowLight.tsx`, etc.) that predated this feature and had zero live
  imports anywhere in the app; confirmed dead via repository-wide reference
  search before deletion.
- The temporary `/qa-glowmap-refine` QA harness route used during the
  Checkpoint C visual refinement pass.

**Retained** despite being adjacent to the above: `utils/zoom.ts`,
`utils/projection.ts`, and the `GlowBadge`/`GlowBreadcrumbs`/`GlowBackButton`
shared components — all still have real, live importers (see Known risks
below for the specific reason `zoom.ts` survives).

## Performance

- MapLibre initializes exactly once per mounted `<GlowAtlas>` (`GlowMap.tsx`
  creates the `Map` instance in a single `useEffect` with an empty
  dependency array); logical selection changes and realtime presence ticks
  never rebuild the style or reinitialize WebGL.
- Realtime presence updates use `source.setData(...)`, never a source
  removal/recreation or a full `setStyle()`.
- `GlowMapBadges` is memoised (`React.memo`), and its inputs
  (`stateBadges`/`cityBadges`/`suburbBadges`, `onSelect*` callbacks) are
  already stable `useMemo`/`useCallback` values from `useGlowAtlas`, so
  transient `GlowMap` re-renders (e.g. hover cursor state) don't rebuild
  every `<Marker>`.
- Selected-feature emphasis uses `map.setFeatureState`, never a source
  replacement.

## Privacy preservation

- `mapClustersToPresence` strips `approximate_lat`/`approximate_lng` before
  constructing `AtlasPresence` and re-checks the suburb k-anonymity floor
  client-side as defense-in-depth, even though `map_cluster_public` should
  already enforce it server-side — verified directly in
  `mapClustersToPresence.test.ts` (0/4/5 counts, duplicate-row aggregation,
  and an explicit serialization check that the raw lat/lng never appear
  anywhere in the returned structure).
- `presenceGeoJson.ts` independently re-enforces the same
  `MIN_SUBURB_PRESENCE_COUNT` floor at the GeoJSON-building layer, and only
  ever uses the static catalog's approved aggregate coordinates — never a
  value read from `map_cluster_public` directly.
- No lat/lng from `map_cluster_public` ever reaches the DOM, console, or a
  MapLibre source — every rendered coordinate traces back to a static,
  reviewable catalog entry (`data/states.ts`/`cities.ts`/`suburbs.ts`).

## Known risks

- **`zoom.ts`'s SVG-percentage collision math still shapes city/suburb
  disclosure.** `useGlowAtlas.ts`'s city/suburb badge disclosure still runs
  `applyViewportCollision` against `projectOverlayPoint`'s percent-of-viewBox
  projection to decide which badges get promoted to interactive vs demoted
  to `lightOnly` — the resulting `x`/`y` are no longer used for on-map
  *position* (that comes from real `geo` coordinates via
  `GlowMapBadges.tsx`), but the collision-based *keep/reject* decision is
  still live and still SVG-viewBox-shaped, not a real MapLibre-pixel
  collision pass. In practice this has read correctly in every manual check
  this project, but it is a known architectural mismatch worth a dedicated
  follow-up rather than a Checkpoint E behaviour change.
- **Suburb/city data coverage is sparse** — only 6 of 27 cities have suburb
  data, and TAS/NT have none yet. Unchanged by the MapLibre migration; see
  `docs/KNOWN_ISSUES.md`.
- **PMTiles verification used a public third-party daily build**, not a
  project-controlled production host — see `docs/KNOWN_ISSUES.md` for what
  the pre-Checkpoint-E verification pass did and didn't confirm.
- Manual visual QA (screenshots, mobile gesture emulation) in every
  checkpoint of this work was performed with Puppeteer against a local dev
  server, not a real device or production build; treat findings as strong
  evidence, not a substitute for a final manual pass on a real phone before
  shipping.

## Future

Nearby parents · heat maps · events
