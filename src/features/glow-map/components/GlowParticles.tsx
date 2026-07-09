"use client";

import { GlowLight } from "./GlowLight";
import type { GlowLight as GlowLightData } from "../types";

/**
 * Renders the warm parent lights overlay.
 * SVG geography stays untouched — only this layer changes with live data.
 */
export function GlowParticles({ lights }: { lights: GlowLightData[] }) {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      {lights.map((light) => (
        <GlowLight key={light.id} light={light} />
      ))}
    </div>
  );
}
