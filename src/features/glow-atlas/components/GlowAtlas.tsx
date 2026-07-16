"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useState } from "react";

import { GlowAtlasLiveStatus } from "./GlowAtlasLiveStatus";
import { useGlowAtlas } from "../hooks/useGlowAtlas";
import { useMapClusterPresence } from "../hooks/useMapClusterPresence";
import type { MapClusterConnection } from "../hooks/useMapClusterPresence";
import type { BasemapStatusResult } from "../map/basemapStatus";
import type { CameraSelectionInput } from "../map/camera";
import {
  formatSyntheticPreviewDisclosure,
  resolveSyntheticPreviewConfig,
} from "../map/syntheticPreviewConfig";
import type { AtlasPresence } from "../types";
import { cn } from "@/lib/utils/cn";

// MapLibre touches window/document at module load time (protocol
// registration, the maplibre-gl.css import) — never render it on the
// server. See map/GlowMap.tsx.
const GlowMap = dynamic(
  () => import("../map/GlowMap").then((mod) => mod.GlowMap),
  { ssr: false },
);

export type GlowAtlasProps = {
  className?: string;
  /**
   * Optional override (tests / Storybook).
   * When provided, skips internal map_cluster_public subscription.
   */
  presence?: AtlasPresence;
  countryCount?: number;
  connection?: MapClusterConnection;
  lastUpdatedAt?: number | null;
  caption?: string;
  helperText?: string;
};

// Resolved once per module load, from a direct `process.env.NEXT_PUBLIC_...`
// literal (see syntheticPreviewConfig.ts's header for why that matters) —
// GlowMap.tsx independently resolves the same flags for the actual point
// generation; this copy only ever drives the outside-canvas disclosure text.
const SYNTHETIC_PREVIEW_CONFIG = resolveSyntheticPreviewConfig();

const DEFAULT_CAPTION = "Every light is another parent awake right now.";
const EMPTY_CAPTION = "Your light still matters.";
const DEFAULT_HELPER = "Privacy-safe · Approximate only";

function parentWord(count: number): string {
  return count === 1 ? "parent" : "parents";
}

/**
 * The caption is the concise textual activity summary required outside the
 * canvas (Checkpoint D, item 1) — the MapLibre canvas itself is muted for
 * screen readers (see GlowMap.tsx), so this is the only place a screen
 * reader user gets the headline number without exploring individual badges.
 * Only country/state get a live count folded in: each disclosed badge
 * already states its own count (see GlowBadge's `aria-label`), so this adds
 * the *aggregate* the badges don't individually carry, rather than
 * repeating one of them. City/suburb keep their existing, deliberately
 * vague copy — a specific "N parents in {suburb}" line would undercut the
 * suburb view's own "never an exact address" framing for no accessibility
 * benefit (its `presence` GL dot is already the least identifying view).
 * Not an `aria-live` region: it changes on level navigation as much as on
 * a realtime tick, and re-announcing it on every tick would be exactly the
 * duplicate/noisy announcement item 1 calls out avoiding — `GlowAtlasLiveStatus`
 * is the one place connection changes are actively announced.
 */
function resolveCaption(
  level: ReturnType<typeof useGlowAtlas>["currentLevel"],
  countryCount: number,
  stateCount: number | null,
  stateName: string | null,
  override?: string,
): string {
  if (override !== undefined) return override;
  if (level === "country") {
    if (countryCount === 0) return EMPTY_CAPTION;
    return `${countryCount} ${parentWord(countryCount)} awake across Australia right now.`;
  }
  if (level === "state" && stateName && stateCount) {
    return `${stateCount} ${parentWord(stateCount)} awake in ${stateName} right now.`;
  }
  if (level === "suburb") {
    return "Each light is a parent nearby — never an exact address.";
  }
  if (level === "city") return "Showing busiest nearby areas";
  return DEFAULT_CAPTION;
}

/**
 * Glow Atlas — interactive MapLibre visualisation of Australia.
 *
 * Checkpoint A added the base <GlowMap /> (local states GeoJSON + optional
 * PMTiles context, graceful fallback), client-side only. Checkpoint B wired
 * `useGlowAtlas`'s selection/breadcrumb/back state machine into the
 * MapLibre camera (see map/camera.ts) and added the state hit-area click,
 * breadcrumb, Back, and Reset-to-Australia navigation. Checkpoint C adds
 * privacy-safe presence GL layers (see map/presenceGeoJson.ts) and the
 * small set of disclosed, interactive badges (see map/GlowMapBadges.tsx).
 * Checkpoint E retired the old SVG rendering path this replaced
 * (BaseMapLayer, GlowLightLayer, OverlayLayer, GlowAtlasSVG and its source
 * SVG asset) — see docs/GlowAtlas.md for the current MapLibre architecture
 * and docs/CHANGELOG.md for what was removed.
 */
