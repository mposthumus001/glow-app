/**
 * Pure camera-target calculation (Amendment 2 — geographic bounds are the
 * source of truth). No MapLibre import here: `GlowMap.tsx` is the only
 * place that turns a `CameraTarget` into an actual `map.fitBounds()` call,
 * which keeps this module fully node-testable (see camera.test.ts).
 *
 * Every target's *position* (`bounds`) always comes from real geography —
 * either a state/territory polygon bbox (`stateBounds.ts`) or, for
 * city/suburb (no polygon dataset exists yet), a bbox synthesized from the
 * catalog's real point coordinate plus a small, documented radius. The only
 * hand-authored numbers here are the padding/zoom-ceiling *UX* constants,
 * which Amendment 2 explicitly allows as declarative tuning — they never
 * substitute for or override a geographic bbox.
 */

import { clamp } from "../utils/projection.ts";
import type { AtlasLevel, AuStateCode, GeoPoint } from "../types.ts";
import { AUSTRALIA_BOUNDS, getStateCameraBounds, type Bbox } from "./stateBounds.ts";

export type { Bbox };

export type CameraPadding = {
  top: number;
  bottom: number;
  left: number;
  right: number;
};

export type CameraViewport = {
  width: number;
  height: number;
};

export type CameraTarget = {
  bounds: Bbox;
  padding: CameraPadding;
  maxZoom: number;
  /** 0 whenever the caller reports `prefers-reduced-motion` (or an equivalent stored preference). */
  durationMs: number;
};

export type CameraSelectionInput =
  | { level: "country" }
  | { level: "state"; code: AuStateCode }
  | { level: "city"; geo: GeoPoint }
  | { level: "suburb"; geo: GeoPoint };

/** Global camera limits — never leave these to per-target tuning. */
export const GLOBAL_MIN_ZOOM = 2.5;
export const GLOBAL_MAX_ZOOM = 15;

/**
 * Declarative per-level zoom ceilings (Amendment 2: documented UX tuning
 * only, never a substitute for real bounds). Stops `fitBounds` from zooming
 * in absurdly tight on a compact polygon or a small synthesized point
 * radius — the *position* is still always the real geographic bbox.
 */
export const LEVEL_MAX_ZOOM: Record<AtlasLevel, number> = {
  country: 5.5,
  state: 9,
  city: 12,
  suburb: 13.5,
};

/** Calm, consistent camera glide for every automated move; 0 under reduced motion. */
export const CAMERA_DURATION_MS = 900;

/** Half-height (°lat) of the synthesized metro-scale bbox used for city selection — no polygon dataset exists for cities. */
export const CITY_BBOX_RADIUS_LAT_DEG = 0.5;
/** Half-height (°lat) of the synthesized suburb-scale bbox used for suburb selection. */
export const SUBURB_BBOX_RADIUS_LAT_DEG = 0.12;

/**
 * A bbox centred on a real point coordinate, sized by a documented latitude
 * radius. Longitude radius is corrected by `cos(lat)` so the box reads as a
 * consistent real-world width at every Australian latitude (~-10 to -44),
 * not a fixed-degree square that looks narrower near the equator.
 */
export function boundsFromPointRadius(geo: GeoPoint, radiusLatDeg: number): Bbox {
  const lngRadius = radiusLatDeg / Math.max(0.35, Math.cos((geo.lat * Math.PI) / 180));
  return {
    west: geo.lng - lngRadius,
    east: geo.lng + lngRadius,
    south: geo.lat - radiusLatDeg,
    north: geo.lat + radiusLatDeg,
  };
}

export function resolveCameraBounds(input: CameraSelectionInput): Bbox {
  switch (input.level) {
    case "country":
      return AUSTRALIA_BOUNDS;
    case "state":
      return getStateCameraBounds(input.code);
    case "city":
      return boundsFromPointRadius(input.geo, CITY_BBOX_RADIUS_LAT_DEG);
    case "suburb":
      return boundsFromPointRadius(input.geo, SUBURB_BBOX_RADIUS_LAT_DEG);
  }
}

