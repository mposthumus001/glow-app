"use client";

import { AnimatePresence, motion } from "framer-motion";

import { GlowBadge } from "./GlowBadge";
import type { AtlasBadge } from "../types";

export type GlowCityLayerProps = {
  badges: AtlasBadge[];
  visible: boolean;
  onSelectCity: (cityId: string) => void;
};

/** Compact city pills — same size as state badges (never giant text) */
export function GlowCityLayer({
  badges,
  visible,
  onSelectCity,
}: GlowCityLayerProps) {
  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
        >
          {badges.map((badge) => (
            <GlowBadge key={badge.id} badge={badge} onSelect={onSelectCity} />
          ))}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
