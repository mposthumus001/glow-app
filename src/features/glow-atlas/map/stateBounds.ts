/**
 * Pure geographic bounding-box helpers derived from the authoritative
 * `australia-states.geojson` (see ../data/geo/). No MapLibre import here —
 * `camera.ts` consumes these bboxes to build `fitBounds` targets, and this
 * module is node-testable on its own (see stateBounds.test.ts).
 */

import { AUSTRALIA_STATES_GEOJSON } from "../data/geo/australiaStatesGeoJson.ts";
import type { AuStateCode } from "../types.ts";

export type Bbox = {
  west: number;
  south: number;
  east: number;
  north: number;
};

type Ring = number[][];
type Polygon = Ring[];
type MultiPolygonCoords = Polygon[];

function extendBbox(bbox: Bbox | null, lng: number, lat: number): Bbox {
  if (!bbox) return { west: lng, east: lng, south: lat, north: lat };
  return {
    west: Math.min(bbox.west, lng),
    east: Math.max(bbox.east, lng),
    south: Math.min(bbox.south, lat),
    north: Math.max(bbox.north, lat),
  };
}

function bboxFromPolygon(polygon: Polygon): Bbox {
  let bbox: Bbox | null = null;
  for (const ring of polygon) {
    for (const [lng, lat] of ring) {
      bbox = extendBbox(bbox, lng, lat);
    }
  }
  if (!bbox) {
    throw new Error("bboxFromPolygon: polygon has no coordinates");
  }
  return bbox;
}

function bboxFromMultiPolygon(coords: MultiPolygonCoords): Bbox {
  let bbox: Bbox | null = null;
  for (const polygon of coords) {
    for (const ring of polygon) {
      for (const [lng, lat] of ring) {
        bbox = extendBbox(bbox, lng, lat);
      }
    }
  }
  if (!bbox) {
    throw new Error("bboxFromMultiPolygon: geometry has no coordinates");
  }
  return bbox;
}

function unionBbox(boxes: Bbox[]): Bbox {
  if (boxes.length === 0) {
    throw new Error("unionBbox: at least one bbox is required");
  }
  return boxes.reduce((acc, b) => unionTwoBbox(acc, b));
}

function unionTwoBbox(a: Bbox, b: Bbox): Bbox {
  return {
    west: Math.min(a.west, b.west),
    east: Math.max(a.east, b.east),
    south: Math.min(a.south, b.south),
    north: Math.max(a.north, b.north),
  };
}

function bboxWidth(b: Bbox): number {
  return b.east - b.west;
}

function bboxHeight(b: Bbox): number {
  return b.north - b.south;
}

function bboxMaxDimension(b: Bbox): number {
  return Math.max(bboxWidth(b), bboxHeight(b));
}

/**
 * Rectangle "gap" distance between two bboxes — 0 whenever they touch or
 * overlap in either axis, otherwise the straight-line distance between
 * their nearest edges/corners. Cheap and deterministic; exact enough to
 * *rank* nearby vs. remote polygons at country/state scale (this is not
 * survey-grade geodesic distance).
 */
function bboxGap(a: Bbox, b: Bbox): number {
  const dx = Math.max(0, Math.max(a.west, b.west) - Math.min(a.east, b.east));
  const dy = Math.max(0, Math.max(a.south, b.south) - Math.min(a.north, b.north));
  return Math.sqrt(dx * dx + dy * dy);
}

/** Shoelace formula — only used to *rank* polygons by area, not for survey-grade area. */
function ringAreaUnsigned(ring: Ring): number {
  let sum = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[i + 1];
    sum += x1 * y2 - x2 * y1;
  }
  return Math.abs(sum) / 2;
}

function indexOfLargestArea(coords: MultiPolygonCoords): number {
  let bestIdx = 0;
  let bestArea = ringAreaUnsigned(coords[0][0]);
  for (let i = 1; i < coords.length; i++) {
    const area = ringAreaUnsigned(coords[i][0]);
    if (area > bestArea) {
      bestIdx = i;
      bestArea = area;
    }
  }
  return bestIdx;
}

