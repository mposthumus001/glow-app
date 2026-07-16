import type {
  CircleLayerSpecification,
  FillLayerSpecification,
  HeatmapLayerSpecification,
  LineLayerSpecification,
  StyleSpecification,
} from "maplibre-gl";

import { AUSTRALIA_STATES_GEOJSON } from "../data/geo/australiaStatesGeoJson.ts";
import type { AtlasLevel } from "../types.ts";

/**
 * The custom Glow MapLibre style. The local states GeoJSON (see
 * ../data/geo/) is the authoritative, always-rendered basemap — it draws
 * regardless of whether the optional PMTiles context source is configured
 * or loads successfully (see basemapStatus.ts). PMTiles, when present, is
 * inserted *underneath* the Glow layers as supporting geographic context
 * only; it never carries interactive state geometry.
 *
 * Presence (Checkpoint C, Amendment 4) is three separate GeoJSON sources —
 * state/city/suburb — deliberately independent of the basemap/state
 * sources above. They start empty; GlowMap.tsx populates them via
 * `source.setData()` once real `AtlasPresence` is available and on every
 * realtime tick after that (see presenceGeoJson.ts) — never by rebuilding
 * this style object, so a presence update never touches the map/style
 * instance. Each source uses `promoteId` so GlowMap can cheaply mark the
 * current selection via `map.setFeatureState()` for the "selected region"
 * emphasis, again without any source/style rebuild.
 */

export const GLOW_BACKGROUND_LAYER_ID = "glow-background";
export const GLOW_PMTILES_SOURCE_ID = "glow-pmtiles-context";
export const GLOW_PMTILES_CONTEXT_LAYER_ID = "glow-pmtiles-earth";
export const GLOW_STATES_SOURCE_ID = "glow-states";
export const GLOW_STATES_FILL_LAYER_ID = "glow-states-fill";
export const GLOW_STATES_LINE_LAYER_ID = "glow-states-line";

export const GLOW_PRESENCE_STATE_SOURCE_ID = "glow-presence-state";
export const GLOW_PRESENCE_CITY_SOURCE_ID = "glow-presence-city";
export const GLOW_PRESENCE_SUBURB_SOURCE_ID = "glow-presence-suburb";

export const GLOW_PRESENCE_STATE_HALO_LAYER_ID = "glow-presence-state-halo";
export const GLOW_PRESENCE_STATE_CORE_LAYER_ID = "glow-presence-state-core";
export const GLOW_PRESENCE_CITY_HALO_LAYER_ID = "glow-presence-city-halo";
export const GLOW_PRESENCE_CITY_CORE_LAYER_ID = "glow-presence-city-core";
export const GLOW_PRESENCE_SUBURB_HALO_LAYER_ID = "glow-presence-suburb-halo";
export const GLOW_PRESENCE_SUBURB_CORE_LAYER_ID = "glow-presence-suburb-core";

/** Every presence layer id, halo+core, across all three levels — see GlowMap.tsx's level→visibility effect. */
export const GLOW_PRESENCE_LAYER_IDS = [
  GLOW_PRESENCE_STATE_HALO_LAYER_ID,
  GLOW_PRESENCE_STATE_CORE_LAYER_ID,
  GLOW_PRESENCE_CITY_HALO_LAYER_ID,
  GLOW_PRESENCE_CITY_CORE_LAYER_ID,
  GLOW_PRESENCE_SUBURB_HALO_LAYER_ID,
  GLOW_PRESENCE_SUBURB_CORE_LAYER_ID,
] as const;

/**
 * Synthetic Atlas Preview (see syntheticAtlasData.ts). Deliberately *not*
 * baked into `buildGlowMapStyle()` below — the ~5,000-point generation is
 * pure but not free (see docs/GlowAtlas.md's perf notes), and folding it
 * into the initial style would delay the very first paint of the whole map.
 * GlowMap.tsx instead calls `map.addSource()`/`map.addLayer()` for these
 * once, imperatively, right after `mapLoaded`. One GeoJSON source feeds
 * three layers (heatmap + parent halo + parent core) — never duplicated,
 * never clustered, never reduced. Never added to `interactiveLayerIds`,
 * never given a `promoteId`.
 *
 * Paint order (bottom → top, inserted before real presence):
 *   heatmap → synthetic halo → synthetic core → real presence …
 */
