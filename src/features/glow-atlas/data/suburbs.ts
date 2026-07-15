import type {
  AtlasSuburb,
  AuStateCode,
  DisplayOffset,
  FocusBounds,
  GeoPoint,
} from "../types.ts";
import { resolveDisplayAnchor } from "../utils/projection.ts";

/**
 * Suburb clusters — privacy-safe approximate centres only.
 * Melbourne is fully populated for the Level 3 demo drill-down.
 * Other major cities have a starter set for future expansion.
 *
 * `geo` is the real suburb coordinate (source of truth). Suburbs under a
 * city that carries a `displayOffset` (Brisbane, Canberra) inherit the same
 * offset so the whole city cluster shifts together and stays internally
 * consistent — see `cities.ts` for the documented reason.
 */
type SuburbInput = {
  id: string;
  name: string;
  cityId: string;
  state: AuStateCode;
  geo: GeoPoint;
  displayOffset?: DisplayOffset;
  awakeCount: number;
  spread: number;
  focusScale: number;
  featured?: boolean;
  featuredPriority?: number;
};

function defineSuburb(input: SuburbInput): AtlasSuburb {
  const anchor = resolveDisplayAnchor(input.geo, input.displayOffset);
  const focus: FocusBounds = {
    cx: anchor.x,
    cy: anchor.y,
    scale: input.focusScale,
  };
  return {
    id: input.id,
    name: input.name,
    cityId: input.cityId,
    state: input.state,
    geo: input.geo,
    displayOffset: input.displayOffset,
    x: anchor.x,
    y: anchor.y,
    focus,
    awakeCount: input.awakeCount,
    spread: input.spread,
    featured: input.featured,
    featuredPriority: input.featuredPriority,
  };
}

const ACT_OFFSET: DisplayOffset = {
  dx: -0.5,
  dy: -2.5,
  reason:
    "Inherits the Canberra/ACT display offset so Civic and Belconnen shift together with their city anchor.",
};

const BRISBANE_OFFSET: DisplayOffset = {
  dx: 0,
  dy: -1.5,
  reason:
    "Inherits the Brisbane display offset (QLD/NSW seam) so all Brisbane suburbs shift together with their city anchor.",
};

