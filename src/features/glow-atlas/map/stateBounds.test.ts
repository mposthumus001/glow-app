import assert from "node:assert/strict";
import { test } from "node:test";

import {
  AUSTRALIA_BOUNDS,
  getStateBounds,
  getStateCameraBounds,
  STATE_BOUNDS,
  STATE_CAMERA_BOUNDS,
} from "./stateBounds.ts";
import { AUSTRALIA_STATES_GEOJSON } from "../data/geo/australiaStatesGeoJson.ts";
import type { AuStateCode } from "../types.ts";

const ALL_CODES: AuStateCode[] = [
  "NSW",
  "VIC",
  "QLD",
  "WA",
  "SA",
  "TAS",
  "NT",
  "ACT",
];

function isValidBbox(bbox: { west: number; south: number; east: number; north: number }) {
  return (
    Number.isFinite(bbox.west) &&
    Number.isFinite(bbox.south) &&
    Number.isFinite(bbox.east) &&
    Number.isFinite(bbox.north) &&
    bbox.west < bbox.east &&
    bbox.south < bbox.north
  );
}

test("STATE_BOUNDS has a valid bbox for every AuStateCode", () => {
  for (const code of ALL_CODES) {
    assert.ok(isValidBbox(getStateBounds(code)), `${code} bbox is invalid`);
  }
  assert.equal(Object.keys(STATE_BOUNDS).length, 8);
});

test("STATE_CAMERA_BOUNDS has a valid bbox for every AuStateCode", () => {
  for (const code of ALL_CODES) {
    assert.ok(isValidBbox(getStateCameraBounds(code)), `${code} camera bbox is invalid`);
  }
});

test("state bboxes fall within plausible Australian geographic bounds", () => {
  for (const code of ALL_CODES) {
    const bbox = getStateBounds(code);
    assert.ok(bbox.west >= 110 && bbox.east <= 155, `${code} longitude out of range`);
    assert.ok(bbox.south >= -45 && bbox.north <= -9, `${code} latitude out of range`);
  }
});

test("Victoria's camera bbox matches its known mainland extent", () => {
  const vic = getStateCameraBounds("VIC");
  assert.ok(vic.west > 140 && vic.west < 142, `unexpected VIC west: ${vic.west}`);
  assert.ok(vic.east > 148 && vic.east < 151, `unexpected VIC east: ${vic.east}`);
  assert.ok(vic.south < -38 && vic.south > -40, `unexpected VIC south: ${vic.south}`);
  assert.ok(vic.north < -33 && vic.north > -35, `unexpected VIC north: ${vic.north}`);
});

test("Tasmania's camera bbox includes King Island and Flinders Island", () => {
  const tasFull = getStateBounds("TAS");
  const tasCamera = getStateCameraBounds("TAS");

  // King Island (~143.84-144.14°E, ~39.6-39.9°S) sits west/north of
  // mainland Tasmania; Flinders Island (~147.77-148.32°E, ~39.6-40.3°S)
  // sits north-east of it. Both are legitimate nearby Tasmanian islands,
  // not remote exclaves — the camera bbox must stretch to include them,
  // matching the full geometry bbox exactly (no exclave to exclude here).
  assert.deepEqual(tasCamera, tasFull);

  assert.ok(tasCamera.west <= 143.84, `expected King Island's west edge, got west=${tasCamera.west}`);
  assert.ok(tasCamera.north <= -39.5 && tasCamera.north >= -39.9, `expected a Bass Strait island's north edge, got north=${tasCamera.north}`);
});

test("Queensland's camera bbox includes its northern Torres Strait islets (mainland state with islands)", () => {
  const qldFull = getStateBounds("QLD");
  const qldCamera = getStateCameraBounds("QLD");

  // A handful of small islets north of Cape York sit slightly outside the
  // QLD mainland polygon's own bbox, but only a small fraction of QLD's own
  // size away — legitimate nearby geography, not a remote exclave, so they
  // must be folded into the camera bbox too (again matching the full bbox
  // exactly, since nothing in QLD's geometry is disproportionately remote).
  assert.deepEqual(qldCamera, qldFull);
  assert.ok(qldCamera.north <= -9.2, `expected the Torres Strait islets' north edge, got north=${qldCamera.north}`);
});

test("a mainland state with no distant exclaves keeps an unchanged camera bbox (Western Australia)", () => {
  // WA's offshore islands are already well within its own mainland bbox
  // range, so folding them in should be a no-op either way — a sanity
  // check that the proximity algorithm doesn't spuriously grow bboxes that
  // were already complete.
  assert.deepEqual(getStateCameraBounds("WA"), getStateBounds("WA"));
});

