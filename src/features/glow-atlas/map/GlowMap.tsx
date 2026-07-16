"use client";

import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { GeoJSONSource, LngLatBoundsLike } from "maplibre-gl";
import { PMTiles, Protocol } from "pmtiles";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AttributionControl, Map as MapGL } from "react-map-gl/maplibre";
import type {
  MapLayerMouseEvent,
  MapRef,
} from "react-map-gl/maplibre";

import { useGlowReducedMotion } from "@/lib/hooks/useGlowReducedMotion";
import { cn } from "@/lib/utils/cn";

import { resolveBasemapStatus } from "./basemapStatus";
import type { BasemapStatusResult } from "./basemapStatus";
import {
  type CameraSelectionInput,
  type CameraViewport,
  GLOBAL_MAX_ZOOM,
  GLOBAL_MIN_ZOOM,
  resolveCameraTarget,
  resolveMaxBounds,
} from "./camera";
import {
  buildGlowMapStyle,
  GLOW_PMTILES_CONTEXT_LAYER_ID,
  GLOW_PRESENCE_CITY_CORE_LAYER_ID,
  GLOW_PRESENCE_CITY_HALO_LAYER_ID,
  GLOW_PRESENCE_CITY_SOURCE_ID,
  GLOW_PRESENCE_LAYER_IDS,
  GLOW_PRESENCE_STATE_CORE_LAYER_ID,
  GLOW_PRESENCE_STATE_HALO_LAYER_ID,
  GLOW_PRESENCE_STATE_SOURCE_ID,
  GLOW_PRESENCE_SUBURB_CORE_LAYER_ID,
  GLOW_PRESENCE_SUBURB_HALO_LAYER_ID,
  GLOW_PRESENCE_SUBURB_SOURCE_ID,
  GLOW_STATES_FILL_LAYER_ID,
  GLOW_STATES_LINE_LAYER_ID,
  GLOW_STATES_SOURCE_ID,
  GLOW_SYNTHETIC_PREVIEW_SOURCE_ID,
  stateFillOpacityExpression,
  stateLineOpacityExpression,
  stateLineWidthExpression,
  syntheticPreviewCoreLayer,
  syntheticPreviewHaloLayer,
  syntheticPreviewHeatmapLayer,
} from "./glowMapStyle";
import { GlowMapBadges } from "./GlowMapBadges";
import { GlowMapChrome } from "./GlowMapChrome";
import { buildPresenceGeoJson } from "./presenceGeoJson";
import { buildSyntheticPreviewGeoJson } from "./syntheticAtlasData";
import { resolveSyntheticPreviewConfig } from "./syntheticPreviewConfig";
import type { AtlasBadge, AtlasLevel, AtlasPresence, AuStateCode } from "../types";
import type { ErrorEvent as GlowMapErrorEvent } from "react-map-gl/maplibre";

/** Which presence layer pair (halo+core) is visible at each logical level — see the level-visibility effect below. */
const PRESENCE_LAYER_IDS_BY_LEVEL: Record<AtlasLevel, readonly string[]> = {
  country: [GLOW_PRESENCE_STATE_HALO_LAYER_ID, GLOW_PRESENCE_STATE_CORE_LAYER_ID],
  state: [GLOW_PRESENCE_CITY_HALO_LAYER_ID, GLOW_PRESENCE_CITY_CORE_LAYER_ID],
  // Once a specific suburb is selected there is no finer aggregation to
  // show — the suburb-area layer stays visible for context, with the
  // selected suburb receiving the feature-state emphasis below.
  city: [GLOW_PRESENCE_SUBURB_HALO_LAYER_ID, GLOW_PRESENCE_SUBURB_CORE_LAYER_ID],
  suburb: [GLOW_PRESENCE_SUBURB_HALO_LAYER_ID, GLOW_PRESENCE_SUBURB_CORE_LAYER_ID],
};

// GlowMap is dynamically imported with `ssr: false` (see GlowAtlas.tsx), so
// this module only ever evaluates in the browser — registering the
// `pmtiles://` protocol here, once per page load, is safe.
let pmtilesProtocolRegistered = false;
function ensurePmtilesProtocolRegistered(): void {
  if (pmtilesProtocolRegistered) return;
  const protocol = new Protocol();
  maplibregl.addProtocol("pmtiles", protocol.tile);
  pmtilesProtocolRegistered = true;
}
ensurePmtilesProtocolRegistered();

