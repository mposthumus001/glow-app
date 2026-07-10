"use client";

import { motion, useAnimationControls } from "framer-motion";
import { useEffect, useRef } from "react";

import { AnimatedCount } from "@/components/ui/AnimatedCount";
import { useGlowReducedMotion } from "@/lib/hooks/useGlowReducedMotion";
import { cn } from "@/lib/utils/cn";

import {
  badgePulseTransition,
  presenceEnterTransition,
  presenceExitTransition,
  stateBadgeEnterTransition,
  stateBadgePulseTransition,
} from "../utils/animation";
import type { AtlasBadge } from "../types";
import { zoomTransition } from "../utils/zoom";

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
  { maxWidth: string; pad: string; gap: string }
> = {
  state: {
    maxWidth: "92px",
    pad: "px-2 py-[3px]",
    gap: "gap-1",
  },
  city: {
    maxWidth: "92px",
    pad: "px-1.5 py-[2px]",
    gap: "gap-1",
  },
  suburb: {
    maxWidth: "88px",
    pad: "px-1.5 py-[2px]",
    gap: "gap-0.5",
  },
};

/**
 * Compact glass capsule — fixed screen size, never inherits map scale.
 * State badges pulse with a soft lavender/gold glow when counts change.
 */
export function GlowBadge({
  badge,
  onSelect,
  size = "city",
  className,
}: GlowBadgeProps) {
  const interactive = Boolean(onSelect);
  const styles = sizeStyles[size];
  const reducedMotion = useGlowReducedMotion();
  const pulse = useAnimationControls();
  const isFirstCount = useRef(true);
  const isState = size === "state";

  const defaultShadow =
    "0 2px 8px rgba(0,0,0,0.28), 0 0 0 0.5px rgba(255,255,255,0.04)";
  const activeShadow =
    "0 2px 8px rgba(0,0,0,0.28), 0 0 14px rgba(182,148,255,0.35), 0 0 10px rgba(255,216,122,0.22)";

  useEffect(() => {
    if (isFirstCount.current) {
      isFirstCount.current = false;
      return;
    }

    if (reducedMotion) return;

    const pulseTransition = isState
      ? stateBadgePulseTransition
      : badgePulseTransition;
    const peakScale = isState ? 1.06 : 1.045;

    if (isState) {
      void pulse.start({
        scale: [1, peakScale, 1],
        boxShadow: [defaultShadow, activeShadow, defaultShadow],
        transition: pulseTransition,
      });
    } else {
      void pulse.start({
        scale: [1, peakScale, 1],
        transition: pulseTransition,
      });
    }
  }, [
    activeShadow,
    badge.count,
    defaultShadow,
    isState,
    pulse,
    reducedMotion,
  ]);

  const enterScale = isState ? 0.96 : 0.94;
  const enterTransition = isState
    ? stateBadgeEnterTransition
    : presenceEnterTransition;

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
      initial={{ opacity: 0, scale: enterScale }}
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
        scale: isState ? 0.96 : 0.96,
        transition: presenceExitTransition,
      }}
      transition={{
        opacity: enterTransition,
        scale: enterTransition,
        left: zoomTransition,
        top: zoomTransition,
        x: zoomTransition,
        y: zoomTransition,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.(badge.id);
      }}
      whileTap={interactive && !reducedMotion ? { scale: 0.96 } : undefined}
      aria-label={`${badge.label}: ${badge.count} ${badge.count === 1 ? "parent" : "parents"} awake`}
    >
      <motion.span
        animate={pulse}
        initial={{ boxShadow: defaultShadow }}
        className={cn(
          "flex max-w-full items-center rounded-full border border-white/[0.12]",
          "bg-[rgba(8,12,28,0.8)] backdrop-blur-md",
          styles.pad,
          styles.gap,
        )}
        style={{ boxShadow: defaultShadow }}
      >
        <span
          className="min-w-0 truncate font-semibold tracking-[0.02em] text-glow-text"
          style={{ fontSize: "clamp(10px, 2.5vw, 11px)" }}
        >
          {badge.label}
        </span>
        <AnimatedCount
          value={badge.count}
          duration={550}
          className="shrink-0 font-medium text-glow-text-secondary"
          style={{ fontSize: "clamp(10px, 2.5vw, 11px)" }}
          aria-label={`${badge.count} awake`}
        />
      </motion.span>
    </motion.button>
  );
}
