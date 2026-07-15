import type {
  AtlasCity,
  AuStateCode,
  DisplayOffset,
  FocusBounds,
  GeoPoint,
} from "../types.ts";
import { resolveDisplayAnchor } from "../utils/projection.ts";

/**
 * City hierarchy for Glow Atlas.
 *
 * `geo` is the geographic source of truth (the real populated-place
 * coordinate). `x`/`y` are always derived from it via `resolveDisplayAnchor`.
 * A handful of cities sit right at a state border in real life (or right at
 * the QLD/NSW coastal seam in this simplified linear projection); those
 * carry a small, documented `displayOffset` so they render clearly inside
 * their own state rather than exactly on — or just past — the boundary line.
 *
 * `weight`/`spread`/`focus.scale` remain hand-authored UX values.
 * `featured`/`featuredPriority` drive disclosure preference (see
 * `utils/disclosure.ts`) — this replaces the old VIC-only allowlist with a
 * data-driven mechanism any state can use.
 */
type CityInput = {
  id: string;
  name: string;
  state: AuStateCode;
  geo: GeoPoint;
  displayOffset?: DisplayOffset;
  awakeCount: number;
  weight: number;
  spread: number;
  focusScale: number;
  featured?: boolean;
  featuredPriority?: number;
};

function defineCity(input: CityInput): AtlasCity {
  const anchor = resolveDisplayAnchor(input.geo, input.displayOffset);
  const focus: FocusBounds = {
    cx: anchor.x,
    cy: anchor.y,
    scale: input.focusScale,
  };
  return {
    id: input.id,
    name: input.name,
    state: input.state,
    geo: input.geo,
    displayOffset: input.displayOffset,
    x: anchor.x,
    y: anchor.y,
    focus,
    awakeCount: input.awakeCount,
    weight: input.weight,
    spread: input.spread,
    featured: input.featured,
    featuredPriority: input.featuredPriority,
  };
}

function qldNswSeamOffset(cityName: string, dy = -1.5): DisplayOffset {
  return {
    dx: 0,
    dy,
    reason: `${cityName} sits close to the QLD/NSW border; the linear projection lands right at (or past) the seam between the two SVG shapes — nudged north to render clearly within Queensland.`,
  };
}

