"use client";

import { GlowParticles } from "./GlowParticles";
import { StateBadge } from "./StateBadge";
import type { GlowLight as GlowLightData, StateCount } from "../types";

export type GlowMapOverlayProps = {
  lights: GlowLightData[];
  stateCounts: StateCount[];
};

/**
 * Percentage overlay on top of the permanent Australia SVG.
 * Swap lights / badges when map_cluster_public goes live —
 * never mutate the SVG asset.
 */
export function GlowMapOverlay({ lights, stateCounts }: GlowMapOverlayProps) {
  return (
    <div className="pointer-events-none absolute inset-0">
      <GlowParticles lights={lights} />
      {stateCounts.map((state) => (
        <StateBadge key={state.code} state={state} />
      ))}
    </div>
  );
}
