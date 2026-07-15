/**
 * Privacy-safe presence GeoJSON (Checkpoint C, Amendment 4). Turns
 * `AtlasPresence` + the existing geographic catalog (states/cities/suburbs)
 * into three separate `FeatureCollection`s — deliberately independent of
 * the basemap and state-boundary sources (see glowMapStyle.ts) so presence
 * can be restyled/updated without ever touching interactive geometry.
 *
 * Every coordinate is one of the catalog's own approved aggregate anchors
 * (`AtlasState.geo` / `AtlasCity.geo` / `AtlasSuburb.geo`) — the exact
 * per-user coordinate is never selected client-side in the first place
 * (see `map_cluster_public`'s columns in mapClustersToPresence.ts), so
 * there is nothing more precise available to leak here even by accident.
 *
 * Pure and node-testable (see presenceGeoJson.test.ts) — no MapLibre
 * import; GlowMap.tsx is the only place this feeds into real GL sources
 * via `source.setData()`.
 */

import { atlasCities } from "../data/cities.ts";
import { atlasStates } from "../data/states.ts";
import { atlasSuburbs } from "../data/suburbs.ts";
import type { AtlasPresence, GeoPoint } from "../types.ts";
import { MIN_SUBURB_PRESENCE_COUNT } from "../utils/privacyConstants.ts";

// Re-exported for existing callers/tests — the single source of truth now
// lives in `../utils/privacyConstants.ts` (renderer-neutral, also imported
// directly by `hooks/useGlowAtlas.ts`).
export { MIN_SUBURB_PRESENCE_COUNT };

export type PresenceLevel = "state" | "city" | "suburb";

export type PresenceFeatureProperties = {
  id: string;
  label: string;
  level: PresenceLevel;
  count: number;
  /** 0..1 — see `intensityForCount`. Drives halo/core paint scaling only, never disclosure. */
  intensity: number;
};

export type PresenceFeature = GeoJSON.Feature<GeoJSON.Point, PresenceFeatureProperties>;

export type PresenceFeatureCollection = GeoJSON.FeatureCollection<
  GeoJSON.Point,
  PresenceFeatureProperties
>;

export type PresenceGeoJson = {
  state: PresenceFeatureCollection;
  city: PresenceFeatureCollection;
  suburb: PresenceFeatureCollection;
};

/**
 * Declarative UX tuning only (mirrors the `LEVEL_MAX_ZOOM` precedent in
 * camera.ts) — never a substitute for the privacy floor above. The raw
 * count at which halo/core paint reaches its maximum visual intensity.
 * `intensityForCount` runs count through `sqrt` before dividing by this
 * cap, so intensity keeps climbing gently rather than saturating almost
 * immediately — but it is still always clamped to `1`, which is what
 * caps the *visual* size/opacity a single light can reach regardless of
 * how large the real count is (see glowMapStyle.ts's circle-radius
 * expressions, which only ever read this bounded `intensity`, never the
 * raw `count`).
 */
export const PRESENCE_INTENSITY_CAP: Record<PresenceLevel, number> = {
  state: 500,
  city: 250,
  suburb: 60,
};

/** 0..1, monotonically increasing with `count`, always clamped at 1. */
export function intensityForCount(count: number, level: PresenceLevel): number {
  if (count <= 0) return 0;
  const cap = PRESENCE_INTENSITY_CAP[level];
  return Math.min(1, Math.sqrt(count) / Math.sqrt(cap));
}

function toFeature(
  id: string,
  label: string,
  level: PresenceLevel,
  count: number,
  geo: GeoPoint,
): PresenceFeature {
  return {
    type: "Feature",
    geometry: { type: "Point", coordinates: [geo.lng, geo.lat] },
    properties: { id, label, level, count, intensity: intensityForCount(count, level) },
  };
}

function collection(features: PresenceFeature[]): PresenceFeatureCollection {
  return { type: "FeatureCollection", features };
}

/**
 * Build the three privacy-safe presence sources from `AtlasPresence`.
 * State/city features are emitted for any `count > 0` (matching
 * `mapClustersToPresence.ts`, which applies no k-anonymity floor above
 * suburb level — a state or city aggregate is never small enough to be
 * identifying). Suburb features are emitted only at
 * `count >= MIN_SUBURB_PRESENCE_COUNT`.
 */
export function buildPresenceGeoJson(presence: AtlasPresence): PresenceGeoJson {
  const state = collection(
    atlasStates
      .map((s) => ({ s, count: presence.stateCounts[s.code] ?? 0 }))
      .filter(({ count }) => count > 0)
      .map(({ s, count }) => toFeature(s.code, s.name, "state", count, s.geo)),
  );

  const city = collection(
    atlasCities
      .map((c) => ({ c, count: presence.cityCounts[c.id] ?? 0 }))
      .filter(({ count }) => count > 0)
      .map(({ c, count }) => toFeature(c.id, c.name, "city", count, c.geo)),
  );

  const suburb = collection(
    atlasSuburbs
      .map((sub) => ({ sub, count: presence.suburbCounts[sub.id] ?? 0 }))
      .filter(({ count }) => count >= MIN_SUBURB_PRESENCE_COUNT)
      .map(({ sub, count }) => toFeature(sub.id, sub.name, "suburb", count, sub.geo)),
  );

  return { state, city, suburb };
}