/**
 * Responsive `fitBounds` padding (px) so the breadcrumb/back/reset chrome
 * along the top, and the rounded card edge on every side, never overlap
 * the fitted geography. Proportional to the *map container's own* size
 * (not the viewport/window), so it scales correctly whether the map is
 * embedded at 360px mobile width or full desktop width, and should be
 * recomputed whenever that container resizes or the layout breakpoint
 * changes.
 *
 * Checkpoint C refinement (item 6): the previous formula (`height * 0.24`
 * for top, `height/width * 0.09` for bottom/sides) was far larger than the
 * chrome it exists to clear, and — because `fitBounds` picks a single
 * uniform zoom for the whole viewport — that oversized padding was the
 * main reason wide states like WA/NT/SA appeared zoomed out further than
 * their own geometry needed at the *state* level, spilling extra ocean
 * and neighbouring territory into frame on every side. Right-sized to the
 * chrome it actually has to clear instead:
 *  - top: `GlowResetControl`'s own 28px circle (`h-7 w-7`) is the tallest
 *    element in the chrome row, sitting inside `pt-3` (12px) — a fixed
 *    ~54px floor comfortably clears both plus a breathing gap, with a
 *    little extra proportional to height for very tall embeds.
 *  - bottom/sides: no interactive chrome sits here, only the rounded card
 *    edge and the compact `AttributionControl` (bottom-right) — a small
 *    proportional margin is enough.
 * This is a padding-only change: it never crops or repositions the real
 * geographic bbox `fitBounds` receives, only how much empty buffer
 * surrounds it, so every state's *complete* geometry is still always
 * fully visible — see camera.test.ts for the before/after overfill
 * measurements this was tuned against.
 */
function resolveStatePadding(viewport: CameraViewport): CameraPadding {
  const top = clamp(54 + viewport.height * 0.04, 54, 92);
  const side = clamp(viewport.width * 0.045, 10, 32);
  const bottom = clamp(viewport.height * 0.045, 14, 36);
  return { top, bottom, left: side, right: side };
}

/**
 * Country-level padding keeps the *original*, more generous margins
 * (Checkpoint C refinement item 6 only tightened state/city/suburb — see
 * `resolveStatePadding` above). `GlowMapBadges.tsx`'s `NATIONAL_LABEL_OFFSET`
 * nudges all 8 state/territory badges by fixed CSS pixels off their real
 * geographic anchors (NSW/ACT near the eastern edge, Tasmania near the
 * southern edge) — those offsets were tuned and screenshot-verified against
 * this looser country-level zoom. Tightening this padding the same way as
 * `resolveStatePadding` shrinks the margin those fixed offsets rely on and
 * pushes NSW/ACT past the card's right edge and Tasmania's badge off the
 * bottom — so country intentionally keeps its own, separate formula.
 */
function resolveCountryPadding(viewport: CameraViewport): CameraPadding {
  const top = clamp(viewport.height * 0.24, 52, 130);
  const side = clamp(viewport.width * 0.09, 14, 64);
  const bottom = clamp(viewport.height * 0.09, 14, 56);
  return { top, bottom, left: side, right: side };
}

/** `level` selects between the country-wide layout's own margins and the tighter state/city/suburb formula (see the two functions above). */
export function resolveCameraPadding(
  viewport: CameraViewport,
  level: AtlasLevel = "state",
): CameraPadding {
  return level === "country" ? resolveCountryPadding(viewport) : resolveStatePadding(viewport);
}

export function resolveCameraTarget(
  input: CameraSelectionInput,
  options: { viewport: CameraViewport; reducedMotion: boolean },
): CameraTarget {
  return {
    bounds: resolveCameraBounds(input),
    padding: resolveCameraPadding(options.viewport, input.level),
    maxZoom: LEVEL_MAX_ZOOM[input.level],
    durationMs: options.reducedMotion ? 0 : CAMERA_DURATION_MS,
  };
}

/** Comfortable ocean margin added around the real national bbox — not a hand-tuned crop. */
const MAX_BOUNDS_MARGIN_DEG = { lng: 12, lat: 8 };

/**
 * Pan restriction keeping the map within Australia + a comfortable margin
 * (so the coastline never sits flush against the edge of the pannable
 * area). Derived from `AUSTRALIA_BOUNDS`, not hand-picked lat/lng corners.
 */
export function resolveMaxBounds(): Bbox {
  return {
    west: AUSTRALIA_BOUNDS.west - MAX_BOUNDS_MARGIN_DEG.lng,
    east: AUSTRALIA_BOUNDS.east + MAX_BOUNDS_MARGIN_DEG.lng,
    south: AUSTRALIA_BOUNDS.south - MAX_BOUNDS_MARGIN_DEG.lat,
    north: AUSTRALIA_BOUNDS.north + MAX_BOUNDS_MARGIN_DEG.lat,
  };
}
