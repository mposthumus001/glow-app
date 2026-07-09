"use client";

import { useMemo } from "react";

import { demoGlowMapData } from "../data/demoLights";
import type { GlowMapData } from "../types";

export type GlowMapSource = "demo" | "live";

export type UseGlowMapOptions = {
  /**
   * Data source selector.
   * `demo` → demoLights.ts
   * `live` → reserved for map_cluster_public (not wired yet)
   */
  source?: GlowMapSource;
  /** Optional override — useful for Storybook / tests */
  data?: GlowMapData;
};

/**
 * Glow Map data hook.
 *
 * Designed so switching from mock → Supabase only changes the source
 * inside this hook. Components stay the same.
 */
export function useGlowMap(options: UseGlowMapOptions = {}): GlowMapData {
  const { source = "demo", data } = options;

  return useMemo(() => {
    if (data) return data;

    if (source === "live") {
      // Tomorrow: fetch map_cluster_public + project lat/lng via latLngToPercent.
      // Until then, fall back to demo so the UI never blanks.
      return demoGlowMapData;
    }

    return demoGlowMapData;
  }, [data, source]);
}
