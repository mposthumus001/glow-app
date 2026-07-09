import { ATLAS_VIEWBOX } from "../data/australia";

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
 * Future: project map_cluster_public lat/lng → overlay %.
 * Linear fit only — never street-level accuracy.
 */
export function latLngToPercent(lat: number, lng: number): PercentPoint {
  const { west, east, north, south } = AU_GEO_BOUNDS;
  return {
    x: clamp(((lng - west) / (east - west)) * 100, 0, 100),
    y: clamp(((lat - north) / (south - north)) * 100, 0, 100),
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
