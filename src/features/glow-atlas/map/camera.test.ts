import assert from "node:assert/strict";
import { test } from "node:test";

import {
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
} from "./camera.ts";
import { AUSTRALIA_BOUNDS, getStateCameraBounds } from "./stateBounds.ts";

test("resolveCameraBounds: country uses the real national bbox", () => {
  const bounds = resolveCameraBounds({ level: "country" });
  assert.deepEqual(bounds, AUSTRALIA_BOUNDS);
});

test("resolveCameraBounds: state uses the real per-state camera bbox", () => {
  const bounds = resolveCameraBounds({ level: "state", code: "VIC" });
  assert.deepEqual(bounds, getStateCameraBounds("VIC"));
});

test("resolveCameraBounds: state never falls back to a synthesized/point bbox", () => {
  const act = resolveCameraBounds({ level: "state", code: "ACT" });
  // Real ACT polygon bbox, not a symmetric point-radius square.
  assert.notEqual(act.east - act.west, act.north - act.south);
});

test("resolveCameraBounds: city synthesizes a bbox centred on the real point", () => {
  const geo = { lat: -37.8136, lng: 144.9631 }; // Melbourne
  const bounds = resolveCameraBounds({ level: "city", geo });
  const centerLng = (bounds.west + bounds.east) / 2;
  const centerLat = (bounds.south + bounds.north) / 2;
  assert.ok(Math.abs(centerLng - geo.lng) < 1e-6);
  assert.ok(Math.abs(centerLat - geo.lat) < 1e-6);
  assert.ok(bounds.north - bounds.south > 0);
});

test("resolveCameraBounds: suburb bbox is smaller than city bbox at the same point", () => {
  const geo = { lat: -37.8136, lng: 144.9631 };
  const city = resolveCameraBounds({ level: "city", geo });
  const suburb = resolveCameraBounds({ level: "suburb", geo });
  assert.ok(city.north - city.south > suburb.north - suburb.south);
  assert.ok(city.east - city.west > suburb.east - suburb.west);
});

test("boundsFromPointRadius: applies a latitude-cosine correction to longitude radius", () => {
  const equatorish = boundsFromPointRadius({ lat: -10, lng: 140 }, 0.5);
  const farSouth = boundsFromPointRadius({ lat: -44, lng: 140 }, 0.5);
  const lngWidthNearEquator = equatorish.east - equatorish.west;
  const lngWidthFarSouth = farSouth.east - farSouth.west;
  // Same real-world east-west distance should need MORE degrees of
  // longitude the further from the equator (cos(lat) shrinks).
  assert.ok(lngWidthFarSouth > lngWidthNearEquator);
  // Latitude span is unaffected by the correction.
  assert.equal(equatorish.north - equatorish.south, 1);
  assert.equal(farSouth.north - farSouth.south, 1);
});

test("resolveCameraBounds: city/suburb radii match the documented constants", () => {
  const geo = { lat: 0, lng: 0 };
  const city = resolveCameraBounds({ level: "city", geo });
  const suburb = resolveCameraBounds({ level: "suburb", geo });
  assert.equal(city.north - city.south, CITY_BBOX_RADIUS_LAT_DEG * 2);
  assert.equal(suburb.north - suburb.south, SUBURB_BBOX_RADIUS_LAT_DEG * 2);
});

test("resolveCameraPadding: scales with viewport size but stays within sane clamps", () => {
  const mobile = resolveCameraPadding({ width: 360, height: 420 });
  const desktop = resolveCameraPadding({ width: 1280, height: 800 });

  for (const padding of [mobile, desktop]) {
    assert.ok(padding.top >= 54 && padding.top <= 92);
    assert.ok(padding.left >= 10 && padding.left <= 32);
    assert.ok(padding.right >= 10 && padding.right <= 32);
    assert.ok(padding.bottom >= 14 && padding.bottom <= 36);
    assert.equal(padding.left, padding.right);
  }

  // Desktop's larger container should never produce *smaller* padding.
  assert.ok(desktop.top >= mobile.top);
  assert.ok(desktop.left >= mobile.left);
});

test("resolveCameraPadding: state/city/suburb is tighter than the pre-refinement formula, without ever going slack", () => {
  // Checkpoint C refinement (item 6) right-sized *state-level* padding to
  // the real chrome footprint it clears — regression guard against it
  // silently growing back to the old, oversized `height * 0.24` top /
  // `* 0.09` side/bottom formula, which was the main cause of wide states
  // like WA appearing more zoomed-out than their geometry needed.
  const viewport = { width: 400, height: 371 };
  const padding = resolveCameraPadding(viewport, "state");
  assert.ok(padding.top < viewport.height * 0.24);
  assert.ok(padding.left < viewport.width * 0.09);
  assert.ok(padding.bottom < viewport.height * 0.09);
  // Still comfortably clears GlowResetControl's 28px (`h-7 w-7`) circle
  // sitting inside the chrome row's own 12px (`pt-3`) top offset.
  assert.ok(padding.top >= 28 + 12);
});

