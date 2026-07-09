"use client";

import { AustraliaMapSvg } from "./AustraliaMapSvg";
import { GlowLegend } from "./GlowLegend";
import { GlowMapOverlay } from "./GlowMapOverlay";
import { useGlowMap } from "../hooks/useGlowMap";
import type { GlowMapProps } from "../types";
import { cn } from "@/lib/utils/cn";

/**
 * Glow Map — signature Home visual.
 *
 * Architecture:
 * - Permanent geographic SVG (never redrawn)
 * - Overlay layer for lights + state badges (swappable data)
 * - useGlowMap() → demo today, map_cluster_public tomorrow
 */
export function GlowMap({
  className,
  data,
  caption,
  helperText,
  showLegend = true,
}: GlowMapProps) {
  const mapData = useGlowMap({ data });

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-glow-card",
        "border border-white/[0.06]",
        "bg-[#070b18]",
        "shadow-[0_8px_40px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.04)]",
        className,
      )}
      aria-label="Glow map of parents awake across Australia"
    >
      {/* Soft atmosphere — calm, not cheap gradient noise */}
      <div
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 55% 42%, rgba(142,154,255,0.10) 0%, transparent 68%), radial-gradient(ellipse 50% 40% at 20% 70%, rgba(182,148,255,0.06) 0%, transparent 60%)",
        }}
      />

      <div className="relative px-3 pb-5 pt-4 sm:px-4">
        <div className="relative mx-auto aspect-[273/253] w-full max-w-[380px]">
          <AustraliaMapSvg />
          <GlowMapOverlay
            lights={mapData.lights}
            stateCounts={mapData.stateCounts}
          />
        </div>

        {showLegend ? (
          <GlowLegend
            className="mt-4"
            caption={caption}
            helperText={helperText}
          />
        ) : null}
      </div>
    </section>
  );
}
