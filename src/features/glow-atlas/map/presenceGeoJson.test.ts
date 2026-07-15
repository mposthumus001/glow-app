import assert from "node:assert/strict";
import { test } from "node:test";

import { getCity } from "../data/cities.ts";
import { getState } from "../data/states.ts";
import { getSuburb } from "../data/suburbs.ts";
import type { AtlasPresence } from "../types.ts";
import {
  buildPresenceGeoJson,
  intensityForCount,
  MIN_SUBURB_PRESENCE_COUNT,
  PRESENCE_INTENSITY_CAP,
} from "./presenceGeoJson.ts";

function emptyPresence(): AtlasPresence {
  return {
    stateCounts: {
      NSW: 0,
      VIC: 0,
      QLD: 0,
      WA: 0,
      SA: 0,
      TAS: 0,
      NT: 0,
      ACT: 0,
    },
    cityCounts: {},
    suburbCounts: {},
    suburbParents: {},
  };
}

test("MIN_SUBURB_PRESENCE_COUNT matches the documented k-anonymity floor", () => {
  assert.equal(MIN_SUBURB_PRESENCE_COUNT, 5);
});

test("zero counts never produce a state, city, or suburb feature", () => {
  const presence = emptyPresence();
  presence.stateCounts.VIC = 0;
  presence.cityCounts.melbourne = 0;
  presence.suburbCounts["mel-cbd"] = 0;

  const geojson = buildPresenceGeoJson(presence);
  assert.equal(geojson.state.features.length, 0);
  assert.equal(geojson.city.features.length, 0);
  assert.equal(geojson.suburb.features.length, 0);
});

test("state/city features appear for any positive count (no k-anonymity floor above suburb)", () => {
  const presence = emptyPresence();
  presence.stateCounts.VIC = 1;
  presence.cityCounts.melbourne = 1;

  const geojson = buildPresenceGeoJson(presence);
  assert.equal(geojson.state.features.length, 1);
  assert.equal(geojson.state.features[0]?.properties.count, 1);
  assert.equal(geojson.city.features.length, 1);
  assert.equal(geojson.city.features[0]?.properties.count, 1);
});

test("suburb features never render below the k=5 threshold — one and four are excluded", () => {
  const presenceOne = emptyPresence();
  presenceOne.suburbCounts["mel-cbd"] = 1;
  assert.equal(buildPresenceGeoJson(presenceOne).suburb.features.length, 0);

  const presenceFour = emptyPresence();
  presenceFour.suburbCounts["mel-cbd"] = 4;
  assert.equal(buildPresenceGeoJson(presenceFour).suburb.features.length, 0);
});

test("a suburb feature renders exactly at the k=5 boundary", () => {
  const presence = emptyPresence();
  presence.suburbCounts["mel-cbd"] = 5;

  const geojson = buildPresenceGeoJson(presence);
  assert.equal(geojson.suburb.features.length, 1);
  assert.equal(geojson.suburb.features[0]?.properties.count, 5);
});

test("moderate and very high suburb counts both render, with intensity clamped at 1 for very high counts", () => {
  const moderate = emptyPresence();
  moderate.suburbCounts["mel-cbd"] = 22;
  const moderateGeoJson = buildPresenceGeoJson(moderate);
  assert.equal(moderateGeoJson.suburb.features.length, 1);
  const moderateIntensity = moderateGeoJson.suburb.features[0]?.properties.intensity ?? -1;
  assert.ok(moderateIntensity > 0 && moderateIntensity < 1, `expected 0 < intensity < 1, got ${moderateIntensity}`);

  const veryHigh = emptyPresence();
  veryHigh.suburbCounts["mel-cbd"] = 1_000_000;
  const veryHighGeoJson = buildPresenceGeoJson(veryHigh);
  assert.equal(veryHighGeoJson.suburb.features.length, 1);
  assert.equal(veryHighGeoJson.suburb.features[0]?.properties.intensity, 1);
  assert.ok(Number.isFinite(veryHighGeoJson.suburb.features[0]?.properties.count));
});

