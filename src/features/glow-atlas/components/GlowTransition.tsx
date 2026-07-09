"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

import { zoomTransition } from "../utils/zoom";

export type GlowTransitionProps = {
  scale: number;
  originX: number;
  originY: number;
  children: ReactNode;
  className?: string;
};

/**
 * Shared zoom transform for SVG + overlays.
 * 700ms easeInOut — scales around the focus origin; never hard-swaps the map.
 */
export function GlowTransition({
  scale,
  originX,
  originY,
  children,
  className,
}: GlowTransitionProps) {
  return (
    <motion.div
      className={className}
      animate={{ scale }}
      transition={zoomTransition}
      style={{
        transformOrigin: `${originX}% ${originY}%`,
        willChange: "transform",
      }}
    >
      {children}
    </motion.div>
  );
}
