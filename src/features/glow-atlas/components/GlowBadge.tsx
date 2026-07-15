"use client";

import { motion, useAnimationControls } from "framer-motion";
import { memo, useEffect, useRef } from "react";

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
import { zoomTransitionFor } from "../utils/zoom";

export type GlowBadgeSize = "state" | "stateCompact" | "city" | "suburb";

export type GlowBadgeProps = {
  /** Already projected + inset-clamped viewport % */
  badge: AtlasBadge;
  onSelect?: (id: string) => void;
  size?: GlowBadgeSize;
  className?: string;
  /**
   * When false, skip this component's own `left`/`top`/`x`/`y` % placement
   * entirely — used when a parent already anchors the element to a real
   * geographic point (MapLibre's `<Marker>`, see map/GlowMapBadges.tsx),
   * which reprojects it on every pan/zoom itself. Defaults to true for the
   * legacy fixed-viewBox SVG renderer, which still needs this component to
   * position itself.
   */
  positioned?: boolean;
};

const sizeStyles: Record<
  GlowBadgeSize,
  { maxWidth: string; pad: string; gap: string; dot: string }
> = {
  state: {
    maxWidth: "96px",
    pad: "px-2.5 py-[4px]",
    gap: "gap-1.5",
    dot: "5px",
  },
  // Country level shows all 8 states/territories at once in a small card —
  // a distinct, smaller footprint from the legacy SVG "state" size above
  // (kept unchanged for the retired SVG renderer) so the national label
  // layout (see GlowMapBadges.tsx's `NATIONAL_LABEL_OFFSET`) has enough
  // room for every state to stay legible and non-overlapping.
  stateCompact: {
    maxWidth: "70px",
    pad: "px-[7px] py-[3px]",
    gap: "gap-1",
    dot: "4px",
  },
  city: {
    maxWidth: "92px",
    pad: "px-2 py-[3px]",
    gap: "gap-1.5",
    dot: "4px",
  },
  suburb: {
    maxWidth: "88px",
    pad: "px-1.5 py-[2.5px]",
    gap: "gap-1",
    dot: "3.5px",
  },
};

/**
 * Compact glass capsule — fixed screen size, never inherits map scale.
 * State badges pulse with a soft lavender/gold glow when counts change.
 * Memoised — with stable `AtlasPresence` field references upstream, a
 * realtime tick that doesn't touch this badge's own count now skips re-render
 * entirely instead of re-running on every tick for every visible badge.
 */
function GlowBadgeInner({
  badge,
  onSelect,
  size = "city",
  className,
  positioned = true,
}: GlowBadgeProps) {
  const interactive = Boolean(onSelect);
  const styles = sizeStyles[size];
  const reducedMotion = useGlowReducedMotion();
  const pulse = useAnimationControls();
  const isFirstCount = useRef(true);
  const isState = size === "state" || size === "stateCompact";
  const isCompact = size === "stateCompact";

  const defaultShadow = isState
    ? "0 3px 10px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.07), 0 0 0 0.5px rgba(255,216,122,0.14)"
    : "0 2px 8px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.05), 0 0 0 0.5px rgba(255,255,255,0.05)";
  const activeShadow = isState
    ? "0 3px 10px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.07), 0 0 16px rgba(255,216,122,0.4), 0 0 12px rgba(182,148,255,0.3)"
    : "0 2px 8px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.05), 0 0 14px rgba(182,148,255,0.35), 0 0 10px rgba(255,216,122,0.22)";

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

  const enterScale = reducedMotion ? 1 : isState ? 0.96 : 0.94;
  const enterTransition = isState
    ? stateBadgeEnterTransition
    : presenceEnterTransition;
  const positionTransition = zoomTransitionFor(reducedMotion);
  const scaleTransition = reducedMotion
    ? { duration: 0 }
    : enterTransition;

  return (
    <motion.button
      type="button"
      layout={false}
      className={cn(
        "rounded-full",
        positioned && "absolute",
        interactive ? "pointer-events-auto cursor-pointer" : "pointer-events-none",
        interactive &&
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glow-primary-light/60",
        className,
      )}
      style={{
        maxWidth: styles.maxWidth,
      }}
      initial={{ opacity: 0, scale: enterScale }}
      animate={
        positioned
          ? {
              opacity: 1,
              scale: 1,
              left: `${badge.x}%`,
              top: `${badge.y}%`,
              x: "-50%",
              y: "-50%",
            }
          : { opacity: 1, scale: 1 }
      }
      exit={{
        opacity: 0,
        scale: reducedMotion ? 1 : 0.96,
        transition: reducedMotion
          ? { duration: 0 }
          : presenceExitTransition,
      }}
      transition={
        positioned
          ? {
              opacity: enterTransition,
              scale: scaleTransition,
              left: positionTransition,
              top: positionTransition,
              x: positionTransition,
              y: positionTransition,
            }
          : { opacity: enterTransition, scale: scaleTransition }
      }
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
          "flex max-w-full items-center rounded-full border backdrop-blur-md",
          isState ? "border-[rgba(255,216,122,0.22)]" : "border-white/[0.12]",
          styles.pad,
          styles.gap,
        )}
        style={{
          boxShadow: defaultShadow,
          background: isState
            ? "linear-gradient(160deg, rgba(22,20,38,0.86) 0%, rgba(10,12,26,0.82) 100%)"
            : "linear-gradient(160deg, rgba(14,16,32,0.82) 0%, rgba(7,9,20,0.8) 100%)",
        }}
      >
        <span
          aria-hidden="true"
          className="shrink-0 rounded-full"
          style={{
            width: styles.dot,
            height: styles.dot,
            background:
              "radial-gradient(circle at 35% 30%, rgba(255,240,210,1) 0%, rgba(255,196,110,0.9) 55%, rgba(255,170,90,0.6) 100%)",
            boxShadow: "0 0 4px 1px rgba(255,196,110,0.55)",
          }}
        />
        <span
          className="min-w-0 truncate font-semibold tracking-[0.02em] text-glow-text"
          style={{ fontSize: isCompact ? "clamp(9px, 2.2vw, 10px)" : "clamp(10px, 2.5vw, 11px)" }}
        >
          {badge.label}
        </span>
        <AnimatedCount
          value={badge.count}
          duration={550}
          className="shrink-0 font-medium text-glow-text-secondary"
          style={{ fontSize: isCompact ? "clamp(9px, 2.2vw, 10px)" : "clamp(10px, 2.5vw, 11px)" }}
          // The button's own aria-label already states the full count —
          // this avoids a second live-region announcement firing on every
          // realtime tick for every visible badge.
          announce={false}
        />
      </motion.span>
    </motion.button>
  );
}

export const GlowBadge = memo(GlowBadgeInner);
