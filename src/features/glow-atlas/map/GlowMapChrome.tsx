"use client";

import { GlowBackButton } from "../components/GlowBackButton";
import { GlowBreadcrumbs } from "../components/GlowBreadcrumbs";
import { GlowResetControl } from "./GlowResetControl";
import type { AtlasLevel } from "../types";

export type GlowMapChromeProps = {
  breadcrumbs: { id: string; label: string; level: AtlasLevel }[];
  canGoBack: boolean;
  onGoBack: () => void;
  onNavigate: (level: AtlasLevel) => void;
};

/**
 * HTML overlay chrome for the MapLibre canvas — breadcrumbs, Back, and the
 * keyboard-accessible Reset-to-Australia control. Deliberately excludes
 * presence badges/markers (Checkpoint C). Lives outside the map's own
 * coordinate space so it never inherits camera pan/zoom, matching the
 * now-retired SVG-era OverlayLayer's top bar (Checkpoint E).
 */
export function GlowMapChrome({
  breadcrumbs,
  canGoBack,
  onGoBack,
  onNavigate,
}: GlowMapChromeProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      <div className="pointer-events-auto absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-2 px-3 pt-3">
        <GlowBreadcrumbs items={breadcrumbs} onNavigate={onNavigate} />
        <div className="flex items-center gap-1.5">
          <GlowBackButton visible={canGoBack} onBack={onGoBack} />
          <GlowResetControl
            visible={canGoBack}
            onReset={() => onNavigate("country")}
          />
        </div>
      </div>
    </div>
  );
}