test("ACT's camera bbox excludes the Jervis Bay Territory exclave", () => {
  const actFull = getStateBounds("ACT");
  const actCamera = getStateCameraBounds("ACT");

  // The Jervis Bay Territory polygon sits ~150.6-150.77°E, far east of the
  // ACT mainland (~148.77-149.4°E) — the full bbox is dragged out to
  // include it, but the camera bbox must stay tight around Canberra.
  assert.ok(
    actFull.east > 150,
    "expected the full ACT bbox to include the Jervis Bay Territory exclave",
  );
  assert.ok(
    actCamera.east < 150,
    `camera bbox should exclude Jervis Bay Territory, got east=${actCamera.east}`,
  );
  assert.ok(actCamera.west > 148 && actCamera.west < 149);

  // A tight, sensible ACT/Canberra framing — not a multi-degree stretch of
  // NSW coastline between Canberra and Jervis Bay.
  const width = actCamera.east - actCamera.west;
  assert.ok(width < 1, `expected a tight ACT camera bbox, got width=${width}`);
});

test("ACT's interactive geometry is a real, detailed Canberra-territory shape — not a hand-drawn or crude blob", () => {
  const act = AUSTRALIA_STATES_GEOJSON.features.find((f) => f.properties.code === "ACT");
  if (!act) throw new Error("ACT feature missing");

  // Two disconnected polygons: mainland Canberra territory + Jervis Bay
  // Territory, at their own real, non-overlapping locations — never one
  // polygon whose coordinates blend the two together.
  assert.equal(act.geometry.coordinates.length, 2, "expected mainland ACT + Jervis Bay Territory as separate polygons");

  const vertexCounts = act.geometry.coordinates.map((poly) => poly[0].length);
  const mainlandVertexCount = Math.max(...vertexCounts);
  // The previous 1:50m dataset's ACT mainland ring had ~20 vertices — a
  // crude blob. 1:10m Natural Earth data gives a real, detailed boundary;
  // require an order of magnitude more detail so a regression back to a
  // coarse hand-drawn-looking shape would fail this test.
  assert.ok(
    mainlandVertexCount > 100,
    `expected a detailed ACT mainland polygon (>100 vertices), got ${mainlandVertexCount}`,
  );

  // The mainland polygon (not Jervis Bay Territory) must be the one inside
  // Canberra's real bounds, and compact — roughly 0.6-0.9° across, not a
  // multi-degree stretch.
  const mainlandPoly = act.geometry.coordinates.find((poly) => poly[0].length === mainlandVertexCount);
  if (!mainlandPoly) throw new Error("mainland ACT polygon missing");
  let west = Infinity, east = -Infinity, south = Infinity, north = -Infinity;
  for (const [lng, lat] of mainlandPoly[0]) {
    west = Math.min(west, lng);
    east = Math.max(east, lng);
    south = Math.min(south, lat);
    north = Math.max(north, lat);
  }
  assert.ok(west > 148.5 && west < 149, `unexpected ACT mainland west: ${west}`);
  assert.ok(east > 149 && east < 149.6, `unexpected ACT mainland east: ${east}`);
  assert.ok(north - south < 1, `expected a compact ACT mainland bbox, got height=${north - south}`);
  assert.ok(east - west < 1, `expected a compact ACT mainland bbox, got width=${east - west}`);
});

test("AUSTRALIA_BOUNDS spans the whole continent including Tasmania and all territories", () => {
  assert.ok(AUSTRALIA_BOUNDS.west < 114); // west coast WA
  assert.ok(AUSTRALIA_BOUNDS.east > 153); // east coast NSW/QLD
  assert.ok(AUSTRALIA_BOUNDS.south < -43); // south coast TAS
  assert.ok(AUSTRALIA_BOUNDS.north > -11); // Top End NT/QLD
});

test("AUSTRALIA_BOUNDS is the union of every state's full bbox, not the camera bboxes", () => {
  const manualUnion = ALL_CODES.map((code) => getStateBounds(code)).reduce((acc, b) => ({
    west: Math.min(acc.west, b.west),
    east: Math.max(acc.east, b.east),
    south: Math.min(acc.south, b.south),
    north: Math.max(acc.north, b.north),
  }));
  assert.deepEqual(AUSTRALIA_BOUNDS, manualUnion);

  // Still holds even though ACT's camera bbox excludes Jervis Bay Territory:
  // the *national* bbox must be built from full geometry, so it isn't
  // silently narrower than the true country extent.
  assert.ok(AUSTRALIA_BOUNDS.east >= getStateBounds("ACT").east);
});

test("every AUSTRALIA_STATES_GEOJSON feature has a corresponding bbox", () => {
  for (const feature of AUSTRALIA_STATES_GEOJSON.features) {
    assert.ok(STATE_BOUNDS[feature.properties.code], feature.properties.code);
    assert.ok(STATE_CAMERA_BOUNDS[feature.properties.code], feature.properties.code);
  }
});
