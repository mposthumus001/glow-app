"use client";

import { motion } from "framer-motion";

import { atlasStates } from "../data/states";
import type { AuStateCode } from "../types";
import { cn } from "@/lib/utils/cn";

/**
 * Invisible hit targets over each state for Level 1 taps.
 * Geography stays in GlowAtlasSVG; this layer only handles clicks.
 */
export type StateHitLayerProps = {
  enabled: boolean;
  selectedState: AuStateCode | null;
  onSelectState: (code: AuStateCode) => void;
};

export function StateHitLayer({
  enabled,
  selectedState,
  onSelectState,
}: StateHitLayerProps) {
  if (!enabled) return null;

  return (
    <div className="absolute inset-0">
      {atlasStates.map((state) => {
        const isSelected = selectedState === state.code;
        // Approximate elliptical hit zones around state centres
        const size = state.code === "ACT" ? 8 : state.code === "TAS" ? 14 : 22;

        return (
          <motion.button
            key={state.code}
            type="button"
            aria-label={`Open ${state.name}`}
            className={cn(
              "absolute -translate-x-1/2 -translate-y-1/2 rounded-full",
              "bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glow-primary/40",
              isSelected && "ring-1 ring-glow-primary/30",
            )}
            style={{
              left: `${state.x}%`,
              top: `${state.y}%`,
              width: `${size}%`,
              height: `${size}%`,
            }}
            whileTap={{ scale: 0.97 }}
            onClick={(e) => {
              e.stopPropagation();
              onSelectState(state.code);
            }}
          />
        );
      })}
    </div>
  );
}