export const atlasSuburbs: AtlasSuburb[] = [
  // —— Melbourne —— (featured set preserved from the original curated allowlist)
  defineSuburb({
    id: "mel-cbd",
    name: "CBD",
    cityId: "melbourne",
    state: "VIC",
    geo: { lat: -37.8136, lng: 144.9631 },
    awakeCount: 42,
    spread: 0.35,
    focusScale: 18,
  }),
  defineSuburb({
    id: "mel-docklands",
    name: "Docklands",
    cityId: "melbourne",
    state: "VIC",
    geo: { lat: -37.8151, lng: 144.9457 },
    awakeCount: 18,
    spread: 0.3,
    focusScale: 18,
  }),
  defineSuburb({
    id: "mel-richmond",
    name: "Richmond",
    cityId: "melbourne",
    state: "VIC",
    geo: { lat: -37.8183, lng: 145.0011 },
    awakeCount: 28,
    spread: 0.32,
    focusScale: 18,
  }),
  defineSuburb({
    id: "mel-footscray",
    name: "Footscray",
    cityId: "melbourne",
    state: "VIC",
    geo: { lat: -37.8006, lng: 144.9004 },
    awakeCount: 22,
    spread: 0.32,
    focusScale: 18,
  }),
  defineSuburb({
    id: "mel-dandenong",
    name: "Dandenong",
    cityId: "melbourne",
    state: "VIC",
    geo: { lat: -37.9877, lng: 145.2151 },
    awakeCount: 31,
    spread: 0.4,
    focusScale: 16,
  }),
  defineSuburb({
    id: "mel-sunshine",
    name: "Sunshine",
    cityId: "melbourne",
    state: "VIC",
    geo: { lat: -37.788, lng: 144.8321 },
    awakeCount: 24,
    spread: 0.35,
    focusScale: 17,
  }),
  defineSuburb({
    id: "mel-clayton",
    name: "Clayton",
    cityId: "melbourne",
    state: "VIC",
    geo: { lat: -37.9151, lng: 145.1147 },
    awakeCount: 26,
    spread: 0.35,
    focusScale: 17,
  }),
  defineSuburb({
    id: "mel-frankston",
    name: "Frankston",
    cityId: "melbourne",
    state: "VIC",
    geo: { lat: -38.1418, lng: 145.1225 },
    awakeCount: 19,
    spread: 0.35,
    focusScale: 16,
    featured: true,
    featuredPriority: 4,
  }),
  defineSuburb({
    id: "mel-box-hill",
    name: "Box Hill",
    cityId: "melbourne",
    state: "VIC",
    geo: { lat: -37.8194, lng: 145.1219 },
    awakeCount: 21,
    spread: 0.32,
    focusScale: 17,
    featured: true,
    featuredPriority: 1,
  }),
  defineSuburb({
    id: "mel-st-kilda",
    name: "St Kilda",
    cityId: "melbourne",
    state: "VIC",
    geo: { lat: -37.8677, lng: 144.9811 },
    awakeCount: 17,
    spread: 0.28,
    focusScale: 18,
    featured: true,
    featuredPriority: 3,
  }),
  defineSuburb({
    id: "mel-brunswick",
    name: "Brunswick",
    cityId: "melbourne",
    state: "VIC",
    geo: { lat: -37.7663, lng: 144.9613 },
    awakeCount: 23,
    spread: 0.3,
    focusScale: 18,
  }),
  defineSuburb({
    id: "mel-preston",
    name: "Preston",
    cityId: "melbourne",
    state: "VIC",
    geo: { lat: -37.7398, lng: 145.0037 },
    awakeCount: 16,
    spread: 0.3,
    focusScale: 18,
    featured: true,
    featuredPriority: 2,
  }),

  // —— Sydney (starter) ——
  defineSuburb({
    id: "syd-cbd",
    name: "CBD",
    cityId: "sydney",
    state: "NSW",
    geo: { lat: -33.8688, lng: 151.2093 },
    awakeCount: 38,
    spread: 0.3,
    focusScale: 18,
  }),
  defineSuburb({
    id: "syd-parramatta",
    name: "Parramatta",
    cityId: "sydney",
    state: "NSW",
    geo: { lat: -33.8151, lng: 151.0011 },
    awakeCount: 34,
    spread: 0.35,
    focusScale: 17,
  }),
  defineSuburb({
    id: "syd-bondi",
    name: "Bondi",
    cityId: "sydney",
    state: "NSW",
    geo: { lat: -33.8915, lng: 151.2767 },
    awakeCount: 22,
    spread: 0.28,
    focusScale: 18,
  }),
  defineSuburb({
    id: "syd-liverpool",
    name: "Liverpool",
    cityId: "sydney",
    state: "NSW",
    geo: { lat: -33.92, lng: 150.9236 },
    awakeCount: 28,
    spread: 0.35,
    focusScale: 17,
  }),
  defineSuburb({
    id: "syd-chatswood",
    name: "Chatswood",
    cityId: "sydney",
    state: "NSW",
    geo: { lat: -33.7969, lng: 151.1817 },
    awakeCount: 19,
    spread: 0.28,
    focusScale: 18,
  }),

  // —— Brisbane (starter) ——
  defineSuburb({
    id: "bne-cbd",
    name: "CBD",
    cityId: "brisbane",
    state: "QLD",
    geo: { lat: -27.4698, lng: 153.0251 },
    displayOffset: BRISBANE_OFFSET,
    awakeCount: 26,
    spread: 0.3,
    focusScale: 17,
  }),
  defineSuburb({
    id: "bne-south-bank",
    name: "South Bank",
    cityId: "brisbane",
    state: "QLD",
    geo: { lat: -27.4759, lng: 153.0189 },
    displayOffset: BRISBANE_OFFSET,
    awakeCount: 14,
    spread: 0.25,
    focusScale: 18,
  }),
  defineSuburb({
    id: "bne-fortitude",
    name: "Fortitude Valley",
    cityId: "brisbane",
    state: "QLD",
    geo: { lat: -27.456, lng: 153.0344 },
    displayOffset: BRISBANE_OFFSET,
    awakeCount: 16,
    spread: 0.25,
    focusScale: 18,
  }),
  defineSuburb({
    id: "bne-chermside",
    name: "Chermside",
    cityId: "brisbane",
    state: "QLD",
    geo: { lat: -27.3856, lng: 153.0306 },
    displayOffset: BRISBANE_OFFSET,
    awakeCount: 18,
    spread: 0.3,
    focusScale: 17,
  }),

  // —— Perth (starter) ——
  defineSuburb({
    id: "per-cbd",
    name: "CBD",
    cityId: "perth",
    state: "WA",
    geo: { lat: -31.9505, lng: 115.8605 },
    awakeCount: 18,
    spread: 0.28,
    focusScale: 16,
  }),
  defineSuburb({
    id: "per-fremantle",
    name: "Fremantle",
    cityId: "perth",
    state: "WA",
    geo: { lat: -32.0569, lng: 115.7439 },
    awakeCount: 12,
    spread: 0.28,
    focusScale: 16,
  }),
  defineSuburb({
    id: "per-joondalup",
    name: "Joondalup",
    cityId: "perth",
    state: "WA",
    geo: { lat: -31.7448, lng: 115.7661 },
    awakeCount: 14,
    spread: 0.3,
    focusScale: 16,
  }),

  // —— Adelaide (starter) ——
  defineSuburb({
    id: "adl-cbd",
    name: "CBD",
    cityId: "adelaide",
    state: "SA",
    geo: { lat: -34.9285, lng: 138.6007 },
    awakeCount: 16,
    spread: 0.28,
    focusScale: 17,
  }),
  defineSuburb({
    id: "adl-glenelg",
    name: "Glenelg",
    cityId: "adelaide",
    state: "SA",
    geo: { lat: -34.9803, lng: 138.5108 },
    awakeCount: 10,
    spread: 0.25,
    focusScale: 17,
  }),

  // —— Canberra ——
  defineSuburb({
    id: "cbr-civic",
    name: "Civic",
    cityId: "canberra",
    state: "ACT",
    geo: { lat: -35.2809, lng: 149.13 },
    displayOffset: ACT_OFFSET,
    awakeCount: 12,
    spread: 0.25,
    focusScale: 20,
  }),
  defineSuburb({
    id: "cbr-belconnen",
    name: "Belconnen",
    cityId: "canberra",
    state: "ACT",
    geo: { lat: -35.2384, lng: 149.0668 },
    displayOffset: ACT_OFFSET,
    awakeCount: 9,
    spread: 0.25,
    focusScale: 20,
  }),
];

export function getSuburbsForCity(cityId: string): AtlasSuburb[] {
  return atlasSuburbs.filter((s) => s.cityId === cityId);
}

export function getSuburb(id: string): AtlasSuburb | undefined {
  return atlasSuburbs.find((s) => s.id === id);
}