test("resolveCameraPadding: country keeps its own, more generous margins — unaffected by the state-level tightening", () => {
  // GlowMapBadges.tsx's NATIONAL_LABEL_OFFSET nudges all 8 state/territory
  // badges by fixed CSS pixels off their real geographic anchors, tuned
  // and screenshot-verified against country's original (looser) zoom —
  // tightening this the same way as state/city/suburb pushes NSW/ACT past
  // the card's right edge and Tasmania's badge off the bottom (regression
  // caught by this refinement's own screenshot QA). Country must stay
  // exactly the original formula.
  const viewport = { width: 390, height: 362 };
  const country = resolveCameraPadding(viewport, "country");
  const state = resolveCameraPadding(viewport, "state");
  assert.ok(country.top > state.top);
  assert.ok(country.left > state.left);
  assert.ok(country.bottom > state.bottom);
  assert.deepEqual(country, {
    top: clampForTest(viewport.height * 0.24, 52, 130),
    bottom: clampForTest(viewport.height * 0.09, 14, 56),
    left: clampForTest(viewport.width * 0.09, 14, 64),
    right: clampForTest(viewport.width * 0.09, 14, 64),
  });
});

function clampForTest(value: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, value));
}

test("resolveCameraPadding: top padding clears breadcrumb/back chrome more than the sides", () => {
  const padding = resolveCameraPadding({ width: 400, height: 400 });
  assert.ok(padding.top > padding.left);
  assert.ok(padding.top > padding.bottom);
});

test("resolveCameraPadding: degenerate (zero) viewport still returns valid, positive padding", () => {
  const padding = resolveCameraPadding({ width: 0, height: 0 });
  assert.ok(padding.top > 0 && padding.left > 0 && padding.bottom > 0 && padding.right > 0);
});

test("resolveCameraTarget: reduced motion collapses duration to 0", () => {
  const withMotion = resolveCameraTarget(
    { level: "state", code: "VIC" },
    { viewport: { width: 400, height: 400 }, reducedMotion: false },
  );
  const reduced = resolveCameraTarget(
    { level: "state", code: "VIC" },
    { viewport: { width: 400, height: 400 }, reducedMotion: true },
  );
  assert.equal(withMotion.durationMs, CAMERA_DURATION_MS);
  assert.equal(reduced.durationMs, 0);
  // Bounds/padding/zoom are identical either way — only motion changes.
  assert.deepEqual(withMotion.bounds, reduced.bounds);
  assert.deepEqual(withMotion.padding, reduced.padding);
  assert.equal(withMotion.maxZoom, reduced.maxZoom);
});

test("resolveCameraTarget: applies the documented per-level max zoom clamp", () => {
  for (const level of ["country", "state", "city", "suburb"] as const) {
    const input =
      level === "country"
        ? { level: "country" as const }
        : level === "state"
          ? { level: "state" as const, code: "TAS" as const }
          : { level, geo: { lat: -37, lng: 145 } };
    const target = resolveCameraTarget(input, {
      viewport: { width: 400, height: 500 },
      reducedMotion: false,
    });
    assert.equal(target.maxZoom, LEVEL_MAX_ZOOM[level]);
    assert.ok(target.maxZoom <= GLOBAL_MAX_ZOOM);
    assert.ok(target.maxZoom >= GLOBAL_MIN_ZOOM);
  }
});

test("resolveMaxBounds: comfortably contains the real national bbox", () => {
  const maxBounds = resolveMaxBounds();
  assert.ok(maxBounds.west < AUSTRALIA_BOUNDS.west);
  assert.ok(maxBounds.east > AUSTRALIA_BOUNDS.east);
  assert.ok(maxBounds.south < AUSTRALIA_BOUNDS.south);
  assert.ok(maxBounds.north > AUSTRALIA_BOUNDS.north);
});

test("LEVEL_MAX_ZOOM zooms in more the deeper the level goes", () => {
  assert.ok(LEVEL_MAX_ZOOM.country < LEVEL_MAX_ZOOM.state);
  assert.ok(LEVEL_MAX_ZOOM.state < LEVEL_MAX_ZOOM.city);
  assert.ok(LEVEL_MAX_ZOOM.city < LEVEL_MAX_ZOOM.suburb);
});
