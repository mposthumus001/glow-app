"use client";

import { AnimatePresence, motion } from "framer-motion";

import { GlowBadge } from "./GlowBadge";
import type { AtlasBadge, AuStateCode } from "../types";

export type GlowStateLayerProps = {
  badges: AtlasBadge[];
  visible: boolean;
  onSelectState: (code: AuStateCode) => void;
};

/** @deprecated Prefer OverlayLayer — kept for composition reuse */
export function GlowStateLayer({
  badges,
  visible,
  onSelectState,
}: GlowStateLayerProps) {
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
            <GlowBadge
              key={badge.id}
              badge={badge}
              onSelect={(id) => onSelectState(id as AuStateCode)}
            />
          ))}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