export function GlowAtlas({
  className,
  presence: presenceOverride,
  countryCount: countryCountProp,
  connection: connectionProp,
  lastUpdatedAt: lastUpdatedAtProp,
  caption: captionOverride,
  helperText = DEFAULT_HELPER,
}: GlowAtlasProps) {
  const internal = useMapClusterPresence({
    enabled: presenceOverride === undefined,
  });

  const presence = presenceOverride ?? internal.presence;
  const countryCount = countryCountProp ?? internal.countryCount;
  const connection = connectionProp ?? internal.connection;
  const lastUpdatedAt = lastUpdatedAtProp ?? internal.lastUpdatedAt;

  // `atlas` (breadcrumb/disclosure state machine, badges, lights) is kept
  // alive unchanged. Selection/breadcrumbs/back drive the MapLibre camera
  // and chrome (Checkpoint B); `stateBadges`/`cityBadges`/`suburbBadges`
  // now also drive the disclosed MapLibre <Marker> badges, and `presence`
  // drives the GL presence layers (Checkpoint C) — see docs/GlowAtlas.md.
  // `lights` (the legacy SVG pseudo-scatter) stays unused by the MapLibre
  // path; real geographic presence comes from presenceGeoJson.ts instead.
  const atlas = useGlowAtlas({
    presence,
    source: presenceOverride ? undefined : "live",
  });
  const caption = resolveCaption(
    atlas.currentLevel,
    countryCount,
    atlas.selectedStateData
      ? presence.stateCounts[atlas.selectedStateData.code] ?? 0
      : null,
    atlas.selectedStateData?.name ?? null,
    captionOverride,
  );

  // Checkpoint C refinement (item 5): the "Showing simplified map" copy is
  // reported up from GlowMap (see its `onBasemapStatusChange` prop) and
  // rendered here, below the map card alongside the privacy/helper text —
  // never as an overlay on top of the canvas/geography/presence lights.
  const [basemapMessage, setBasemapMessage] = useState<string | null>(null);
  const handleBasemapStatusChange = useCallback((status: BasemapStatusResult) => {
    setBasemapMessage(status.message);
  }, []);

  const { currentLevel, selectedStateData, selectedCityData, selectedSuburbData } =
    atlas;
  const cameraSelection: CameraSelectionInput = useMemo(() => {
    if (currentLevel === "state" && selectedStateData) {
      return { level: "state", code: selectedStateData.code };
    }
    if (currentLevel === "city" && selectedCityData) {
      return { level: "city", geo: selectedCityData.geo };
    }
    if (currentLevel === "suburb" && selectedSuburbData) {
      return { level: "suburb", geo: selectedSuburbData.geo };
    }
    return { level: "country" };
  }, [currentLevel, selectedStateData, selectedCityData, selectedSuburbData]);

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-glow-card",
        "border border-white/[0.06] bg-[#070b18]",
        "shadow-[0_8px_40px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.04)]",
        className,
      )}
      aria-label="Glow Atlas — parents awake across Australia"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          background:
            "radial-gradient(ellipse 75% 60% at 55% 38%, rgba(142,154,255,0.12) 0%, transparent 68%), radial-gradient(ellipse 55% 45% at 18% 74%, rgba(182,148,255,0.07) 0%, transparent 60%), radial-gradient(ellipse 45% 35% at 88% 82%, rgba(255,216,122,0.05) 0%, transparent 62%)",
        }}
      />

      {/* Map is the hero — minimal horizontal gutter so it dominates the
          card on 360–430px phones, distinct from the more generous inset
          the caption text below gets for readability. */}
      <div className="relative px-1.5 pb-5 pt-3 sm:px-3">
        <div className="relative mx-auto aspect-[273/253] w-full max-w-[440px] overflow-hidden rounded-[1.1rem]">
          <GlowMap
            cameraSelection={cameraSelection}
            breadcrumbs={atlas.breadcrumbs}
            canGoBack={atlas.canGoBack}
            currentLevel={atlas.currentLevel}
            presence={presence}
            stateBadges={atlas.stateBadges}
            cityBadges={atlas.cityBadges}
            suburbBadges={atlas.suburbBadges}
            selectedStateCode={atlas.selectedState}
            selectedCityId={atlas.selectedCity}
            selectedSuburbId={atlas.selectedSuburb}
            onSelectState={atlas.selectState}
            onSelectCity={atlas.selectCity}
            onSelectSuburb={atlas.selectSuburb}
            onGoBack={atlas.goBack}
            onNavigate={atlas.goToLevel}
            onBasemapStatusChange={handleBasemapStatusChange}
          />
        </div>

        <div className="px-1.5 sm:px-1">
          <GlowAtlasLiveStatus
            connection={connection}
            lastUpdatedAt={lastUpdatedAt}
            className="mt-3"
          />

          <p className="mt-2 text-center text-sm leading-relaxed text-glow-text-secondary">
            {caption}
          </p>
          <p className="mt-1.5 text-center text-[11px] tracking-wide text-glow-text-tertiary">
            {helperText}
            {basemapMessage ? (
              <>
                {" "}
                <span aria-hidden="true">·</span> <span role="status">{basemapMessage}</span>
              </>
            ) : null}
          </p>
          {SYNTHETIC_PREVIEW_CONFIG.enabled ? (
            // Explicit simulated-community disclosure — kept separate from
            // the real "N parents awake" caption above; never combines the
            // two counts (see formatSyntheticPreviewDisclosure).
            <p className="mt-1 text-center text-[11px] italic tracking-wide text-glow-text-tertiary/80">
              {formatSyntheticPreviewDisclosure(SYNTHETIC_PREVIEW_CONFIG.pointCount)}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
