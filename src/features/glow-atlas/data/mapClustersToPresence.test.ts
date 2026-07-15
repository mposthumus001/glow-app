import assert from "node:assert/strict";
import { test } from "node:test";

import { emptyAtlasPresence } from "../../presence/utils/emptyAtlasPresence.ts";
import { mapClustersToPresence, reconcilePresence } from "./mapClustersToPresence.ts";
import type { MapClusterPublicRow } from "./mapClustersToPresence.ts";

/**
 * Privacy verification (pre-Checkpoint-E pass) for the raw DB row →
 * `AtlasPresence` boundary — the earliest point client code ever sees
 * `map_cluster_public` data, and therefore the most important place to
 * enforce that a small suburb cluster never becomes a count anywhere
 * downstream (a GeoJSON feature, a badge, or an accessible announcement all
 * read from this same `presence.suburbCounts`/`cityCounts` — if it's never
 * populated here, none of those can ever disclose it).
 * `presenceGeoJson.test.ts` covers the next boundary (`AtlasPresence` →
 * GeoJSON `FeatureCollection`).
 *
 * `MapClusterPublicRow` intentionally has no `approximate_lat`/
 * `approximate_lng` fields at all (see the type's own comment) — there is
 * nothing to strip at runtime because the client-selected column list never
 * includes them in the first place. The "never carried into AtlasPresence"
 * tests below prove the *returned* structure only ever holds plain counts,
 * so even a future caller that mistakenly widens the row type to include
 * those columns still can't leak them through this function.
 */

function row(partial: Partial<MapClusterPublicRow>): MapClusterPublicRow {
  return {
    id: "row-1",
    level: "suburb_area",
    state: null,
    suburb_area: null,
    online_count: 0,
    updated_at: new Date(0).toISOString(),
    ...partial,
  };
}

test("suburb online_count 0 produces no suburb presence", () => {
  const result = mapClustersToPresence([
    row({ level: "suburb_area", state: "VIC", suburb_area: "CBD", online_count: 0 }),
  ]);
  assert.deepEqual(result.presence.suburbCounts, {});
  assert.deepEqual(result.presence.cityCounts, {});
});

test("suburb online_count 4 (below the k=5 floor) produces no suburb presence", () => {
  const result = mapClustersToPresence([
    row({ level: "suburb_area", state: "VIC", suburb_area: "CBD", online_count: 4 }),
  ]);
  assert.deepEqual(result.presence.suburbCounts, {});
  assert.deepEqual(result.presence.cityCounts, {});
});

test("suburb online_count 5 (at the k=5 floor) produces presence", () => {
  const result = mapClustersToPresence([
    row({ level: "suburb_area", state: "VIC", suburb_area: "CBD", online_count: 5 }),
  ]);
  assert.equal(result.presence.suburbCounts["mel-cbd"], 5);
  assert.equal(result.presence.cityCounts.melbourne, 5);
});

test("duplicate matching suburb_area rows aggregate consistently, never overwrite", () => {
  // Each row must independently clear the k=5 floor — that mirrors the real
  // map_cluster_public view, which only ever emits an already-k-anonymous
  // suburb_area row in the first place (see the floor's own comment in
  // mapClustersToPresence.ts); multiple rows for the same Atlas suburb only
  // happen via label-variant aliasing (e.g. two differently-worded
  // suburb_area strings both resolving to "mel-cbd"), not a fragment small
  // enough to be identifying on its own.
  const result = mapClustersToPresence([
    row({ id: "row-a", level: "suburb_area", state: "VIC", suburb_area: "CBD", online_count: 5 }),
    row({ id: "row-b", level: "suburb_area", state: "VIC", suburb_area: "CBD", online_count: 7 }),
  ]);
  assert.equal(result.presence.suburbCounts["mel-cbd"], 12);
  assert.equal(result.presence.cityCounts.melbourne, 12);

  // Same rows in a different order must aggregate to the same total.
  const reordered = mapClustersToPresence([
    row({ id: "row-b", level: "suburb_area", state: "VIC", suburb_area: "CBD", online_count: 7 }),
    row({ id: "row-a", level: "suburb_area", state: "VIC", suburb_area: "CBD", online_count: 5 }),
  ]);
  assert.equal(reordered.presence.suburbCounts["mel-cbd"], 12);
});

test("a suburb_area row below the k=5 floor is excluded even when another row for the same suburb clears it", () => {
  // Defense-in-depth: the per-row floor is applied before aggregation, not
  // after — an identifying (<5) fragment is never folded into a larger
  // total, even though the combined total would itself clear 5.
  const result = mapClustersToPresence([
    row({ id: "row-a", level: "suburb_area", state: "VIC", suburb_area: "CBD", online_count: 5 }),
    row({ id: "row-b", level: "suburb_area", state: "VIC", suburb_area: "CBD", online_count: 3 }),
  ]);
  assert.equal(result.presence.suburbCounts["mel-cbd"], 5, "only the row that itself clears k=5 should count");
});

