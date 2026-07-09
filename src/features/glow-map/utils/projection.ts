/**
 * Projection helpers for Glow Map overlays.
 *
 * The Australia SVG never changes. Overlays use percentage of its viewBox.
 * When live clusters arrive (lat/lng), project them here — do not redraw the SVG.
 */

/** Permanent SVG viewBox from AustraliaMapSvg */
export const MAP_VIEWBOX = {
  minX: 6.5,
  minY: 4.8,
  width: 273,
  height: 252.8,
} as const;

/**
 * Approximate geographic bounds matching the Lokal_Profil Australia SVG.
 * Used only when converting future GPS-ish cluster centres → overlay %.
 */
export const AU_GEO_BOUNDS = {
  west: 112.5,
  east: 154.0,
  north: -10.0,
  south: -44.0,
} as const;

export type PercentPoint = { x: number; y: number };

/** Clamp a value into [min, max]. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Convert SVG user units → overlay percentage. */
export function svgToPercent(svgX: number, svgY: number): PercentPoint {
  return {
    x: ((svgX - MAP_VIEWBOX.minX) / MAP_VIEWBOX.width) * 100,
    y: ((svgY - MAP_VIEWBOX.minY) / MAP_VIEWBOX.height) * 100,
  };
}

/**
 * Rough lat/lng → overlay % for future map_cluster_public rows.
 * Linear fit against the permanent SVG — good enough for suburb clusters,
 * never for street-level pins.
 */
export function latLngToPercent(lat: number, lng: number): PercentPoint {
  const { west, east, north, south } = AU_GEO_BOUNDS;
  const x = ((lng - west) / (east - west)) * 100;
  const y = ((lat - north) / (south - north)) * 100;
  return {
    x: clamp(x, 0, 100),
    y: clamp(y, 0, 100),
  };
}

/** Deterministic pseudo-random in [0, 1) from a string seed. */
export function seededRandom(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10_000) / 10_000;
}

/** Box-Muller-ish gaussian using two seeded uniforms. */
export function seededGaussian(seed: string): number {
  const u1 = Math.max(1e-6, seededRandom(`${seed}-a`));
  const u2 = seededRandom(`${seed}-b`);
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}
