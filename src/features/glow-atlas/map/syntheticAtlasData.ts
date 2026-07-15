/**
 * Synthetic Atlas Preview — deterministic, seeded, renderer-only ambient
 * points for testers when there are only a handful of real users online.
 *
 * TRUTHFULNESS (read this before touching anything below): a synthetic
 * point is never a real user, never a real session, and must never be
 * presented as either. This module:
 *  - has zero imports from, and zero references to, `AtlasPresence`,
 *    `mapClustersToPresence.ts`, `useMapClusterPresence.ts`, `useGlowAtlas.ts`,
 *    Supabase, or any realtime/database code. It cannot see real data even
 *    by accident.
 *  - inserts nothing into any database — every point below is pure
 *    in-memory geometry, computed from this file's own weight tables and a
 *    seed string.
 *  - never produces a `count`, a `label`, or anything else that could be
 *    read as an aggregate badge — see `buildSyntheticPreviewGeoJson`'s
 *    feature properties, which carry nothing beyond a `synthetic: true`
 *    marker.
 *  - is consumed only by `glowMapStyle.ts`'s dedicated
 *    `GLOW_SYNTHETIC_PREVIEW_*` source/layers, which are deliberately kept
 *    out of `interactiveLayerIds` (see GlowMap.tsx) — there is nothing to
 *    click, so a synthetic light is a visual no-op on click by construction,
 *    not by an extra guard that could be forgotten.
 *
 * GENERATION ALGORITHM
 * 1. Pick a state/territory, weighted by `SYNTHETIC_STATE_WEIGHTS`
 *    (population-proportional, configurable).
 * 2. Within that state, pick a "center" — either a real named city from the
 *    existing `atlasCities` catalog (weighted by that city's own `weight`)
 *    or a synthetic "regional/rest of state" fallback anchored on the
 *    state's own catalog centroid (`atlasStates[].geo`), so points aren't
 *    only ever placed in the handful of named metros.
 * 3. Offset from that center with an independent 2D Gaussian (reusing the
 *    existing `seededGaussian` primitive), sized by a per-center spread in
 *    kilometres — tight for a CBD-scale center, wide for the regional
 *    fallback.
 * 4. Reject the candidate and retry (same seed, next attempt) if it falls
 *    outside the assigned state's real polygon — this is what keeps points
 *    on land and inside the right border rather than spilling into the
 *    ocean or a neighbouring state. Every draw (state choice, center
 *    choice, offset, retry) is a pure hash of a seed string
 *    (`seededRandom`/`seededGaussian` from `utils/projection.ts`), so the
 *    exact same seed always reproduces the exact same point set.
 *
 * Pure and node-testable (see syntheticAtlasData.test.ts) — no MapLibre or
 * React import.
 */

import { getCitiesForState } from "../data/cities.ts";
import { getState } from "../data/states.ts";
import type { AuStateCode, GeoPoint } from "../types.ts";
import { seededGaussian, seededRandom } from "../utils/projection.ts";
import { STATE_BOUNDS } from "./stateBounds.ts";
import { AUSTRALIA_STATES_GEOJSON } from "../data/geo/australiaStatesGeoJson.ts";
import { SYNTHETIC_PREVIEW_DEFAULT_COUNT } from "./syntheticPreviewConfig.ts";

/**
 * Population-weighted state/territory allocation — approximately proportional
 * to real population share, per the product spec. Configurable: change these
 * numbers (any positive scale, they're renormalised at draw time) to retune
 * the preview's national distribution without touching the algorithm.
 */
export const SYNTHETIC_STATE_WEIGHTS: Record<AuStateCode, number> = {
  NSW: 31,
  VIC: 26,
  QLD: 20,
  WA: 11,
  SA: 7,
  TAS: 2,
  ACT: 2,
  NT: 1,
};

/**
 * The "regional/rest of state" fallback center's weight, as a fraction of
 * the sum of that state's *named* city weights — e.g. NSW's named cities
 * (Sydney/Newcastle/Wollongong/Albury/Wagga) sum to 131, so its regional
 * bucket gets round(131 * 0.25) = 33, meaning roughly a fifth of NSW's
 * synthetic points land outside the five named cities. Scaling by the
 * state's own city-weight sum (rather than a single fixed number) keeps the
 * named-vs-regional split proportionally similar across every state,
 * regardless of how many cities that state has catalogued.
 */
export const REGIONAL_WEIGHT_FRACTION = 0.25;

/** Gaussian spread (km) for the regional/rest-of-state fallback center, per state — wide enough to spread across a real state's populated area without being a fixed, one-size-fits-all radius. Configurable. */
const REGIONAL_SPREAD_KM: Record<AuStateCode, number> = {
  NSW: 180,
  VIC: 120,
  QLD: 220,
  WA: 250,
  SA: 200,
  TAS: 60,
  ACT: 15,
  NT: 220,
};