const PMTILES_URL = process.env.NEXT_PUBLIC_ATLAS_PMTILES_URL || null;

// Resolved once per module load from the public env flags — see
// syntheticPreviewConfig.ts. `GlowAtlas.tsx` calls the same pure resolver
// independently for its outside-the-canvas disclosure text; both read the
// identical `process.env.NEXT_PUBLIC_ATLAS_SYNTHETIC_PREVIEW*` values that
// Next.js inlines at build time, so there is nothing to keep in sync.
const SYNTHETIC_PREVIEW_CONFIG = resolveSyntheticPreviewConfig();

/** Reject the PMTiles reachability probe if it hangs — never block the map. */
const PMTILES_PROBE_TIMEOUT_MS = 8000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("PMTiles probe timed out")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

// Country-level starting view, close enough to the real fitBounds target
// that the very first paint doesn't visibly jump before the camera-sync
// effect below applies the exact (padded, geography-derived) framing with
// `duration: 0` once the map has loaded and its container has been
// measured. Real navigation always goes through camera.ts from here on.
const INITIAL_VIEW_STATE = {
  longitude: 133.5,
  latitude: -26.8,
  zoom: 3.1,
};

const MAX_BOUNDS = resolveMaxBounds();
const MAP_MAX_BOUNDS: LngLatBoundsLike = [
  [MAX_BOUNDS.west, MAX_BOUNDS.south],
  [MAX_BOUNDS.east, MAX_BOUNDS.north],
];

const DEFAULT_VIEWPORT: CameraViewport = { width: 400, height: 400 };

export type GlowMapProps = {
  className?: string;
  /** Drives the camera — see camera.ts. Built by GlowAtlas.tsx from useGlowAtlas's selection. */
  cameraSelection: CameraSelectionInput;
  breadcrumbs: { id: string; label: string; level: AtlasLevel }[];
  canGoBack: boolean;
  /** Logical disclosure level — drives which presence GL layer is visible (Checkpoint C). Never changed by manual pan/zoom. */
  currentLevel: AtlasLevel;
  /** Privacy-safe aggregate counts — turned into GeoJSON via presenceGeoJson.ts, updated with `setData` on every tick. */
  presence: AtlasPresence;
  /** Already disclosed (featured/top-N + collision) — see useGlowAtlas.ts. Rendered as the only HTML in the map. */
  stateBadges: AtlasBadge[];
  cityBadges: AtlasBadge[];
  suburbBadges: AtlasBadge[];
  selectedStateCode: AuStateCode | null;
  selectedCityId: string | null;
  selectedSuburbId: string | null;
  onSelectState: (code: AuStateCode) => void;
  onSelectCity: (cityId: string) => void;
  onSelectSuburb: (suburbId: string) => void;
  onGoBack: () => void;
  onNavigate: (level: AtlasLevel) => void;
  /**
   * Fired whenever the PMTiles context-layer status changes. The parent
   * (GlowAtlas.tsx) renders the "Showing simplified map" copy *outside*
   * this component's canvas, alongside the privacy/helper text — this
   * component only ever reports the status, it never overlays it on the
   * map itself (Checkpoint C refinement, item 5).
   */
  onBasemapStatusChange?: (status: BasemapStatusResult) => void;
};

/**
 * The MapLibre-based Glow Atlas map. Renders the local, always-available
 * Australia states/territories GeoJSON basemap (see ../data/geo/); the
 * optional PMTiles context layer is only ever supporting geography — if it
 * is unconfigured or fails to load, only that one context layer's own
 * visibility changes (see the `mapStyle`/`GLOW_PMTILES_CONTEXT_LAYER_ID`
 * effect below); the local basemap never disappears and the canvas never
 * goes blank. The status text itself is reported to the parent via
 * `onBasemapStatusChange` and rendered outside this component entirely
 * (Checkpoint C refinement, item 5) — this component never overlays it on
 * the canvas.
 *
 * Camera (Checkpoint B): every level change flies to a real geographic
 * bbox via `camera.ts`; manual pan/pinch/scroll are native MapLibre
 * gestures the camera-sync effect never fights — it only re-fits when
 * `cameraSelection` itself changes (state click, breadcrumb, Back, Reset),
 * never on a bare resize or on the user's own pan/zoom.
 */
