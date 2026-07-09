"use client";

import { AnimatePresence, motion } from "framer-motion";

import { GlowBadge } from "./GlowBadge";
import type { AtlasBadge } from "../types";

export type GlowSuburbLayerProps = {
  badges: AtlasBadge[];
  visible: boolean;
  onSelectSuburb: (suburbId: string) => void;
  neighbourhoodMode?: boolean;
};

export function GlowSuburbLayer({
  badges,
  visible,
  onSelectSuburb,
  neighbourhoodMode = false,
}: GlowSuburbLayerProps) {
  return (
    <AnimatePresence>
      {visible && !neighbourhoodMode ? (
        <motion.div
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
        >
          {badges.map((badge) => (
            <GlowBadge key={badge.id} badge={badge} onSelect={onSelectSuburb} />
          ))}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