/** Gaussian spread (km) for a named-city center, tiered by that city's own catalog `weight` — a bigger metro gets a wider ambient spread. Configurable. */
function citySpreadKm(weight: number): number {
  if (weight >= 70) return 22;
  if (weight >= 20) return 16;
  if (weight >= 8) return 11;
  return 7;
}

export type SyntheticCenter = {
  id: string;
  state: AuStateCode;
  geo: GeoPoint;
  weight: number;
  spreadKm: number;
};

function buildStateCenters(state: AuStateCode): SyntheticCenter[] {
  const cityCenters: SyntheticCenter[] = getCitiesForState(state).map((c) => ({
    id: c.id,
    state,
    geo: c.geo,
    weight: c.weight,
    spreadKm: citySpreadKm(c.weight),
  }));

  const citySum = cityCenters.reduce((sum, c) => sum + c.weight, 0);
  const regionalWeight = Math.max(1, Math.round(citySum * REGIONAL_WEIGHT_FRACTION));

  const regionalCenter: SyntheticCenter = {
    id: `${state.toLowerCase()}-regional`,
    state,
    geo: getState(state).geo,
    weight: regionalWeight,
    spreadKm: REGIONAL_SPREAD_KM[state],
  };

  return [...cityCenters, regionalCenter];
}

/** Every state's weighted center list (named cities + one regional fallback), built once at module load — pure and deterministic from the existing geo catalog. */
export const SYNTHETIC_CENTERS_BY_STATE: Record<AuStateCode, SyntheticCenter[]> =
  Object.fromEntries(
    (Object.keys(SYNTHETIC_STATE_WEIGHTS) as AuStateCode[]).map((code) => [
      code,
      buildStateCenters(code),
    ]),
  ) as Record<AuStateCode, SyntheticCenter[]>;

// ---------------------------------------------------------------------------
// Point-in-polygon containment (state border + ocean rejection)
// ---------------------------------------------------------------------------

type Ring = number[][];
type Polygon = Ring[];
type MultiPolygonCoords = Polygon[];

