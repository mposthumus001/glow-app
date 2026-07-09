"use client";

import { motion } from "framer-motion";

import { GlowAtlasSVG } from "./GlowAtlasSVG";
import { zoomTransition } from "../utils/zoom";
import { cn } from "@/lib/utils/cn";

export type BaseMapLayerProps = {
  scale: number;
  originX: number;
  originY: number;
  opacity: number;
  focusCx: number;
  focusCy: number;
  showFocusWash: boolean;
  className?: string;
};

/**
 * SVG geography only — the only layer that inherits map scale/translate.
 */
export function BaseMapLayer({
  scale,
  originX,
  originY,
  opacity,
  focusCx,
  focusCy,
  showFocusWash,
  className,
}: BaseMapLayerProps) {
  return (
    <motion.div
      className={cn("absolute inset-0", className)}
      animate={{ scale }}
      transition={zoomTransition}
      style={{
        transformOrigin: `${originX}% ${originY}%`,
        willChange: "transform",
      }}
    >
      <motion.div
        className="absolute inset-0"
        animate={{ opacity }}
        transition={zoomTransition}
      >
        <GlowAtlasSVG />
      </motion.div>

      {showFocusWash ? (
        <motion.div
          className="pointer-events-none absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={zoomTransition}
          style={{
            background: `radial-gradient(circle at ${focusCx}% ${focusCy}%, rgba(182,148,255,0.14) 0%, transparent 42%)`,
          }}
        />
      ) : null}
    </motion.div>
  );
}