/**
 * A polygon is folded into the camera bbox once its gap to the *current*
 * camera union is no more than this fraction of that union's own largest
 * dimension. One global, geometry-relative rule — never a per-state
 * exception — that separates "legitimate nearby island" from "remote
 * administrative exclave" by how much it would bloat the region's own
 * framing, not by a fixed distance:
 *  - ACT's federal Jervis Bay Territory sits ~1.2° from the ACT mainland,
 *    ~157% of the mainland's own largest dimension (~0.77°) — excluded.
 *  - Tasmania's King/Flinders Islands sit ~0.4-0.75° from mainland
 *    Tasmania, only ~11-20% of Tasmania's own largest dimension (~3.7°) —
 *    included.
 *  - Queensland's Torres Strait islets sit ~0.45-0.53° from the QLD
 *    mainland, ~2-3% of QLD's own largest dimension (~18°) — included.
 * See stateBounds.test.ts for the exact numbers.
 */
export const CAMERA_ISLAND_PROXIMITY_RATIO = 0.5;

/**
 * Geometry-aware camera bbox for one feature's `MultiPolygon`: start from
 * the single largest-area polygon (the region's principal landmass) as an
 * anchor, then repeatedly fold in any other polygon within
 * `CAMERA_ISLAND_PROXIMITY_RATIO` of the *current* union's own size —
 * re-checking every pass as the union grows, until nothing more qualifies.
 * This is a fixed point: the polygons folded in (and the final bbox) don't
 * depend on iteration order, only on real geometry/proximity (Amendment 2)
 * — never a hand-tuned per-state exception.
 */
function cameraBboxFromMultiPolygon(coords: MultiPolygonCoords): Bbox {
  const polygonBounds = coords.map((polygon) => bboxFromPolygon(polygon));
  const anchorIdx = indexOfLargestArea(coords);
  const included = new Set<number>([anchorIdx]);
  let union = polygonBounds[anchorIdx];

  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < polygonBounds.length; i++) {
      if (included.has(i)) continue;
      const threshold = CAMERA_ISLAND_PROXIMITY_RATIO * bboxMaxDimension(union);
      if (bboxGap(union, polygonBounds[i]) <= threshold) {
        included.add(i);
        union = unionTwoBbox(union, polygonBounds[i]);
        changed = true;
      }
    }
  }

  return union;
}

/** Full geographic bbox per state/territory — every polygon, including exclaves/islands. */
export const STATE_BOUNDS: Record<AuStateCode, Bbox> = Object.fromEntries(
  AUSTRALIA_STATES_GEOJSON.features.map((feature) => [
    feature.properties.code,
    bboxFromMultiPolygon(feature.geometry.coordinates),
  ]),
) as Record<AuStateCode, Bbox>;

/**
 * Camera-framing bbox per state/territory — the principal landmass plus
 * every polygon within proximity-relative reach of it (see
 * `cameraBboxFromMultiPolygon`). Excludes only remote exclaves that would
 * bloat the framing disproportionately (currently: ACT's Jervis Bay
 * Territory). Includes legitimate nearby islands (e.g. Tasmania's King and
 * Flinders Islands, Queensland's Torres Strait islets).
 */
export const STATE_CAMERA_BOUNDS: Record<AuStateCode, Bbox> = Object.fromEntries(
  AUSTRALIA_STATES_GEOJSON.features.map((feature) => [
    feature.properties.code,
    cameraBboxFromMultiPolygon(feature.geometry.coordinates),
  ]),
) as Record<AuStateCode, Bbox>;

/**
 * National bbox — union of every state/territory's *full* geometry (all
 * islands/exclaves included), so "Australia"/Reset always frames the whole
 * country, not just the mainland states.
 */
export const AUSTRALIA_BOUNDS: Bbox = unionBbox(Object.values(STATE_BOUNDS));

export function getStateBounds(code: AuStateCode): Bbox {
  return STATE_BOUNDS[code];
}

export function getStateCameraBounds(code: AuStateCode): Bbox {
  return STATE_CAMERA_BOUNDS[code];
}