test("intensityForCount is 0 at/below zero, monotonically increasing, and clamped at 1", () => {
  assert.equal(intensityForCount(0, "suburb"), 0);
  assert.equal(intensityForCount(-5, "state"), 0);

  const low = intensityForCount(5, "city");
  const mid = intensityForCount(50, "city");
  const high = intensityForCount(250, "city");
  const veryHigh = intensityForCount(1_000_000, "city");

  assert.ok(low > 0 && low < mid, `expected 0 < low(${low}) < mid(${mid})`);
  assert.ok(mid < high, `expected mid(${mid}) < high(${high})`);
  assert.equal(high, 1, "count at the documented cap should reach exactly 1");
  assert.equal(veryHigh, 1, "count far past the cap must stay clamped at 1, not exceed it");
});

test("each level has its own documented intensity cap, and a count at one level's cap is not necessarily maxed at another", () => {
  assert.equal(PRESENCE_INTENSITY_CAP.state, 500);
  assert.equal(PRESENCE_INTENSITY_CAP.city, 250);
  assert.equal(PRESENCE_INTENSITY_CAP.suburb, 60);

  // The suburb cap (60) is far below the state cap (500) — the same count
  // reads as "maxed out" for a suburb but only partially lit for a state.
  assert.equal(intensityForCount(60, "suburb"), 1);
  assert.ok(intensityForCount(60, "state") < 1);
});

test("feature coordinates are exactly the catalog's own approved aggregate anchor — never a distinct/exact coordinate", () => {
  const presence = emptyPresence();
  presence.stateCounts.TAS = 42;
  presence.cityCounts.hobart = 24;
  presence.suburbCounts["mel-cbd"] = 42;

  const geojson = buildPresenceGeoJson(presence);

  const tas = getState("TAS");
  const stateFeature = geojson.state.features.find((f) => f.properties.id === "TAS");
  assert.deepEqual(stateFeature?.geometry.coordinates, [tas.geo.lng, tas.geo.lat]);

  const hobart = getCity("hobart");
  const cityFeature = geojson.city.features.find((f) => f.properties.id === "hobart");
  assert.deepEqual(cityFeature?.geometry.coordinates, [hobart?.geo.lng, hobart?.geo.lat]);

  const melCbd = getSuburb("mel-cbd");
  const suburbFeature = geojson.suburb.features.find((f) => f.properties.id === "mel-cbd");
  assert.deepEqual(suburbFeature?.geometry.coordinates, [melCbd?.geo.lng, melCbd?.geo.lat]);
});

test("every feature carries its own level, label, and count in properties (no cross-level leakage)", () => {
  const presence = emptyPresence();
  presence.stateCounts.VIC = 531;
  presence.cityCounts.melbourne = 183;
  presence.suburbCounts["mel-cbd"] = 42;

  const geojson = buildPresenceGeoJson(presence);

  const stateFeature = geojson.state.features.find((f) => f.properties.id === "VIC");
  assert.equal(stateFeature?.properties.level, "state");
  assert.equal(stateFeature?.properties.label, "Victoria");
  assert.equal(stateFeature?.properties.count, 531);

  const cityFeature = geojson.city.features.find((f) => f.properties.id === "melbourne");
  assert.equal(cityFeature?.properties.level, "city");
  assert.equal(cityFeature?.properties.label, "Melbourne");
  assert.equal(cityFeature?.properties.count, 183);

  const suburbFeature = geojson.suburb.features.find((f) => f.properties.id === "mel-cbd");
  assert.equal(suburbFeature?.properties.level, "suburb");
  assert.equal(suburbFeature?.properties.label, "CBD");
  assert.equal(suburbFeature?.properties.count, 42);
});

test("collections are valid GeoJSON FeatureCollections even when empty", () => {
  const geojson = buildPresenceGeoJson(emptyPresence());
  assert.equal(geojson.state.type, "FeatureCollection");
  assert.equal(geojson.city.type, "FeatureCollection");
  assert.equal(geojson.suburb.type, "FeatureCollection");
  assert.deepEqual(geojson.state.features, []);
  assert.deepEqual(geojson.city.features, []);
  assert.deepEqual(geojson.suburb.features, []);
});