export const atlasCities: AtlasCity[] = [
  // —— Victoria —— (featured set preserved from the original curated allowlist)
  defineCity({
    id: "melbourne",
    name: "Melbourne",
    state: "VIC",
    geo: { lat: -37.8136, lng: 144.9631 },
    awakeCount: 183,
    weight: 100,
    spread: 1.8,
    focusScale: 9.5,
    featured: true,
    featuredPriority: 1,
  }),
  defineCity({
    id: "geelong",
    name: "Geelong",
    state: "VIC",
    geo: { lat: -38.1499, lng: 144.3617 },
    awakeCount: 26,
    weight: 12,
    spread: 0.9,
    focusScale: 11,
    featured: true,
    featuredPriority: 2,
  }),
  defineCity({
    id: "ballarat",
    name: "Ballarat",
    state: "VIC",
    geo: { lat: -37.5622, lng: 143.8503 },
    awakeCount: 18,
    weight: 8,
    spread: 0.8,
    focusScale: 11,
    featured: true,
    featuredPriority: 4,
  }),
  defineCity({
    id: "bendigo",
    name: "Bendigo",
    state: "VIC",
    geo: { lat: -36.757, lng: 144.2794 },
    awakeCount: 16,
    weight: 7,
    spread: 0.8,
    focusScale: 11,
    featured: true,
    featuredPriority: 3,
  }),
  defineCity({
    id: "shepparton",
    name: "Shepparton",
    state: "VIC",
    geo: { lat: -36.3833, lng: 145.4 },
    awakeCount: 12,
    weight: 5,
    spread: 0.7,
    focusScale: 11,
  }),
  defineCity({
    id: "mildura",
    name: "Mildura",
    state: "VIC",
    geo: { lat: -34.208, lng: 142.1246 },
    displayOffset: {
      dx: 0.5,
      dy: 1.2,
      reason:
        "Mildura sits near the VIC/NSW/SA tri-border; nudged slightly south to render clearly within Victoria rather than on the seam.",
    },
    awakeCount: 9,
    weight: 4,
    spread: 0.7,
    focusScale: 11,
    featured: true,
    featuredPriority: 5,
  }),
  defineCity({
    id: "warrnambool",
    name: "Warrnambool",
    state: "VIC",
    geo: { lat: -38.3818, lng: 142.4864 },
    awakeCount: 8,
    weight: 3,
    spread: 0.6,
    focusScale: 11,
  }),
  defineCity({
    id: "latrobe",
    name: "Latrobe Valley",
    state: "VIC",
    // Traralgon, the largest town in the Latrobe Valley
    geo: { lat: -38.1953, lng: 146.5433 },
    awakeCount: 11,
    weight: 4,
    spread: 0.7,
    focusScale: 11,
  }),

  // —— NSW ——
  defineCity({
    id: "sydney",
    name: "Sydney",
    state: "NSW",
    geo: { lat: -33.8688, lng: 151.2093 },
    awakeCount: 420,
    weight: 100,
    spread: 2.0,
    focusScale: 9,
    featured: true,
    featuredPriority: 1,
  }),
  defineCity({
    id: "newcastle",
    name: "Newcastle",
    state: "NSW",
    geo: { lat: -32.9283, lng: 151.7817 },
    awakeCount: 48,
    weight: 14,
    spread: 1.0,
    focusScale: 10,
    featured: true,
    featuredPriority: 2,
  }),
  defineCity({
    id: "wollongong",
    name: "Wollongong",
    state: "NSW",
    geo: { lat: -34.4278, lng: 150.8931 },
    awakeCount: 32,
    weight: 10,
    spread: 0.9,
    focusScale: 10,
    featured: true,
    featuredPriority: 3,
  }),
  defineCity({
    id: "albury",
    name: "Albury",
    state: "NSW",
    geo: { lat: -36.0737, lng: 146.9135 },
    displayOffset: {
      dx: 0,
      dy: -1.0,
      reason:
        "Albury sits directly on the NSW/VIC border (the Murray River); nudged north to render clearly within New South Wales.",
    },
    awakeCount: 14,
    weight: 4,
    spread: 0.7,
    focusScale: 11,
  }),
  defineCity({
    id: "wagga",
    name: "Wagga Wagga",
    state: "NSW",
    geo: { lat: -35.1082, lng: 147.3598 },
    awakeCount: 11,
    weight: 3,
    spread: 0.7,
    focusScale: 11,
  }),

  // —— QLD ——
  defineCity({
    id: "brisbane",
    name: "Brisbane",
    state: "QLD",
    geo: { lat: -27.4698, lng: 153.0251 },
    displayOffset: qldNswSeamOffset("Brisbane"),
    awakeCount: 210,
    weight: 70,
    spread: 1.8,
    focusScale: 8.5,
    featured: true,
    featuredPriority: 1,
  }),
  defineCity({
    id: "gold-coast",
    name: "Gold Coast",
    state: "QLD",
    geo: { lat: -28.0167, lng: 153.4 },
    displayOffset: qldNswSeamOffset("Gold Coast", -3.0),
    awakeCount: 72,
    weight: 22,
    spread: 1.2,
    focusScale: 10,
    featured: true,
    featuredPriority: 2,
  }),
  defineCity({
    id: "sunshine-coast",
    name: "Sunshine Coast",
    state: "QLD",
    geo: { lat: -26.65, lng: 153.0667 },
    awakeCount: 38,
    weight: 12,
    spread: 1.0,
    focusScale: 10,
    featured: true,
    featuredPriority: 3,
  }),
  defineCity({
    id: "townsville",
    name: "Townsville",
    state: "QLD",
    geo: { lat: -19.259, lng: 146.8169 },
    awakeCount: 22,
    weight: 6,
    spread: 0.9,
    focusScale: 10,
  }),
  defineCity({
    id: "cairns",
    name: "Cairns",
    state: "QLD",
    geo: { lat: -16.9186, lng: 145.7781 },
    awakeCount: 18,
    weight: 5,
    spread: 0.8,
    focusScale: 10,
  }),
  defineCity({
    id: "toowoomba",
    name: "Toowoomba",
    state: "QLD",
    geo: { lat: -27.5598, lng: 151.9507 },
    displayOffset: qldNswSeamOffset("Toowoomba"),
    awakeCount: 16,
    weight: 5,
    spread: 0.8,
    focusScale: 10,
  }),

  // —— WA ——
  defineCity({
    id: "perth",
    name: "Perth",
    state: "WA",
    geo: { lat: -31.9505, lng: 115.8605 },
    awakeCount: 128,
    weight: 40,
    spread: 1.6,
    focusScale: 8,
    featured: true,
    featuredPriority: 1,
  }),
  defineCity({
    id: "bunbury",
    name: "Bunbury",
    state: "WA",
    geo: { lat: -33.3267, lng: 115.6372 },
    awakeCount: 12,
    weight: 4,
    spread: 0.7,
    focusScale: 11,
    featured: true,
    featuredPriority: 2,
  }),
  defineCity({
    id: "geraldton",
    name: "Geraldton",
    state: "WA",
    geo: { lat: -28.7774, lng: 114.615 },
    awakeCount: 8,
    weight: 2,
    spread: 0.6,
    focusScale: 11,
  }),

  // —— SA ——
  defineCity({
    id: "adelaide",
    name: "Adelaide",
    state: "SA",
    geo: { lat: -34.9285, lng: 138.6007 },
    awakeCount: 78,
    weight: 30,
    spread: 1.4,
    focusScale: 9,
    featured: true,
    featuredPriority: 1,
  }),
  defineCity({
    id: "mount-gambier",
    name: "Mount Gambier",
    state: "SA",
    geo: { lat: -37.8284, lng: 140.7828 },
    displayOffset: {
      dx: 0,
      dy: -2.0,
      reason:
        "Mount Gambier sits close to the SA/VIC border; nudged north to render clearly within South Australia.",
    },
    awakeCount: 7,
    weight: 2,
    spread: 0.6,
    focusScale: 11,
    featured: true,
    featuredPriority: 2,
  }),

  // —— TAS ——
  defineCity({
    id: "hobart",
    name: "Hobart",
    state: "TAS",
    geo: { lat: -42.8821, lng: 147.3272 },
    awakeCount: 24,
    weight: 10,
    spread: 0.9,
    focusScale: 12,
    featured: true,
    featuredPriority: 1,
  }),
  defineCity({
    id: "launceston",
    name: "Launceston",
    state: "TAS",
    geo: { lat: -41.4332, lng: 147.1441 },
    awakeCount: 12,
    weight: 5,
    spread: 0.7,
    focusScale: 12,
    featured: true,
    featuredPriority: 2,
  }),

  // —— NT ——
  defineCity({
    id: "darwin",
    name: "Darwin",
    state: "NT",
    geo: { lat: -12.4634, lng: 130.8456 },
    awakeCount: 18,
    weight: 6,
    spread: 0.9,
    focusScale: 10,
    featured: true,
    featuredPriority: 1,
  }),
  defineCity({
    id: "alice-springs",
    name: "Alice Springs",
    state: "NT",
    geo: { lat: -23.698, lng: 133.8807 },
    awakeCount: 6,
    weight: 2,
    spread: 0.6,
    focusScale: 10,
    featured: true,
    featuredPriority: 2,
  }),

  // —— ACT ——
  defineCity({
    id: "canberra",
    name: "Canberra",
    state: "ACT",
    geo: { lat: -35.2809, lng: 149.13 },
    displayOffset: {
      dx: -0.5,
      dy: -2.5,
      reason:
        "ACT's SVG shape is only a few units wide; raw projection falls just outside it — nudged onto the visible territory (matches the ACT state anchor offset).",
    },
    awakeCount: 30,
    weight: 14,
    spread: 1.0,
    focusScale: 12,
    featured: true,
    featuredPriority: 1,
  }),
];

export function getCitiesForState(state: AuStateCode): AtlasCity[] {
  return atlasCities.filter((c) => c.state === state);
}

export function getCity(id: string): AtlasCity | undefined {
  return atlasCities.find((c) => c.id === id);
}