export const GLOW_SYNTHETIC_PREVIEW_SOURCE_ID = "glow-synthetic-preview";
export const GLOW_SYNTHETIC_PREVIEW_HEATMAP_LAYER_ID = "glow-synthetic-preview-heatmap";
export const GLOW_SYNTHETIC_PREVIEW_HALO_LAYER_ID = "glow-synthetic-preview-halo";
export const GLOW_SYNTHETIC_PREVIEW_CORE_LAYER_ID = "glow-synthetic-preview-core";

/** Cool lavender/blue atmospheric density — never a warning-map palette. */
const GLOW_SYNTHETIC_HEATMAP_COLOR_STOPS = [
  "rgba(16,20,40,0)",
  "rgba(90,100,190,0.18)",
  "rgba(130,140,220,0.28)",
  "rgba(170,175,235,0.36)",
] as const;

/**
 * Warm lavender-gold for individual simulated parents — dimmer and slightly
 * cooler than genuine live presence (`GLOW_PRESENCE_*` below), so the two
 * never read as the same thing at a glance.
 */
const GLOW_SYNTHETIC_PARENT_HALO_COLOR = "#d4b07a";
const GLOW_SYNTHETIC_PARENT_CORE_COLOR = "#f2e0b8";

/** All synthetic layer ids in paint order (heatmap → halo → core). */
export const GLOW_SYNTHETIC_PREVIEW_LAYER_IDS = [
  GLOW_SYNTHETIC_PREVIEW_HEATMAP_LAYER_ID,
  GLOW_SYNTHETIC_PREVIEW_HALO_LAYER_ID,
  GLOW_SYNTHETIC_PREVIEW_CORE_LAYER_ID,
] as const;

const GLOW_NAVY_BACKGROUND = "#060914";
const GLOW_STATE_FILL = "#b694ff";
const GLOW_STATE_LINE = "#8e9aff";

/** Warm, soft halo — never a hard-edged pin. */
const GLOW_PRESENCE_HALO_COLOR = "#ffb066";
/** Warm, bright core — reads as a small living light, not a numbered bubble. */
const GLOW_PRESENCE_CORE_COLOR = "#fff2d8";

const EMPTY_FEATURE_COLLECTION: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

/**
 * Selected-region emphasis is applied via `feature-state` (set by GlowMap
 * on selection change), not by rebuilding paint properties — a subtle,
 * warm boost, never a jarring highlight, so presence stays the emotional
 * focus (Checkpoint C item 5) rather than the boundary/selection chrome.
 *
 * MapLibre style *expressions* are recursive, deeply-literal tuple types
 * that don't unify well with dynamically-assembled arrays — every
 * expression below is built as a plain, runtime-correct JSON array (the
 * exact shape MapLibre itself parses at runtime) and cast once at the
 * paint object boundary, rather than fought property-by-property.
 */
const SELECTED_FEATURE_STATE = ["boolean", ["feature-state", "selected"], false];

/**
 * Level-aware state fill/line paint (Checkpoint C refinement, item 2) — at
 * country/state the polygon is the primary geographic chrome, but once the
 * camera is inside a single state (city/suburb), that same polygon fills
 * the *entire* viewport behind the presence lights, so its old
 * selected-emphasis opacity (0.16) reads as an ugly, cropped, filled slab
 * rather than context. `[selected, unselected]` per level; city/suburb
 * collapse both to the same near-invisible value — highlighting "the
 * selected state" is meaningless once it already fills the whole screen —
 * leaving only a faint coastline/border line for orientation.
 *
 * GlowMap.tsx applies these via `map.setPaintProperty()` whenever
 * `currentLevel` changes (never a source/style rebuild), the same
 * imperative pattern as the presence layer-visibility toggle.
 */
