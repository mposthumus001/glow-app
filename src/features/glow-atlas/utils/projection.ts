import { ATLAS_VIEWBOX } from "../data/australia.ts";
import type { DisplayOffset, GeoPoint } from "../types.ts";

export type PercentPoint = { x: number; y: number };

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function svgToPercent(svgX: number, svgY: number): PercentPoint {
  return {
    x: ((svgX - ATLAS_VIEWBOX.minX) / ATLAS_VIEWBOX.width) * 100,
    y: ((svgY - ATLAS_VIEWBOX.minY) / ATLAS_VIEWBOX.height) * 100,
  };
}

/** Rough AU geographic bounds matching the permanent SVG */
export const AU_GEO_BOUNDS = {
  west: 112.5,
  east: 154.0,
  north: -10.0,
  south: -44.0,
} as const;

/**
 * Project a real-world coordinate → overlay % using a linear fit calibrated
 * against `AU_GEO_BOUNDS` / `ATLAS_VIEWBOX`. Never street-level accuracy, but
 * this is the geographic source of truth for every Atlas anchor (state, city,
 * suburb) and for map_cluster_public lat/lng.
 */
export function latLngToPercent(lat: number, lng: number): PercentPoint {
  const { west, east, north, south } = AU_GEO_BOUNDS;
  return {
    x: clamp(((lng - west) / (east - west)) * 100, 0, 100),
    y: clamp(((lat - north) / (south - north)) * 100, 0, 100),
  };
}

// `GeoPoint` / `DisplayOffset` are defined once in `../types` (shared with
// AtlasState/City/Suburb) and re-exported here for convenience since this is
// the module that actually resolves them into screen-space percentages.
export type { DisplayOffset, GeoPoint } from "../types.ts";

/**
 * Resolve the final display anchor (% of viewBox) for a geographic point,
 * applying an optional documented display offset on top of the projected
 * geographic position. `geo` is always the source of truth; `offset` is
 * always a visible, reviewable exception.
 */
export function resolveDisplayAnchor(
  geo: GeoPoint,
  offset?: DisplayOffset,
): PercentPoint {
  const base = latLngToPercent(geo.lat, geo.lng);
  if (!offset) return base;
  return {
    x: clamp(base.x + offset.dx, 0, 100),
    y: clamp(base.y + offset.dy, 0, 100),
  };
}

export function seededRandom(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10_000) / 10_000;
}

export function seededGaussian(seed: string): number {
  const u1 = Math.max(1e-6, seededRandom(`${seed}-a`));
  const u2 = seededRandom(`${seed}-b`);
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}