export function GlowMap({
  className,
  cameraSelection,
  breadcrumbs,
  canGoBack,
  currentLevel,
  presence,
  stateBadges,
  cityBadges,
  suburbBadges,
  selectedStateCode,
  selectedCityId,
  selectedSuburbId,
  onSelectState,
  onSelectCity,
  onSelectSuburb,
  onGoBack,
  onNavigate,
  onBasemapStatusChange,
}: GlowMapProps) {
  const [pmtilesLoadFailed, setPmtilesLoadFailed] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [cursor, setCursor] = useState<string>("");

  const mapRef = useRef<MapRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<CameraViewport>(DEFAULT_VIEWPORT);
  const hasAppliedInitialCameraRef = useRef(false);
  const prevSelectionRef = useRef<{
    state: AuStateCode | null;
    city: string | null;
    suburb: string | null;
  }>({ state: null, city: null, suburb: null });

  const reducedMotion = useGlowReducedMotion();
  const reducedMotionRef = useRef(reducedMotion);
  useEffect(() => {
    reducedMotionRef.current = reducedMotion;
  }, [reducedMotion]);

  useEffect(() => {
    if (!PMTILES_URL) return;

    let cancelled = false;
    withTimeout(new PMTiles(PMTILES_URL).getHeader(), PMTILES_PROBE_TIMEOUT_MS).catch(
      () => {
        if (!cancelled) setPmtilesLoadFailed(true);
      },
    );

    return () => {
      cancelled = true;
    };
  }, []);

  // Tracks the map container's own CSS size (not the window) so fitBounds
  // padding stays correct whether the card renders at 360px mobile width
  // or full desktop width — recomputed at the moment of the next fit, not
  // by re-fitting on every resize (which would fight a manual pan/zoom the
  // user made at the current level).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) {
        viewportRef.current = { width, height };
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Camera sync: runs once the map has loaded and again on every logical
  // selection change (state/city/suburb select, breadcrumb, Back, Reset).
  // The very first run applies immediately (`duration: 0`) so page load
  // never shows an extra animated flight on top of the initial paint.
  useEffect(() => {
    if (!mapLoaded) return;
    const map = mapRef.current;
    if (!map) return;

    const target = resolveCameraTarget(cameraSelection, {
      viewport: viewportRef.current,
      reducedMotion: reducedMotionRef.current,
    });
    const isInitialFit = !hasAppliedInitialCameraRef.current;
    hasAppliedInitialCameraRef.current = true;

    map.fitBounds(
      [
        [target.bounds.west, target.bounds.south],
        [target.bounds.east, target.bounds.north],
      ],
      {
        padding: target.padding,
        maxZoom: target.maxZoom,
        duration: isInitialFit ? 0 : target.durationMs,
      },
    );
  }, [cameraSelection, mapLoaded]);

  // Privacy-safe presence GeoJSON (Checkpoint C) — pure, derived from
  // `presence` only. Never recomputed by pan/zoom/selection, only by an
  // actual realtime presence tick.
  const presenceGeoJson = useMemo(() => buildPresenceGeoJson(presence), [presence]);

  // Realtime updates: push new presence data into the already-created GL
  // sources via `setData()` — this never touches `mapStyle` (see below),
  // so the map/style instance itself is never recreated on a presence
  // tick, only the three presence sources' own data.
  useEffect(() => {
    if (!mapLoaded) return;
    const map = mapRef.current;
    if (!map) return;

    const stateSource = map.getSource(GLOW_PRESENCE_STATE_SOURCE_ID) as
      | GeoJSONSource
      | undefined;
    const citySource = map.getSource(GLOW_PRESENCE_CITY_SOURCE_ID) as
      | GeoJSONSource
      | undefined;
    const suburbSource = map.getSource(GLOW_PRESENCE_SUBURB_SOURCE_ID) as
      | GeoJSONSource
      | undefined;

    stateSource?.setData(presenceGeoJson.state as unknown as GeoJSON.FeatureCollection);
    citySource?.setData(presenceGeoJson.city as unknown as GeoJSON.FeatureCollection);
    suburbSource?.setData(presenceGeoJson.suburb as unknown as GeoJSON.FeatureCollection);
  }, [mapLoaded, presenceGeoJson]);

  // Synthetic Atlas Preview: one GeoJSON source (~5,000 simulated parents)
  // feeding three WebGL layers — atmospheric heatmap + per-parent halo +
  // per-parent core. Generation runs *after* `mapLoaded` so the real map
  // paints first. Added exactly once (`syntheticPreviewAddedRef`); never
  // rebuilt on realtime ticks. Inserted with `beforeId` so real presence
  // always paints above synthetic layers. No clustering / no feature
  // reduction — every Point remains one rendered light.
  const syntheticPreviewAddedRef = useRef(false);
  useEffect(() => {
    if (!mapLoaded || !SYNTHETIC_PREVIEW_CONFIG.enabled || syntheticPreviewAddedRef.current) {
      return;
    }
    const map = mapRef.current?.getMap();
    if (!map) return;
    syntheticPreviewAddedRef.current = true;

    const geojson = buildSyntheticPreviewGeoJson({ count: SYNTHETIC_PREVIEW_CONFIG.pointCount });
    map.addSource(GLOW_SYNTHETIC_PREVIEW_SOURCE_ID, {
      type: "geojson",
      data: geojson as unknown as GeoJSON.FeatureCollection,
      // Explicitly disable MapLibre clustering — one Point = one light.
      cluster: false,
    });
    // Paint order (bottom → top): heatmap → halo → core → real presence.
    // Each addLayer(..., beforeId) inserts just under presence, so later
    // adds stack above earlier ones while remaining below real presence.
    const beforeRealPresence = GLOW_PRESENCE_STATE_HALO_LAYER_ID;
    // Paint order (bottom → top): heatmap → halo → core → real presence.
    // Each addLayer(..., beforeId) inserts just under presence, so later
    // adds stack above earlier ones while remaining below real presence.
    map.addLayer(syntheticPreviewHeatmapLayer(), beforeRealPresence);
    map.addLayer(syntheticPreviewHaloLayer(), beforeRealPresence);
    map.addLayer(syntheticPreviewCoreLayer(), beforeRealPresence);
  }, [mapLoaded]);

  // Logical hierarchy (Checkpoint C item 6): only the presence layer pair
  // for the current level is visible — country shows state-level presence,
  // state shows city-level, city/suburb show suburb-level. A bare
  // `setLayoutProperty` toggle, never a source/style rebuild, and it never
  // runs on manual pan/zoom (those don't change `currentLevel`).
  useEffect(() => {
    if (!mapLoaded) return;
    const map = mapRef.current?.getMap();
    if (!map) return;

    const visible = new Set(PRESENCE_LAYER_IDS_BY_LEVEL[currentLevel]);
    for (const layerId of GLOW_PRESENCE_LAYER_IDS) {
      map.setLayoutProperty(layerId, "visibility", visible.has(layerId) ? "visible" : "none");
    }
  }, [currentLevel, mapLoaded]);

  // Selected-region atmospheric emphasis (Checkpoint C item 5): a
  // `feature-state` toggle on the selected state polygon / city / suburb
  // presence dot — see glowMapStyle.ts's `SELECTED_FEATURE_STATE`
  // expressions. Cheap and imperative; never rebuilds a source or style.
  useEffect(() => {
    if (!mapLoaded) return;
    const map = mapRef.current;
    if (!map) return;

    const prev = prevSelectionRef.current;

    if (prev.state !== selectedStateCode) {
      if (prev.state) {
        map.setFeatureState({ source: GLOW_STATES_SOURCE_ID, id: prev.state }, { selected: false });
      }
      if (selectedStateCode) {
        map.setFeatureState(
          { source: GLOW_STATES_SOURCE_ID, id: selectedStateCode },
          { selected: true },
        );
      }
    }

    if (prev.city !== selectedCityId) {
      if (prev.city) {
        map.setFeatureState(
          { source: GLOW_PRESENCE_CITY_SOURCE_ID, id: prev.city },
          { selected: false },
        );
      }
      if (selectedCityId) {
        map.setFeatureState(
          { source: GLOW_PRESENCE_CITY_SOURCE_ID, id: selectedCityId },
          { selected: true },
        );
      }
    }

    if (prev.suburb !== selectedSuburbId) {
      if (prev.suburb) {
        map.setFeatureState(
          { source: GLOW_PRESENCE_SUBURB_SOURCE_ID, id: prev.suburb },
          { selected: false },
        );
      }
      if (selectedSuburbId) {
        map.setFeatureState(
          { source: GLOW_PRESENCE_SUBURB_SOURCE_ID, id: selectedSuburbId },
          { selected: true },
        );
      }
    }

    prevSelectionRef.current = {
      state: selectedStateCode,
      city: selectedCityId,
      suburb: selectedSuburbId,
    };
  }, [mapLoaded, selectedCityId, selectedStateCode, selectedSuburbId]);

  const basemapStatus = useMemo(
    () => resolveBasemapStatus({ pmtilesUrl: PMTILES_URL, loadFailed: pmtilesLoadFailed }),
    [pmtilesLoadFailed],
  );

  const onBasemapStatusChangeRef = useRef(onBasemapStatusChange);
  useEffect(() => {
    onBasemapStatusChangeRef.current = onBasemapStatusChange;
  }, [onBasemapStatusChange]);
  useEffect(() => {
    onBasemapStatusChangeRef.current?.(basemapStatus);
  }, [basemapStatus]);

  // Built exactly once (never keyed on `pmtilesLoadFailed`) — Checkpoint C
  // refinement item 7: swapping `mapStyle` identity makes react-map-gl call
  // `map.setStyle()`, which can transiently clear the canvas while the new
  // style loads. The PMTiles context source/layer, when configured, is
  // always *included* in the style from the start; the effect below hides
  // it with `setLayoutProperty` if it later fails, so a fallback never
  // touches the style/source and the local states basemap is never at risk
  // of disappearing.
  const mapStyle = useMemo(() => buildGlowMapStyle({ pmtilesUrl: PMTILES_URL }), []);

  // Hide (never remove/rebuild) the optional PMTiles context layer once it
  // fails to load — see the `mapStyle` comment above.
  useEffect(() => {
    if (!mapLoaded) return;
    const map = mapRef.current?.getMap();
    if (!map || !map.getLayer(GLOW_PMTILES_CONTEXT_LAYER_ID)) return;
    map.setLayoutProperty(
      GLOW_PMTILES_CONTEXT_LAYER_ID,
      "visibility",
      pmtilesLoadFailed ? "none" : "visible",
    );
  }, [mapLoaded, pmtilesLoadFailed]);

  // Level-aware state fill/line paint (Checkpoint C refinement item 2) —
  // the selected-state polygon fills the *entire* viewport once the camera
  // is inside a single state, so city/suburb levels collapse it to a
  // near-invisible contextual boundary via `setPaintProperty` rather than
  // any source/style rebuild. See `glowMapStyle.ts`'s `STATE_*_BY_LEVEL`.
  useEffect(() => {
    if (!mapLoaded) return;
    const map = mapRef.current?.getMap();
    if (!map) return;
    map.setPaintProperty(
      GLOW_STATES_FILL_LAYER_ID,
      "fill-opacity",
      stateFillOpacityExpression(currentLevel),
    );
    map.setPaintProperty(
      GLOW_STATES_LINE_LAYER_ID,
      "line-opacity",
      stateLineOpacityExpression(currentLevel),
    );
    map.setPaintProperty(
      GLOW_STATES_LINE_LAYER_ID,
      "line-width",
      stateLineWidthExpression(currentLevel),
    );
  }, [currentLevel, mapLoaded]);

  const handleMapError = useCallback((event: GlowMapErrorEvent) => {
    // Defensive fallback alongside the active PMTiles probe above — this
    // minimal style has no other external resource that can fail.
    if (PMTILES_URL && !pmtilesLoadFailed) {
      setPmtilesLoadFailed(true);
    }
    // Never surface MapLibre's own console.error-by-default noise for a
    // condition we already show a calm status line for.
    void event;
  }, [pmtilesLoadFailed]);

  const handleLoad = useCallback(() => setMapLoaded(true), []);

  const handleClick = useCallback(
    (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      const code = feature?.properties?.code as AuStateCode | undefined;
      if (code) onSelectState(code);
    },
    [onSelectState],
  );

  const handleMouseEnterState = useCallback(() => setCursor("pointer"), []);
  const handleMouseLeaveState = useCallback(() => setCursor(""), []);

  // Checkpoint D (item 1): the MapLibre canvas is a WebGL visualization
  // whose meaning is fully duplicated in accessible text elsewhere — every
  // disclosed badge has its own `aria-label` (see GlowBadge.tsx), and the
  // caption/status text outside the canvas (see GlowAtlas.tsx) summarises
  // the current view's live counts. Left at MapLibre's own default
  // (`tabindex="0"`, `aria-label="Map"`), the canvas would be both a
  // confusing, contentless stop for screen readers and an extra Tab stop
  // ahead of the real interactive controls. Muting it here is DOM-only —
  // it never touches pointer/wheel/touch handling, so mouse/touch pan,
  // zoom and click-to-select all keep working exactly as before.
  useEffect(() => {
    if (!mapLoaded) return;
    const map = mapRef.current?.getMap();
    const canvas = map?.getCanvas();
    if (!canvas) return;
    canvas.setAttribute("aria-hidden", "true");
    canvas.setAttribute("tabindex", "-1");
  }, [mapLoaded]);

  return (
    <div ref={containerRef} className={cn("relative h-full w-full", className)}>
      {/* Rendered before the canvas in DOM order (Checkpoint D, item 1) so
          Tab visits breadcrumbs → Back → Reset before the in-map badges,
          matching their top-of-card visual position — `GlowMapChrome`'s own
          `absolute`/`z-20` positioning means moving it here changes nothing
          visually, only keyboard focus order. */}
      <GlowMapChrome
        breadcrumbs={breadcrumbs}
        canGoBack={canGoBack}
        onGoBack={onGoBack}
        onNavigate={onNavigate}
      />
      <MapGL
        ref={mapRef}
        initialViewState={INITIAL_VIEW_STATE}
        mapStyle={mapStyle}
        minZoom={GLOBAL_MIN_ZOOM}
        maxZoom={GLOBAL_MAX_ZOOM}
        maxBounds={MAP_MAX_BOUNDS}
        interactiveLayerIds={[GLOW_STATES_FILL_LAYER_ID]}
        cursor={cursor}
        style={{ width: "100%", height: "100%" }}
        onLoad={handleLoad}
        onError={handleMapError}
        onClick={handleClick}
        onMouseEnter={handleMouseEnterState}
        onMouseLeave={handleMouseLeaveState}
        attributionControl={false}
      >
        {mapLoaded ? (
          <GlowMapBadges
            level={currentLevel}
            stateBadges={stateBadges}
            cityBadges={cityBadges}
            suburbBadges={suburbBadges}
            onSelectState={onSelectState}
            onSelectCity={onSelectCity}
            onSelectSuburb={onSelectSuburb}
          />
        ) : null}
        {/* Checkpoint D (item 4): `react-map-gl`'s `useControl` creates the
            native MapLibre control exactly once (`useMemo(..., [])`) — a
            `customAttribution` prop change alone never reaches the already-
            mounted control, so without a remount this would keep crediting
            OpenStreetMap forever after PMTiles fails, even once the context
            layer itself is hidden. `key` forces React to tear down and
            recreate the control (cheap, and this only ever flips once) the
            moment `pmtilesLoadFailed` changes, so the credit shown always
            matches what's actually on the map.

            Checkpoint E item 1: `bottom-left`, not MapLibre's `bottom-right`
            default — every national badge that sits near the map's bottom
            edge (Tasmania, and VIC/NSW/ACT's leader line) is offset toward
            the *east* side of the card (see `NATIONAL_LABEL_OFFSET` in
            GlowMapBadges.tsx), because that's where those states actually
            are. The bottom-left corner sits over open ocean/WA at every
            level this app renders, so the control can never obstruct a
            disclosed badge there. */}
        <AttributionControl
          key={pmtilesLoadFailed ? "attribution-fallback" : "attribution-pmtiles"}
          compact
          position="bottom-left"
          customAttribution={
            pmtilesLoadFailed || !PMTILES_URL ? undefined : "© OpenStreetMap contributors"
          }
        />
      </MapGL>
    </div>
  );
}