const STATE_FILL_OPACITY_BY_LEVEL: Record<AtlasLevel, readonly [selected: number, unselected: number]> = {
  country: [0.16, 0.05],
  state: [0.14, 0.05],
  city: [0.025, 0.025],
  suburb: [0.025, 0.025],
};
const STATE_LINE_OPACITY_BY_LEVEL: Record<AtlasLevel, readonly [selected: number, unselected: number]> = {
  country: [0.75, 0.35],
  state: [0.55, 0.3],
  city: [0.28, 0.28],
  suburb: [0.28, 0.28],
};
const STATE_LINE_WIDTH_BY_LEVEL: Record<AtlasLevel, readonly [selected: number, unselected: number]> = {
  country: [1.8, 1],
  state: [1.5, 0.9],
  city: [0.9, 0.9],
  suburb: [0.9, 0.9],
};

function levelPaintExpression(pair: readonly [number, number]): unknown[] {
  return ["case", SELECTED_FEATURE_STATE, pair[0], pair[1]];
}

/** `fill-opacity` expression for `GLOW_STATES_FILL_LAYER_ID` at a given logical level. */
export function stateFillOpacityExpression(level: AtlasLevel): unknown[] {
  return levelPaintExpression(STATE_FILL_OPACITY_BY_LEVEL[level]);
}
/** `line-opacity` expression for `GLOW_STATES_LINE_LAYER_ID` at a given logical level. */
export function stateLineOpacityExpression(level: AtlasLevel): unknown[] {
  return levelPaintExpression(STATE_LINE_OPACITY_BY_LEVEL[level]);
}
/** `line-width` expression for `GLOW_STATES_LINE_LAYER_ID` at a given logical level. */
export function stateLineWidthExpression(level: AtlasLevel): unknown[] {
  return levelPaintExpression(STATE_LINE_WIDTH_BY_LEVEL[level]);
}

/**
 * Count-scaled, zoom-aware radius: intensity (0..1, see presenceGeoJson.ts)
 * gently grows the light at every zoom stop, and the stops themselves keep
 * absolute pixel sizes modest so a very busy area still reads as "busy",
 * never as a giant blob dwarfing the calm basemap underneath — this is the
 * density cap called for in Checkpoint C item 2.
 *
 * MapLibre requires a `["zoom"]` expression to appear only as the direct
 * input to a *top-level* `"step"`/`"interpolate"` — it cannot be nested
 * inside another expression (e.g. wrapped in `["*", ...]`). So the
 * selected-region boost is pushed *into* each interpolation stop's output
 * value instead of wrapping the whole `interpolate` — `["zoom"]` itself
 * stays the untouched top-level input.
 */
function presenceRadiusExpression(
  base: readonly [number, number][],
  intensityWeight: number,
  selectedBoost: number,
): unknown[] {
  const boost = ["case", SELECTED_FEATURE_STATE, selectedBoost, 1];
  const zoomStops = base.flatMap(([zoom, minRadius]) => [
    zoom,
    ["*", boost, ["+", minRadius, ["*", intensityWeight, ["get", "intensity"]]]],
  ]);
  return ["interpolate", ["linear"], ["zoom"], ...zoomStops];
}

function presenceHaloLayer(
  id: string,
  source: string,
  initiallyVisible: boolean,
): CircleLayerSpecification {
  return {
    id,
    type: "circle",
    source,
    layout: { visibility: initiallyVisible ? "visible" : "none" },
    paint: {
      "circle-color": GLOW_PRESENCE_HALO_COLOR,
      "circle-blur": 0.85,
      "circle-opacity": [
        "interpolate",
        ["linear"],
        ["get", "intensity"],
        0,
        0.1,
        1,
        0.28,
      ] as unknown as number,
      // Checkpoint C refinement (item 8): the intensity weight and
      // selected-boost were tuned down from 16/1.2 — at a busy area's max
      // intensity plus the selected-region boost, the halo was reading as
      // an oversized blob rather than a soft, human glow.
      "circle-radius": presenceRadiusExpression(
        [
          [2, 7],
          [6, 10],
          [10, 13],
          [14, 16],
        ],
        10,
        1.12,
      ) as unknown as number,
    },
  };
}

