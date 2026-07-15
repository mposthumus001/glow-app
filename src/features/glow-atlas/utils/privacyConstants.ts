/**
 * Renderer-neutral privacy constants for the Glow Atlas. No React, MapLibre,
 * or other rendering import belongs here — this module exists purely so the
 * k-anonymity floor below has exactly one source of truth, importable from
 * both the disclosure/state layer (`hooks/useGlowAtlas.ts`) and the MapLibre
 * GeoJSON layer (`map/presenceGeoJson.ts`) without either depending on the
 * other's rendering concerns.
 */

/**
 * Suburb-level presence must satisfy k-anonymity (`online_count >= 5`) in
 * the `map_cluster_public` view, and `data/mapClustersToPresence.ts`
 * already enforces this floor once (`MIN_SUBURB_CLUSTER_SIZE`) before a
 * count ever reaches `AtlasPresence.suburbCounts`. This constant duplicates
 * that same floor as defense-in-depth at every render/disclosure boundary
 * that consumes `AtlasPresence` directly (tests, Storybook, QA harnesses
 * can all supply it without going through that guarded path) — even if a
 * caller ever supplies `AtlasPresence` some other way, no suburb feature or
 * badge is ever disclosed below it.
 */
export const MIN_SUBURB_PRESENCE_COUNT = 5;
