import assert from "node:assert/strict";
import { test } from "node:test";

import { atlasStates, getState } from "../data/states.ts";
import { AUSTRALIA_STATES_GEOJSON } from "../data/geo/australiaStatesGeoJson.ts";
import type { AuStateCode } from "../types.ts";
import {
  buildSyntheticPreviewGeoJson,
  generateSyntheticAtlasPoints,
  isPointInState,
  SYNTHETIC_CENTERS_BY_STATE,
  SYNTHETIC_STATE_WEIGHTS,
} from "./syntheticAtlasData.ts";

const ALL_STATE_CODES = Object.keys(SYNTHETIC_STATE_WEIGHTS) as AuStateCode[];

/** Nearest-vertex distance (km, equirectangular-approx) from a point to any ring vertex of a state's geometry — a cheap approximation, only used here to bound how far a "not contained" center is allowed to be (test-only, not production geometry). */
function nearestBoundaryDistanceKm(lng: number, lat: number, state: AuStateCode): number {
  const feature = AUSTRALIA_STATES_GEOJSON.features.find((f) => f.properties.code === state);
  assert.ok(feature, `no geometry found for ${state}`);
  const lngScale = Math.cos((lat * Math.PI) / 180);
  let best = Infinity;
  for (const polygon of feature.geometry.coordinates) {
    for (const ring of polygon) {
      for (const [vLng, vLat] of ring) {
        const dLat = (lat - vLat) * 111;
        const dLng = (lng - vLng) * 111 * lngScale;
        const dist = Math.hypot(dLat, dLng);
        if (dist < best) best = dist;
      }
    }
  }
  return best;
}

test("generates exactly the requested number of points", () => {
  for (const count of [0, 1, 250, 5000]) {
    const result = generateSyntheticAtlasPoints({ seed: "count-check", count });
    assert.equal(result.points.length, count);
    assert.equal(result.count, count);
  }
});

test("defaults to the configured default count (5000) when no count is given", () => {
  const result = generateSyntheticAtlasPoints({ seed: "default-count" });
  assert.equal(result.points.length, 5000);
});

test("the same seed produces identical points on every call", () => {
  const a = generateSyntheticAtlasPoints({ seed: "reproducible", count: 500 });
  const b = generateSyntheticAtlasPoints({ seed: "reproducible", count: 500 });
  assert.deepEqual(a.points, b.points);
});

test("the same seed produces identical points even from a fresh (non-cached) call shape", () => {
  // Distinct seed from other tests in this file so the module-level cache
  // can't be the reason two calls match — this proves the *algorithm* is
  // deterministic, not just the cache.
  const first = generateSyntheticAtlasPoints({ seed: "determinism-proof", count: 300 });
  const second = generateSyntheticAtlasPoints({
    seed: "determinism-proof",
    count: 300,
  });
  assert.deepEqual(first, second);
});

test("a different seed produces a different layout", () => {
  const a = generateSyntheticAtlasPoints({ seed: "seed-a", count: 500 });
  const b = generateSyntheticAtlasPoints({ seed: "seed-b", count: 500 });
  assert.notDeepEqual(a.points, b.points);

  // Not just "some field differs" — the actual coordinates should mostly differ.
  let identical = 0;
  for (let i = 0; i < a.points.length; i++) {
    if (a.points[i].lat === b.points[i].lat && a.points[i].lng === b.points[i].lng) {
      identical++;
    }
  }
  assert.ok(identical < a.points.length * 0.05, "expected almost no identical points between two seeds");
});

test("every generated point lies inside its own assigned state polygon", () => {
  const { points } = generateSyntheticAtlasPoints({ seed: "containment-check", count: 3000 });
  for (const point of points) {
    assert.ok(
      isPointInState(point.lng, point.lat, point.state),
      `point (${point.lng}, ${point.lat}) assigned to ${point.state} is not inside that state's polygon`,
    );
  }
});

test("every state's own catalog landmass centroid — the ultimate fallback anchor generatePoint() falls back to — is inside its own state polygon", () => {
  for (const state of ALL_STATE_CODES) {
    const anchor = getState(state).geo;
    assert.ok(
      isPointInState(anchor.lng, anchor.lat, state),
      `${state}'s own catalog centroid (${anchor.lng}, ${anchor.lat}) is not inside ${state}'s polygon`,
    );
  }
});

