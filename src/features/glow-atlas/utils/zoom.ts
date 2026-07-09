import type { FocusBounds } from "../types";
import { clamp, type PercentPoint } from "./projection";

export const ATLAS_ZOOM_MS = 700;
export const ATLAS_EASE = "easeInOut" as const;

/** Safe inset (%) so badges never kiss the card edge */
export const OVERLAY_SAFE_INSET = 10;

/**
 * Zoom into a focus point by scaling around that origin.
 * Used only by BaseMapLayer (SVG) — overlays project separately.
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
 * Points that would overflow are nudged inward.
 */
export function clampToSafeInset(
  point: PercentPoint,
  inset: number = OVERLAY_SAFE_INSET,
): PercentPoint {
  return {
    x: clamp(point.x, inset, 100 - inset),
    y: clamp(point.y, inset, 100 - inset),
  };
}

/** Map → viewport → safe inset (for badges / labels) */
export function projectOverlayPoint(
  mapX: number,
  mapY: number,
  focus: FocusBounds,
  inset: number = OVERLAY_SAFE_INSET,
): PercentPoint {
  return clampToSafeInset(projectMapPoint(mapX, mapY, focus), inset);
}

/**
 * Light size multiplier — slight growth with zoom, never huge.
 * At scale 1 → 1; at scale 4 → ~1.35; capped at 1.5.
 */
export function lightSizeFactor(scale: number): number {
  return Math.min(1.5, 1 + Math.log2(Math.max(1, scale)) * 0.25);
}
