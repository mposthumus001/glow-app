export { GlowAtlas } from "./components/GlowAtlas";
export { GlowAtlasLiveStatus } from "./components/GlowAtlasLiveStatus";
export type { GlowAtlasLiveStatusProps } from "./components/GlowAtlasLiveStatus";
export { GlowBadge } from "./components/GlowBadge";
export { GlowBreadcrumbs } from "./components/GlowBreadcrumbs";
export { GlowBackButton } from "./components/GlowBackButton";

// MapLibre replacement (Checkpoint A). `GlowMap` itself is intentionally
// NOT re-exported here — it is browser-only (registers the pmtiles://
// protocol at module scope) and must stay behind the `next/dynamic`,
// `ssr: false` boundary in GlowAtlas.tsx. These helpers are pure/SSR-safe.
export {
  buildGlowMapStyle,
  GLOW_PRESENCE_CITY_CORE_LAYER_ID,
  GLOW_PRESENCE_CITY_HALO_LAYER_ID,
  GLOW_PRESENCE_CITY_SOURCE_ID,
  GLOW_PRESENCE_LAYER_IDS,
  GLOW_PRESENCE_STATE_CORE_LAYER_ID,
  GLOW_PRESENCE_STATE_HALO_LAYER_ID,
  GLOW_PRESENCE_STATE_SOURCE_ID,
  GLOW_PRESENCE_SUBURB_CORE_LAYER_ID,
  GLOW_PRESENCE_SUBURB_HALO_LAYER_ID,
  GLOW_PRESENCE_SUBURB_SOURCE_ID,
  GLOW_STATES_FILL_LAYER_ID,
  GLOW_STATES_LINE_LAYER_ID,
  GLOW_STATES_SOURCE_ID,
} from "./map/glowMapStyle";
export type { GlowMapStyleOptions } from "./map/glowMapStyle";
export { resolveBasemapStatus } from "./map/basemapStatus";
export type {
  BasemapStatus,
  BasemapStatusInput,
  BasemapStatusResult,
} from "./map/basemapStatus";
export { AUSTRALIA_STATES_GEOJSON } from "./data/geo/australiaStatesGeoJson";

// Camera (Checkpoint B) — pure/SSR-safe bbox + fitBounds-target helpers.
export {
  AUSTRALIA_BOUNDS,
  getStateBounds,
  getStateCameraBounds,
  STATE_BOUNDS,
  STATE_CAMERA_BOUNDS,
} from "./map/stateBounds";
export type { Bbox } from "./map/stateBounds";
export {
  boundsFromPointRadius,
  CAMERA_DURATION_MS,
  CITY_BBOX_RADIUS_LAT_DEG,
  GLOBAL_MAX_ZOOM,
  GLOBAL_MIN_ZOOM,
  LEVEL_MAX_ZOOM,
  resolveCameraBounds,
  resolveCameraPadding,
  resolveCameraTarget,
  resolveMaxBounds,
  SUBURB_BBOX_RADIUS_LAT_DEG,
} from "./map/camera";
export type {
  CameraPadding,
  CameraSelectionInput,
  CameraTarget,
  CameraViewport,
} from "./map/camera";

// Presence GeoJSON (Checkpoint C) — pure/SSR-safe privacy-safe
// FeatureCollection builder consumed by GlowMap's GL presence layers.
export {
  buildPresenceGeoJson,
  intensityForCount,
  PRESENCE_INTENSITY_CAP,
} from "./map/presenceGeoJson";
export type {
  PresenceFeature,
  PresenceFeatureCollection,
  PresenceFeatureProperties,
  PresenceGeoJson,
  PresenceLevel,
} from "./map/presenceGeoJson";

// Renderer-neutral privacy constants (Checkpoint C refinement) — the single
// source of truth for the suburb k-anonymity floor, shared by both
// `useGlowAtlas` (badge disclosure) and `presenceGeoJson` (GL layers).
export { MIN_SUBURB_PRESENCE_COUNT } from "./utils/privacyConstants";

export { useGlowAtlas } from "./hooks/useGlowAtlas";
export type {
  UseGlowAtlasOptions,
  GlowAtlasController,
} from "./hooks/useGlowAtlas";

export { useMapClusterPresence } from "./hooks/useMapClusterPresence";
export type {
  UseMapClusterPresenceResult,
  UseMapClusterPresenceOptions,
  MapClusterConnection,
} from "./hooks/useMapClusterPresence";

export {
  mapClustersToPresence,
} from "./data/mapClustersToPresence";
export type {
  MapClusterPublicRow,
  MapClusterPresenceResult,
} from "./data/mapClustersToPresence";

export { demoPresence, demoTotalAwake } from "./data/demoPresence";
export { atlasStates } from "./data/states";
export { atlasCities } from "./data/cities";
export { atlasSuburbs } from "./data/suburbs";
export { australiaMeta, ATLAS_VIEWBOX } from "./data/australia";

export {
  discloseCityBadges,
  discloseSuburbBadges,
  discloseStateBadges,
  applyViewportCollision,
  deriveFeaturedIds,
  BADGE_COLLISION,
} from "./utils/disclosure";

export type {
  AtlasBadge,
  AtlasCity,
  AtlasLevel,
  AtlasLight,
  AtlasPresence,
  AtlasPresenceSource,
  AtlasSelection,
  AtlasState,
  AtlasSuburb,
  AuStateCode,
  DisplayOffset,
  FocusBounds,
  GeoPoint,
  GlowLightKind,
} from "./types";

export type { GlowAtlasProps } from "./components/GlowAtlas";
