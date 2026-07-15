import type {
  AtlasState,
  AuStateCode,
  DisplayOffset,
  FocusBounds,
  GeoPoint,
} from "../types.ts";
import { resolveDisplayAnchor } from "../utils/projection.ts";

/**
 * State anchors + zoom focus for Glow Atlas.
 *
 * `geo` is the geographic source of truth for every state — an approximate
 * landmass centroid (not the capital city), so the badge sits centrally
 * within the state's own SVG shape rather than at one corner of it.
 * `x`/`y` (% of the permanent viewBox) are always derived from `geo` via
 * `resolveDisplayAnchor`, with any `displayOffset` documented inline.
 *
 * `focus.scale` is a hand-authored UX value (how tightly the map zooms into
 * this state) — it is not, and should not be, derived from geography.
 * `focus.cx/cy` default to the derived anchor; pass `focusCenterOffset` only
 * when the zoom needs to recentre for badge comfort (documented per case).
 */
type StateInput = {
  code: AuStateCode;
  name: string;
  geo: GeoPoint;
  displayOffset?: DisplayOffset;
  focusScale: number;
  focusCenterOffset?: DisplayOffset;
  awakeCount: number;
};

function defineState(input: StateInput): AtlasState {
  const anchor = resolveDisplayAnchor(input.geo, input.displayOffset);
  const focusCenter = input.focusCenterOffset
    ? resolveDisplayAnchor(input.geo, {
        dx: (input.displayOffset?.dx ?? 0) + input.focusCenterOffset.dx,
        dy: (input.displayOffset?.dy ?? 0) + input.focusCenterOffset.dy,
        reason: input.focusCenterOffset.reason,
      })
    : anchor;

  return {
    code: input.code,
    name: input.name,
    geo: input.geo,
    displayOffset: input.displayOffset,
    x: anchor.x,
    y: anchor.y,
    focus: { cx: focusCenter.x, cy: focusCenter.y, scale: input.focusScale },
    awakeCount: input.awakeCount,
  };
}

export const atlasStates: AtlasState[] = [
  defineState({
    code: "WA",
    name: "Western Australia",
    // Approximate landmass centroid (remote Gibson Desert region)
    geo: { lat: -25.3, lng: 122.5 },
    focusScale: 2.1,
    awakeCount: 165,
  }),
  defineState({
    code: "NT",
    name: "Northern Territory",
    // Approximate landmass centroid (near Tennant Creek)
    geo: { lat: -19.6, lng: 133.4 },
    focusScale: 2.3,
    awakeCount: 28,
  }),
  defineState({
    code: "QLD",
    name: "Queensland",
    // Approximate landmass centroid (central west, near Winton/Longreach)
    geo: { lat: -22.5, lng: 144.0 },
    focusScale: 2.0,
    awakeCount: 402,
  }),
  defineState({
    code: "SA",
    name: "South Australia",
    // Approximate landmass centroid
    geo: { lat: -30.5, lng: 136.0 },
    focusScale: 2.4,
    awakeCount: 94,
  }),
  defineState({
    code: "NSW",
    name: "New South Wales",
    // Approximate landmass centroid
    geo: { lat: -32.2, lng: 146.9 },
    focusScale: 2.8,
    awakeCount: 684,
  }),
  defineState({
    code: "ACT",
    name: "Australian Capital Territory",
    // Canberra area — ACT's own landmass is only a few SVG units in this
    // simplified map, so the raw linear-projected centroid falls just south
    // of the visible shape. Nudged onto the drawn territory for legibility.
    geo: { lat: -35.5, lng: 149.05 },
    displayOffset: {
      dx: -0.5,
      dy: -2.5,
      reason:
        "ACT's SVG shape is only a few units wide; raw projection falls just outside it — nudged onto the visible territory.",
    },
    focusScale: 4.5,
    awakeCount: 30,
  }),
  defineState({
    code: "VIC",
    name: "Victoria",
    // Approximate landmass centroid (near Navarre/St Arnaud)
    geo: { lat: -36.85, lng: 144.2 },
    focusScale: 3.15,
    focusCenterOffset: {
      dx: -0.5,
      dy: -1.0,
      reason: "Softer zoom centre so VIC city badges stay comfortably inside the card.",
    },
    awakeCount: 531,
  }),
  defineState({
    code: "TAS",
    name: "Tasmania",
    // Approximate landmass centroid (central highlands)
    geo: { lat: -41.9, lng: 146.6 },
    focusScale: 3.8,
    focusCenterOffset: {
      dx: 0,
      dy: -1.5,
      reason: "Centre the zoom slightly north of the geographic centroid so the small island isn't card-edge clipped.",
    },
    awakeCount: 42,
  }),
];

export const atlasStatesByCode: Record<AuStateCode, AtlasState> =
  Object.fromEntries(atlasStates.map((s) => [s.code, s])) as Record<
    AuStateCode,
    AtlasState
  >;

export function getState(code: AuStateCode): AtlasState {
  return atlasStatesByCode[code];
}
