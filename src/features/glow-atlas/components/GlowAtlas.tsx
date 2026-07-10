"use client";

import { BaseMapLayer } from "./BaseMapLayer";
import { GlowAtlasLiveStatus } from "./GlowAtlasLiveStatus";
import { GlowLightLayer } from "./GlowLightLayer";
import { OverlayLayer } from "./OverlayLayer";
import { useGlowAtlas } from "../hooks/useGlowAtlas";
import { useMapClusterPresence } from "../hooks/useMapClusterPresence";
import type { MapClusterConnection } from "../hooks/useMapClusterPresence";
import type { AtlasPresence } from "../types";
import { dimOpacityForLevel } from "../utils/zoom";
import { cn } from "@/lib/utils/cn";

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

const DEFAULT_CAPTION = "Every light is another parent awake right now.";
const EMPTY_CAPTION = "Your light still matters.";
const DEFAULT_HELPER = "Privacy-safe · Approximate only";

function resolveCaption(
  level: ReturnType<typeof useGlowAtlas>["currentLevel"],
  countryCount: number,
  override?: string,
): string {
  if (override !== undefined) return override;
  if (level === "country" && countryCount === 0) return EMPTY_CAPTION;
  if (level === "suburb") {
    return "Each light is a parent nearby — never an exact address.";
  }
  if (level === "city") return "Showing busiest nearby areas";
  return DEFAULT_CAPTION;
}

/**
 * Glow Atlas — signature animated Australia visualisation.
 *
 * Layer model:
 * - BaseMapLayer: SVG only (scales)
 * - GlowLightLayer: lights in viewport space (controlled size)
 * - OverlayLayer: badges / chrome (never inherits map scale)
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

  const atlas = useGlowAtlas({
    presence,
    source: presenceOverride ? undefined : "live",
  });
  const dim = dimOpacityForLevel(atlas.currentLevel);
  const caption = resolveCaption(
    atlas.currentLevel,
    countryCount,
    captionOverride,
  );

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
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 55% 42%, rgba(142,154,255,0.10) 0%, transparent 68%), radial-gradient(ellipse 50% 40% at 20% 70%, rgba(182,148,255,0.06) 0%, transparent 60%)",
        }}
      />

      <div className="relative px-3 pb-5 pt-3 sm:px-4">
        <div className="relative mx-auto aspect-[273/253] w-full max-w-[380px] overflow-hidden rounded-[1.25rem]">
          <BaseMapLayer
            scale={atlas.transform.scale}
            originX={atlas.transform.originX}
            originY={atlas.transform.originY}
            opacity={dim}
            focusCx={atlas.focus.cx}
            focusCy={atlas.focus.cy}
            showFocusWash={atlas.currentLevel !== "country"}
          />

          <GlowLightLayer lights={atlas.lights} focus={atlas.focus} />

          <OverlayLayer
            focus={atlas.focus}
            currentLevel={atlas.currentLevel}
            stateBadges={atlas.stateBadges}
            cityBadges={atlas.cityBadges}
            suburbBadges={atlas.suburbBadges}
            breadcrumbs={atlas.breadcrumbs}
            canGoBack={atlas.canGoBack}
            onSelectState={atlas.selectState}
            onSelectCity={atlas.selectCity}
            onSelectSuburb={atlas.selectSuburb}
            onGoBack={atlas.goBack}
            onNavigate={atlas.goToLevel}
          />
        </div>

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
        </p>
      </div>
    </section>
  );
}
