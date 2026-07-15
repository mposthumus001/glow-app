import type { FocusBounds } from "../types";
import { clamp, type PercentPoint } from "./projection";

export const ATLAS_ZOOM_MS = 700;
export const ATLAS_EASE = "easeInOut" as const;

/** Safe inset (%) so badges never kiss the card edge */
export const OVERLAY_SAFE_INSET = 10;

/**
 * Extra top margin (%) so badges never sit under the breadcrumb / back
 * button chrome row, which lives outside the map's own coordinate space.
 */
export const OVERLAY_TOP_CHROME_INSET = 16;

/**
 * Zoom into a focus point by scaling around that origin.
 *
 * Checkpoint E: the old SVG `BaseMapLayer`/`GlowLightLayer`/`OverlayLayer`
 * renderers that originally motivated this module are retired — the
 * MapLibre map (`map/GlowMap.tsx`) positions everything from real geographic
 * coordinates instead. This file is kept because two *other*, still-live
 * pieces genuinely depend on it:
 *  - `useGlowAtlas.ts`'s city/suburb disclosure still runs
 *    `applyViewportCollision` against `projectOverlayPoint`'s SVG-% space to
 *    decide *which* badges get promoted to interactive vs demoted to
 *    `lightOnly` (the resulting `x`/`y` themselves are unused for on-map
 *    position now, but the collision-based keep/reject decision still
 *    shapes `cityBadges`/`suburbBadges`).
 *  - `GlowBadge.tsx` (shared/reusable) still supports a `positioned` prop
 *    for percentage-based placement, and uses `zoomTransitionFor` for that
 *    mode's motion timing — no current caller passes `positioned`, but the
 *    component's public API is intentionally not narrowed just because
 *    today's only caller (`GlowMapBadges.tsx`) doesn't need it.
 */
export function focusToTransform(focus: FocusBounds): {
  scale: number;
  originX: number;
  originY: number;
} {
  return {
    scale: focus.scale,
    originX: focus.cx,
    originY: focus.cy,
  };
}

export const zoomTransition = {
  duration: ATLAS_ZOOM_MS / 1000,
  ease: ATLAS_EASE,
} as const;

/**
 * Zoom/level-position tween, or a near-instant cut when the user prefers
 * reduced motion — geography and badges still relocate, they just don't
 * visibly glide there. Use everywhere a scale/left/top animates in step
 * with `focus` changing.
 */
export function zoomTransitionFor(reducedMotion: boolean) {
  return reducedMotion ? { duration: 0.12, ease: "linear" as const } : zoomTransition;
}

/** Dim non-focused geography at deeper levels */
export function dimOpacityForLevel(
  level: "country" | "state" | "city" | "suburb",
): number {
  switch (level) {
    case "country":
      return 1;
    case "state":
      return 0.22;
    case "city":
      return 0.14;
    case "suburb":
      return 0.1;
  }
}

/**
 * Project a map-space % point into the viewport after zoom.
 * Matches CSS transform-origin scale around focus centre.
 */
export function projectMapPoint(
  mapX: number,
  mapY: number,
  focus: FocusBounds,
): PercentPoint {
  return {
    x: focus.cx + (mapX - focus.cx) * focus.scale,
    y: focus.cy + (mapY - focus.cy) * focus.scale,
  };
}

/**
 * Keep overlay anchors inside the card with a safe inset.
 * Points that would overflow are nudged inward. The top inset is larger so
 * badges never render under the breadcrumb / back button row.
 */
export function clampToSafeInset(
  point: PercentPoint,
  inset: number = OVERLAY_SAFE_INSET,
  topInset: number = OVERLAY_TOP_CHROME_INSET,
): PercentPoint {
  return {
    x: clamp(point.x, inset, 100 - inset),
    y: clamp(point.y, topInset, 100 - inset),
  };
}

/** Map → viewport → safe inset (for badges / labels) */
export function projectOverlayPoint(
  mapX: number,
  mapY: number,
  focus: FocusBounds,
  inset: number = OVERLAY_SAFE_INSET,
  topInset: number = OVERLAY_TOP_CHROME_INSET,
): PercentPoint {
  return clampToSafeInset(projectMapPoint(mapX, mapY, focus), inset, topInset);
}

/**
 * Light size multiplier — slight growth with zoom, never huge.
 * At scale 1 → 1; at scale 4 → ~1.35; capped at 1.5.
 */
export function lightSizeFactor(scale: number): number {
  return Math.min(1.5, 1 + Math.log2(Math.max(1, scale)) * 0.25);
}