function presenceCoreLayer(
  id: string,
  source: string,
  initiallyVisible: boolean,
): CircleLayerSpecification {
  return {
    id,
    type: "circle",
    source,
    layout: { visibility: initiallyVisible ? "visible" : "none" },
    paint: {
      "circle-color": GLOW_PRESENCE_CORE_COLOR,
      "circle-blur": 0.2,
      "circle-opacity": [
        "interpolate",
        ["linear"],
        ["get", "intensity"],
        0,
        0.55,
        1,
        0.95,
      ] as unknown as number,
      "circle-radius": presenceRadiusExpression(
        [
          [2, 2.5],
          [6, 3.5],
          [10, 4.5],
          [14, 5.5],
        ],
        3,
        1.2,
      ) as unknown as number,
    },
  };
}

/**
 * Atmospheric population-density treatment derived from the same Point
 * features as the individual parent lights — never a replacement for them,
 * never a clustered aggregation. Strongest at country zoom (≈2–4), fades
 * through state zoom (≈5–8), nearly off at city/suburb.
 */
export function syntheticPreviewHeatmapLayer(): HeatmapLayerSpecification {
  return {
    id: GLOW_SYNTHETIC_PREVIEW_HEATMAP_LAYER_ID,
    type: "heatmap",
    source: GLOW_SYNTHETIC_PREVIEW_SOURCE_ID,
    maxzoom: 9,
    paint: {
      "heatmap-color": [
        "interpolate",
        ["linear"],
        ["heatmap-density"],
        0,
        GLOW_SYNTHETIC_HEATMAP_COLOR_STOPS[0],
        0.35,
        GLOW_SYNTHETIC_HEATMAP_COLOR_STOPS[1],
        0.7,
        GLOW_SYNTHETIC_HEATMAP_COLOR_STOPS[2],
        1,
        GLOW_SYNTHETIC_HEATMAP_COLOR_STOPS[3],
      ],
      // Strongest around zoom 2–4; eases off as individual lights take over.
      "heatmap-intensity": [
        "interpolate",
        ["linear"],
        ["zoom"],
        2,
        0.65,
        4,
        0.55,
        6,
        0.28,
        8,
        0.12,
      ] as unknown as number,
      "heatmap-radius": [
        "interpolate",
        ["linear"],
        ["zoom"],
        2,
        12,
        4,
        16,
        6,
        22,
        8,
        28,
      ] as unknown as number,
      // Strongest 2–4 → fades 5–8 → off by ~9.
      "heatmap-opacity": [
        "interpolate",
        ["linear"],
        ["zoom"],
        2,
        0.58,
        4,
        0.5,
        5,
        0.35,
        6.5,
        0.18,
        8,
        0.05,
        9,
        0,
      ] as unknown as number,
    },
  };
}

/**
 * Soft halo behind each simulated parent — one circle per Point feature,
 * no clustering / no feature reduction. Dimmer and cooler than real
 * presence halos.
 *
 * MapLibre requires `["zoom"]` as the *direct* input of a top-level
 * interpolate (see `presenceRadiusExpression` above) — the per-parent
 * `visualVariant` multiplier is therefore folded into each stop's output
 * value, never wrapping the whole interpolate in `["*", ...]`.
 */