/** Standard ray-casting even-odd test — not survey-grade, matches the rest of this app's geometry helpers (see stateBounds.ts). */
function pointInRing(lng: number, lat: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersects = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

/** A GeoJSON Polygon's ring[0] is the outer boundary; every later ring is a hole (e.g. NSW's polygon carves out the ACT enclave) — a point only counts as "in" the polygon if it's in the outer ring and in none of the holes. */
function pointInPolygon(lng: number, lat: number, polygon: Polygon): boolean {
  if (!pointInRing(lng, lat, polygon[0])) return false;
  for (let i = 1; i < polygon.length; i++) {
    if (pointInRing(lng, lat, polygon[i])) return false;
  }
  return true;
}

function pointInMultiPolygon(lng: number, lat: number, coords: MultiPolygonCoords): boolean {
  return coords.some((polygon) => pointInPolygon(lng, lat, polygon));
}

const STATE_GEOMETRY: Record<AuStateCode, MultiPolygonCoords> = Object.fromEntries(
  AUSTRALIA_STATES_GEOJSON.features.map((feature) => [
    feature.properties.code,
    feature.geometry.coordinates,
  ]),
) as Record<AuStateCode, MultiPolygonCoords>;

/** Cheap bbox pre-filter before the full ring test — most rejected candidates (well outside the state) never need the expensive polygon walk. */
export function isPointInState(lng: number, lat: number, state: AuStateCode): boolean {
  const bbox = STATE_BOUNDS[state];
  if (lng < bbox.west || lng > bbox.east || lat < bbox.south || lat > bbox.north) return false;
  return pointInMultiPolygon(lng, lat, STATE_GEOMETRY[state]);
}

// ---------------------------------------------------------------------------
// Deterministic generation
// ---------------------------------------------------------------------------

/** Bump when the algorithm/weights change in a way that should visibly reshuffle the default layout. */
export const SYNTHETIC_PREVIEW_SEED_VERSION = "v1";

/** Retries per point before giving up and using the (known-safe) center itself. Halves the spread every 4 attempts so candidates converge rather than repeatedly missing at the same radius. */
const MAX_CONTAINMENT_ATTEMPTS = 24;

function kmToDegLat(km: number): number {
  return km / 111;
}

/** Longitude degrees shrink toward the poles; corrected by `cos(lat)` so a spread reads as a consistent real-world distance at any Australian latitude, matching camera.ts's `boundsFromPointRadius`. */
function kmToDegLng(km: number, lat: number): number {
  return km / (111 * Math.max(0.35, Math.cos((lat * Math.PI) / 180)));
}

function weightedChoice<T>(items: { weight: number; value: T }[], r01: number): T {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let remaining = r01 * total;
  for (const item of items) {
    remaining -= item.weight;
    if (remaining <= 0) return item.value;
  }
  return items[items.length - 1].value;
}

function pickState(seed: string): AuStateCode {
  const items = (Object.keys(SYNTHETIC_STATE_WEIGHTS) as AuStateCode[]).map((code) => ({
    weight: SYNTHETIC_STATE_WEIGHTS[code],
    value: code,
  }));
  return weightedChoice(items, seededRandom(`${seed}-state`));
}

function pickCenter(seed: string, state: AuStateCode): SyntheticCenter {
  const items = SYNTHETIC_CENTERS_BY_STATE[state].map((center) => ({
    weight: center.weight,
    value: center,
  }));
  return weightedChoice(items, seededRandom(`${seed}-center`));
}

export type SyntheticAtlasPoint = {
  lng: number;
  lat: number;
  /** Internal bookkeeping only (used by tests/weight verification) — never rendered as a label or exposed as a GeoJSON property. */
  state: AuStateCode;
};

function generatePoint(seed: string, index: number): SyntheticAtlasPoint {
  const pointSeed = `${seed}-pt-${index}`;
  const state = pickState(pointSeed);
  const center = pickCenter(pointSeed, state);

  for (let attempt = 0; attempt < MAX_CONTAINMENT_ATTEMPTS; attempt++) {
    const attemptSeed = `${pointSeed}-try-${attempt}`;
    const shrink = 0.5 ** Math.floor(attempt / 4);
    const spreadKm = center.spreadKm * shrink;
    const lat = center.geo.lat + seededGaussian(`${attemptSeed}-lat`) * kmToDegLat(spreadKm);
    const lng =
      center.geo.lng + seededGaussian(`${attemptSeed}-lng`) * kmToDegLng(spreadKm, center.geo.lat);
    if (isPointInState(lng, lat, state)) {
      return { lng, lat, state };
    }
  }

  // Every attempt exhausted — extremely unlikely (see MAX_CONTAINMENT_ATTEMPTS'
  // shrinking spread), and in practice only reachable for a center that
  // itself sits within ~1-2km of a *simplified* coastline (some real coastal
  // towns, e.g. Warrnambool, land just outside this app's simplified state
  // polygon by a similar margin — see stateBounds.ts's own "not survey-grade"
  // caveat). If the named/regional center itself is contained, use it
  // directly; otherwise fall back one more step to that state's own catalog
  // landmass centroid (`atlasStates[].geo`) — always a deep-interior point,
  // never coastal, and independently verified inside every state's polygon
  // by syntheticAtlasData.test.ts.
  if (isPointInState(center.geo.lng, center.geo.lat, state)) {
    return { lng: center.geo.lng, lat: center.geo.lat, state };
  }
  const anchor = getState(state).geo;
  return { lng: anchor.lng, lat: anchor.lat, state };
}

export type SyntheticAtlasGeneration = {
  seed: string;
  count: number;
  points: SyntheticAtlasPoint[];
};

/**
 * Generated once per (seed, count) pair and cached for the life of the
 * module — repeated calls (re-renders, multiple GlowMap mounts within the
 * same page load) reuse the same array rather than regenerating it.
 */
const generationCache = new Map<string, SyntheticAtlasGeneration>();

export function generateSyntheticAtlasPoints(
  options: { seed?: string; count?: number } = {},
): SyntheticAtlasGeneration {
  const seed = options.seed ?? SYNTHETIC_PREVIEW_SEED_VERSION;
  const count = Math.max(0, Math.floor(options.count ?? SYNTHETIC_PREVIEW_DEFAULT_COUNT));
  const cacheKey = `${seed}::${count}`;

  const cached = generationCache.get(cacheKey);
  if (cached) return cached;

  const points: SyntheticAtlasPoint[] = [];
  for (let i = 0; i < count; i++) {
    points.push(generatePoint(seed, i));
  }

  const result: SyntheticAtlasGeneration = { seed, count, points };
  generationCache.set(cacheKey, result);
  return result;
}

export type SyntheticPreviewFeatureProperties = { synthetic: true };
export type SyntheticPreviewFeatureCollection = GeoJSON.FeatureCollection<
  GeoJSON.Point,
  SyntheticPreviewFeatureProperties
>;

/**
 * The renderer-facing GeoJSON — deliberately the *only* thing GlowMap.tsx
 * ever imports from this module. Properties carry nothing but a `synthetic`
 * marker: no count, no label, no id tying back to a real place name, so
 * there is nothing here a future style change could accidentally surface as
 * if it were a real aggregate (see glowMapStyle.ts's layers, which never
 * read anything but `synthetic` for a static paint value).
 */
export function buildSyntheticPreviewGeoJson(
  options: { seed?: string; count?: number } = {},
): SyntheticPreviewFeatureCollection {
  const { points } = generateSyntheticAtlasPoints(options);
  return {
    type: "FeatureCollection",
    features: points.map((point) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [point.lng, point.lat] },
      properties: { synthetic: true },
    })),
  };
}
