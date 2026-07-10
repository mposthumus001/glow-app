"use client";

import { AnimatePresence, motion, useAnimationControls } from "framer-motion";
import { useEffect, useRef } from "react";

import {
  badgeCountTransition,
  badgePulseTransition,
  presenceEnterTransition,
  presenceExitTransition,
} from "../utils/animation";
import type { AtlasBadge } from "../types";
import { zoomTransition } from "../utils/zoom";
import { cn } from "@/lib/utils/cn";

export type GlowBadgeSize = "state" | "city" | "suburb";

export type GlowBadgeProps = {
  /** Already projected + inset-clamped viewport % */
  badge: AtlasBadge;
  onSelect?: (id: string) => void;
  size?: GlowBadgeSize;
  className?: string;
};

const sizeStyles: Record<
  GlowBadgeSize,
  { maxWidth: string; pad: string; font: string; gap: string }
> = {
  state: {
    maxWidth: "92px",
    pad: "px-2 py-[3px]",
    font: "10px",
    gap: "gap-1",
  },
  city: {
    maxWidth: "92px",
    pad: "px-1.5 py-[2px]",
    font: "10px",
    gap: "gap-1",
  },
  suburb: {
    maxWidth: "88px",
    pad: "px-1.5 py-[2px]",
    font: "10px",
    gap: "gap-0.5",
  },
};

/**
 * Compact glass capsule — fixed screen size, never inherits map scale.
 * Pulses gently when live presence counts change.
 */
export function GlowBadge({
  badge,
  onSelect,
  size = "city",
  className,
}: GlowBadgeProps) {
  const interactive = Boolean(onSelect);
  const styles = sizeStyles[size];
  const pulse = useAnimationControls();
  const isFirstCount = useRef(true);

  useEffect(() => {
    if (isFirstCount.current) {
      isFirstCount.current = false;
      return;
    }

    void pulse.start({
      scale: [1, 1.045, 1],
      transition: badgePulseTransition,
    });
  }, [badge.count, pulse]);

  return (
    <motion.button
      type="button"
      layout={false}
      className={cn(
        "absolute",
        interactive ? "pointer-events-auto cursor-pointer" : "pointer-events-none",
        className,
      )}
      style={{
        maxWidth: styles.maxWidth,
      }}
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{
        opacity: 1,
        scale: 1,
        left: `${badge.x}%`,
        top: `${badge.y}%`,
        x: "-50%",
        y: "-50%",
      }}
      exit={{
        opacity: 0,
        scale: 0.96,
        transition: presenceExitTransition,
      }}
      transition={{
        opacity: presenceEnterTransition,
        scale: presenceEnterTransition,
        left: zoomTransition,
        top: zoomTransition,
        x: zoomTransition,
        y: zoomTransition,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.(badge.id);
      }}
      whileTap={interactive ? { scale: 0.96 } : undefined}
      aria-label={`${badge.label}: ${badge.count} parents awake`}
    >
      <motion.span
        animate={pulse}
        className={cn(
          "flex max-w-full items-center rounded-full border border-white/[0.12]",
          "bg-[rgba(8,12,28,0.8)]",
          "shadow-[0_2px_8px_rgba(0,0,0,0.28),0_0_0_0.5px_rgba(255,255,255,0.04)]",
          "backdrop-blur-md",
          styles.pad,
          styles.gap,
        )}
      >
        <span
          className="min-w-0 truncate font-semibold tracking-[0.02em] text-glow-text"
          style={{ fontSize: `clamp(10px, 2.5vw, 11px)` }}
        >
          {badge.label}
        </span>
        <span
          className="relative inline-flex h-[1.1em] min-w-[1ch] shrink-0 items-center overflow-hidden"
          style={{ fontSize: `clamp(10px, 2.5vw, 11px)` }}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={badge.count}
              className="font-medium tabular-nums text-glow-text-secondary"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={badgeCountTransition}
            >
              {badge.count.toLocaleString()}
            </motion.span>
          </AnimatePresence>
        </span>
      </motion.span>
    </motion.button>
  );
}