export function syntheticPreviewHaloLayer(): CircleLayerSpecification {
  const variantScale = ["+", 0.75, ["*", ["coalesce", ["get", "visualVariant"], 0.5], 0.5]];
  return {
    id: GLOW_SYNTHETIC_PREVIEW_HALO_LAYER_ID,
    type: "circle",
    source: GLOW_SYNTHETIC_PREVIEW_SOURCE_ID,
    paint: {
      "circle-color": GLOW_SYNTHETIC_PARENT_HALO_COLOR,
      "circle-blur": 0.8,
      "circle-opacity": [
        "interpolate",
        ["linear"],
        ["zoom"],
        2,
        ["*", 0.16, variantScale],
        4,
        ["*", 0.22, variantScale],
        6,
        ["*", 0.36, variantScale],
        9,
        ["*", 0.48, variantScale],
        13,
        ["*", 0.55, variantScale],
      ] as unknown as number,
      "circle-radius": [
        "interpolate",
        ["linear"],
        ["zoom"],
        2,
        ["*", 2.6, variantScale],
        4,
        ["*", 4, variantScale],
        6,
        ["*", 6.5, variantScale],
        9,
        ["*", 10, variantScale],
        13,
        ["*", 13, variantScale],
      ] as unknown as number,
    },
  };
}

/**
 * Distinct core for each simulated parent — one circle per Point, always
 * present from country zoom (subtle) through city zoom (clearly individual).
 * Slightly warmer/brighter than the halo, still dimmer than live presence.
 */
export function syntheticPreviewCoreLayer(): CircleLayerSpecification {
  const variantScale = ["+", 0.8, ["*", ["coalesce", ["get", "visualVariant"], 0.5], 0.4]];
  return {
    id: GLOW_SYNTHETIC_PREVIEW_CORE_LAYER_ID,
    type: "circle",
    source: GLOW_SYNTHETIC_PREVIEW_SOURCE_ID,
    paint: {
      "circle-color": GLOW_SYNTHETIC_PARENT_CORE_COLOR,
      "circle-blur": 0.25,
      "circle-opacity": [
        "interpolate",
        ["linear"],
        ["zoom"],
        2,
        ["*", 0.32, variantScale],
        4,
        ["*", 0.45, variantScale],
        6,
        ["*", 0.65, variantScale],
        9,
        ["*", 0.82, variantScale],
        13,
        ["*", 0.9, variantScale],
      ] as unknown as number,
      "circle-radius": [
        "interpolate",
        ["linear"],
        ["zoom"],
        2,
        ["*", 1.25, variantScale],
        4,
        ["*", 1.7, variantScale],
        6,
        ["*", 2.8, variantScale],
        9,
        ["*", 4, variantScale],
        13,
        ["*", 5.5, variantScale],
      ] as unknown as number,
    },
  };
}

export type GlowMapStyleOptions = {
  /** CDN/object-storage PMTiles URL. Omit or leave falsy to skip the context layer entirely. */
  pmtilesUrl?: string | null;
};

/**
 * Builds the Glow MapLibre style. Always includes the local states
 * source/layers; only adds the `pmtiles://` context source + its supporting
 * land/water tint layers when a URL is actually configured. Failure to load
 * that source is handled by the caller (GlowMap) via the map's `error`
 * event — this function never throws for a bad/unreachable URL, it only
 * decides whether to *attempt* including it.
 */