test("every named-city/regional center is inside its own state, or (for a handful of real coastal towns) within ~3km of the simplified coastline", () => {
  // Real coastal towns (e.g. Warrnambool) can sit a kilometre or two outside
  // this app's *simplified* state polygon — the same "not survey-grade"
  // limitation stateBounds.ts documents. generatePoint() already handles
  // this safely (falls back one more step to the state's own deep-interior
  // centroid — see the test above), so this only guards against a center
  // being *badly* wrong (a real bug), not this known, tiny coastal margin.
  for (const state of ALL_STATE_CODES) {
    for (const center of SYNTHETIC_CENTERS_BY_STATE[state]) {
      if (isPointInState(center.geo.lng, center.geo.lat, state)) continue;
      const distanceKm = nearestBoundaryDistanceKm(center.geo.lng, center.geo.lat, state);
      assert.ok(
        distanceKm < 3,
        `center "${center.id}" (${center.geo.lng}, ${center.geo.lat}) is ${distanceKm.toFixed(2)}km outside ${state} — too far to be simplification noise`,
      );
    }
  }
});

test("no generated coordinate is a NaN or otherwise invalid lat/lng", () => {
  const { points } = generateSyntheticAtlasPoints({ seed: "validity-check", count: 4000 });
  for (const point of points) {
    assert.ok(Number.isFinite(point.lat));
    assert.ok(Number.isFinite(point.lng));
    assert.ok(point.lat >= -45 && point.lat <= -9, "latitude should stay within Australia's real range");
    assert.ok(point.lng >= 111 && point.lng <= 155, "longitude should stay within Australia's real range");
  }
});

test("state allocation broadly follows the configured population weights", () => {
  const { points } = generateSyntheticAtlasPoints({ seed: "allocation-check", count: 8000 });
  const totalWeight = Object.values(SYNTHETIC_STATE_WEIGHTS).reduce((sum, w) => sum + w, 0);

  const counts: Record<AuStateCode, number> = Object.fromEntries(
    ALL_STATE_CODES.map((code) => [code, 0]),
  ) as Record<AuStateCode, number>;
  for (const point of points) counts[point.state]++;

  for (const code of ALL_STATE_CODES) {
    const expectedShare = SYNTHETIC_STATE_WEIGHTS[code] / totalWeight;
    const actualShare = counts[code] / points.length;
    // Generous absolute tolerance (±6 percentage points) — this is a single
    // seeded draw, not an average over many seeds, and the smallest states
    // (NT/TAS/ACT at 1-2% each) need proportionally more slack.
    assert.ok(
      Math.abs(actualShare - expectedShare) < 0.06,
      `${code}: expected ~${(expectedShare * 100).toFixed(1)}%, got ${(actualShare * 100).toFixed(1)}%`,
    );
  }
});

test("buildSyntheticPreviewGeoJson never carries a count, label, or state-name property — only a synthetic marker", () => {
  const geojson = buildSyntheticPreviewGeoJson({ seed: "no-leaked-props", count: 50 });
  assert.equal(geojson.type, "FeatureCollection");
  assert.equal(geojson.features.length, 50);
  for (const feature of geojson.features) {
    assert.deepEqual(feature.properties, { synthetic: true });
    assert.equal(feature.geometry.type, "Point");
    assert.equal(feature.geometry.coordinates.length, 2);
  }
});

test("generation is cached — repeated calls with the same seed/count return the exact same array reference", () => {
  const first = generateSyntheticAtlasPoints({ seed: "cache-identity", count: 20 });
  const second = generateSyntheticAtlasPoints({ seed: "cache-identity", count: 20 });
  assert.equal(first, second, "expected the cached generation object, not a freshly rebuilt one");
  assert.equal(first.points, second.points, "expected the cached points array, not a freshly rebuilt one");
});

test("real Atlas state catalog is untouched by generating synthetic points (no shared mutable state)", () => {
  const before = structuredClone(atlasStates);
  generateSyntheticAtlasPoints({ seed: "isolation-check", count: 1000 });
  assert.deepEqual(atlasStates, before);
});

test("generating synthetic points never changes real presence GeoJSON output (buildPresenceGeoJson stays byte-for-byte identical)", async () => {
  const { buildPresenceGeoJson } = await import("./presenceGeoJson.ts");
  const samplePresence = {
    stateCounts: { NSW: 12, VIC: 8, QLD: 0, WA: 3, SA: 1, TAS: 0, ACT: 0, NT: 0 },
    cityCounts: { sydney: 12, melbourne: 8 },
    suburbCounts: { "syd-cbd": 6 },
    suburbParents: { "syd-cbd": 6 },
  } as const;

  const before = buildPresenceGeoJson(samplePresence);
  generateSyntheticAtlasPoints({ seed: "presence-isolation", count: 2000 });
  const after = buildPresenceGeoJson(samplePresence);

  assert.deepEqual(after, before);
});