test("approximate_lat and approximate_lng are never carried into the returned AtlasPresence", () => {
  // MapClusterPublicRow has no lat/lng fields at all — a row shaped like the
  // raw DB view (which does expose approximate_lat/approximate_lng) is cast
  // through the same restricted type real callers use, proving the extra
  // columns are never read even if a future view/query widens the row.
  const wideRow = {
    ...row({ level: "suburb_area", state: "VIC", suburb_area: "CBD", online_count: 5 }),
    approximate_lat: -37.81,
    approximate_lng: 144.96,
  } as MapClusterPublicRow & { approximate_lat: number; approximate_lng: number };

  const result = mapClustersToPresence([wideRow]);

  const serialized = JSON.stringify(result);
  assert.ok(!serialized.includes("-37.81"), "returned presence must not contain the row's approximate_lat");
  assert.ok(!serialized.includes("144.96"), "returned presence must not contain the row's approximate_lng");

  // Every value in the returned presence graph is a plain count — there is
  // no coordinate pair (an object/array) anywhere in the structure.
  for (const bucket of [
    result.presence.stateCounts,
    result.presence.cityCounts,
    result.presence.suburbCounts,
    result.presence.suburbParents,
  ]) {
    for (const value of Object.values(bucket)) {
      assert.equal(typeof value, "number");
    }
  }
});

test("zero and negative online_count rows never create any entry, at any level", () => {
  const result = mapClustersToPresence([
    row({ level: "state", state: "VIC", online_count: 0 }),
    row({ level: "suburb_area", state: "VIC", suburb_area: "CBD", online_count: 0 }),
    row({ level: "country", online_count: -3 }),
  ]);
  // `stateCounts` always has all 8 codes pre-seeded at 0 (see
  // emptyAtlasPresence.ts) — a zero-count row must leave every one of them
  // at that same zero, never write a nonzero value in.
  assert.ok(Object.values(result.presence.stateCounts).every((count) => count === 0));
  assert.deepEqual(result.presence.suburbCounts, {});
  assert.equal(result.countryCount, 0);
});

test("state and country levels have no k-anonymity floor — any positive count passes through", () => {
  const result = mapClustersToPresence([
    row({ level: "state", state: "TAS", online_count: 1 }),
    row({ level: "country", online_count: 1 }),
  ]);
  assert.equal(result.presence.stateCounts.TAS, 1);
  assert.equal(result.countryCount, 1);
});

test("an unrecognised suburb_area label (no Atlas match) is silently dropped, not misattributed", () => {
  const result = mapClustersToPresence([
    row({
      level: "suburb_area",
      state: "VIC",
      suburb_area: "Not A Real Suburb Name",
      online_count: 50,
    }),
  ]);
  assert.deepEqual(result.presence.suburbCounts, {});
  assert.deepEqual(result.presence.cityCounts, {});
});

test("suburbParents is derived only from the (already-floored) suburb count, clamped to [5, 28]", () => {
  const small = mapClustersToPresence([
    row({ level: "suburb_area", state: "VIC", suburb_area: "CBD", online_count: 5 }),
  ]);
  assert.ok(small.presence.suburbParents["mel-cbd"] >= 5);

  const huge = mapClustersToPresence([
    row({ level: "suburb_area", state: "VIC", suburb_area: "CBD", online_count: 1_000_000 }),
  ]);
  assert.equal(huge.presence.suburbParents["mel-cbd"], 28);
});

test("reconcilePresence reuses prior field references when counts are numerically unchanged", () => {
  const prev = emptyAtlasPresence();
  prev.stateCounts.VIC = 10;

  const next = emptyAtlasPresence();
  next.stateCounts.VIC = 10;

  const reconciled = reconcilePresence(prev, next);
  assert.equal(reconciled.stateCounts, prev.stateCounts, "unchanged bucket should keep prev's reference");
  assert.equal(reconciled, prev, "fully unchanged presence should return prev itself");
});

test("reconcilePresence produces a fresh object only for buckets that actually changed", () => {
  const prev = emptyAtlasPresence();
  prev.stateCounts.VIC = 10;

  const next = emptyAtlasPresence();
  next.stateCounts.VIC = 11;

  const reconciled = reconcilePresence(prev, next);
  assert.equal(reconciled.stateCounts, next.stateCounts);
  assert.equal(reconciled.cityCounts, prev.cityCounts, "untouched bucket keeps prev's reference");
});