export function buildGlowMapStyle({
  pmtilesUrl,
}: GlowMapStyleOptions = {}): StyleSpecification {
  const hasPmtiles = Boolean(pmtilesUrl && pmtilesUrl.trim());

  const sources: StyleSpecification["sources"] = {
    [GLOW_STATES_SOURCE_ID]: {
      type: "geojson",
      // `promoteId` lets GlowMap use `map.setFeatureState({ id: code }, ...)`
      // for the selected-state emphasis below without any source rebuild.
      promoteId: "code",
      data: AUSTRALIA_STATES_GEOJSON as unknown as GeoJSON.FeatureCollection,
    },
    [GLOW_PRESENCE_STATE_SOURCE_ID]: {
      type: "geojson",
      promoteId: "id",
      data: EMPTY_FEATURE_COLLECTION,
    },
    [GLOW_PRESENCE_CITY_SOURCE_ID]: {
      type: "geojson",
      promoteId: "id",
      data: EMPTY_FEATURE_COLLECTION,
    },
    [GLOW_PRESENCE_SUBURB_SOURCE_ID]: {
      type: "geojson",
      promoteId: "id",
      data: EMPTY_FEATURE_COLLECTION,
    },
  };

  const layers: StyleSpecification["layers"] = [
    {
      id: GLOW_BACKGROUND_LAYER_ID,
      type: "background",
      paint: {
        "background-color": GLOW_NAVY_BACKGROUND,
      },
    },
  ];

  if (hasPmtiles) {
    sources[GLOW_PMTILES_SOURCE_ID] = {
      type: "vector",
      url: `pmtiles://${pmtilesUrl}`,
    };
    // Supporting PMTiles context (land/coastline tint) sits beneath the
    // Glow states fill/line so it never competes with our own geometry.
    // Protomaps' default OSM-derived schema exposes a generic `earth`
    // layer for land polygons; we tint it extremely subtly. If the schema
    // differs this layer simply renders nothing — harmless, and PMTiles
    // source-level load failures are handled separately by GlowMap's
    // `error` listener (see basemapStatus.ts), not by this function.
    const pmtilesContextLayer: FillLayerSpecification = {
      id: GLOW_PMTILES_CONTEXT_LAYER_ID,
      type: "fill",
      source: GLOW_PMTILES_SOURCE_ID,
      "source-layer": "earth",
      paint: {
        "fill-color": "#0c1020",
        "fill-opacity": 0.6,
      },
    };
    layers.push(pmtilesContextLayer);
  }

  const statesFillLayer: FillLayerSpecification = {
    id: GLOW_STATES_FILL_LAYER_ID,
    type: "fill",
    source: GLOW_STATES_SOURCE_ID,
    paint: {
      "fill-color": GLOW_STATE_FILL,
      // Selected-state atmospheric emphasis (Checkpoint C item 5), scaled
      // down further per logical level (item 2) — GlowMap.tsx re-applies
      // this via `setPaintProperty` on every `currentLevel` change, so
      // "country" here is only the initial-paint default before that
      // effect's first run.
      "fill-opacity": stateFillOpacityExpression("country") as unknown as number,
    },
  };
  const statesLineLayer: LineLayerSpecification = {
    id: GLOW_STATES_LINE_LAYER_ID,
    type: "line",
    source: GLOW_STATES_SOURCE_ID,
    paint: {
      "line-color": GLOW_STATE_LINE,
      "line-width": stateLineWidthExpression("country") as unknown as number,
      "line-opacity": stateLineOpacityExpression("country") as unknown as number,
    },
  };
  layers.push(statesFillLayer, statesLineLayer);

  // Presence (Checkpoint C) sits visually above the restrained basemap/
  // state layers — warm halo+core GL circles only, no HTML/DOM per light.
  // All three levels start hidden except state (the country-level
  // default); GlowMap's level-visibility effect toggles these via
  // `setLayoutProperty` as the user navigates, never by re-adding layers.
  layers.push(
    presenceHaloLayer(GLOW_PRESENCE_STATE_HALO_LAYER_ID, GLOW_PRESENCE_STATE_SOURCE_ID, true),
    presenceCoreLayer(GLOW_PRESENCE_STATE_CORE_LAYER_ID, GLOW_PRESENCE_STATE_SOURCE_ID, true),
    presenceHaloLayer(GLOW_PRESENCE_CITY_HALO_LAYER_ID, GLOW_PRESENCE_CITY_SOURCE_ID, false),
    presenceCoreLayer(GLOW_PRESENCE_CITY_CORE_LAYER_ID, GLOW_PRESENCE_CITY_SOURCE_ID, false),
    presenceHaloLayer(GLOW_PRESENCE_SUBURB_HALO_LAYER_ID, GLOW_PRESENCE_SUBURB_SOURCE_ID, false),
    presenceCoreLayer(GLOW_PRESENCE_SUBURB_CORE_LAYER_ID, GLOW_PRESENCE_SUBURB_SOURCE_ID, false),
  );

  return { version: 8, sources, layers };
}
