"use client";

import { AnimatePresence, motion } from "framer-motion";
import { memo, useMemo } from "react";

import { useGlowReducedMotion } from "@/lib/hooks/useGlowReducedMotion";
import { cn } from "@/lib/utils/cn";

import {
  breatheDuration,
  breatheKeyframes,
  circlePulse,
  clusterTwinkle,
  parentTwinkle,
  presenceEnterTransition,
  presenceExitTransition,
  twinkleDuration,
} from "../utils/animation";
import {
  lightSizeFactor,
  projectMapPoint,
  zoomTransition,
} from "../utils/zoom";
import type { AtlasLight, FocusBounds } from "../types";

const kindStyles = {
  cluster: {
    bg: "bg-glow-accent",
    shadow: "0 0 6px 1.5px rgba(255, 216, 122, 0.5)",
  },
  parent: {
    bg: "bg-glow-accent",
    shadow: "0 0 7px 2px rgba(255, 216, 122, 0.55)",
  },
  circle: {
    bg: "bg-glow-primary-light",
    shadow: "0 0 10px 3px rgba(182, 148, 255, 0.6)",
  },
} as const;

function LightDot({
  light,
  x,
  y,
  size,
  reducedMotion,
}: {
  light: AtlasLight;
  x: number;
  y: number;
  size: number;
  reducedMotion: boolean;
}) {
  const style = kindStyles[light.kind];
  const duration =
    light.duration ??
    (light.breathe
      ? breatheDuration(light.delay)
      : twinkleDuration(light.delay, light.kind));

  const keyframes = light.breathe
    ? breatheKeyframes
    : light.kind === "circle"
      ? circlePulse
      : light.kind === "parent"
        ? parentTwinkle
        : clusterTwinkle;

  const enterDelay = reducedMotion ? 0 : (light.enterStagger ?? 0);
  const targetOpacity = light.baseOpacity ?? 1;

  return (
    <motion.div
      layout={false}
      className="pointer-events-none absolute"
      style={{ width: size, height: size }}
      initial={{ opacity: 0, scale: reducedMotion ? 1 : 0.55 }}
      animate={{
        opacity: targetOpacity,
        scale: 1,
        left: `${x}%`,
        top: `${y}%`,
        x: "-50%",
        y: "-50%",
      }}
      exit={{
        opacity: 0,
        scale: reducedMotion ? 1 : 0.45,
        transition: reducedMotion
          ? { duration: 0 }
          : presenceExitTransition,
      }}
      transition={{
        opacity: {
          ...(reducedMotion
            ? { duration: 0 }
            : presenceEnterTransition),
          delay: enterDelay,
        },
        scale: {
          ...(reducedMotion
            ? { duration: 0 }
            : presenceEnterTransition),
          delay: enterDelay,
        },
        left: zoomTransition,
        top: zoomTransition,
        x: zoomTransition,
        y: zoomTransition,
      }}
      aria-hidden="true"
    >
      <motion.div
        className={cn("h-full w-full rounded-full", style.bg)}
        style={{ boxShadow: style.shadow }}
        animate={reducedMotion ? { opacity: targetOpacity } : keyframes}
        transition={
          reducedMotion
            ? { duration: 0 }
            : {
                duration,
                repeat: Infinity,
                delay: light.delay + enterDelay,
                ease: "easeInOut",
              }
        }
      />
    </motion.div>
  );
}

export type GlowLightLayerProps = {
  lights: AtlasLight[];
  focus: FocusBounds;
};

/**
 * Presence lights in viewport space.
 * New lights fade in with stagger; offline lights fade out — calm, subtle.
 */
function GlowLightLayerInner({ lights, focus }: GlowLightLayerProps) {
  const reducedMotion = useGlowReducedMotion();
  const sizeMul = lightSizeFactor(focus.scale);

  const projected = useMemo(
    () =>
      lights.map((light) => {
        const point = projectMapPoint(light.x, light.y, focus);
        return {
          light,
          x: point.x,
          y: point.y,
          size: Math.max(1.5, light.size * sizeMul),
        };
      }),
    [focus, lights, sizeMul],
  );

  return (
    <div className="pointer-events-none absolute inset-0 z-[5]" aria-hidden="true">
      <AnimatePresence initial={false}>
        {projected.map(({ light, x, y, size }) => (
          <LightDot
            key={light.id}
            light={light}
            x={x}
            y={y}
            size={size}
            reducedMotion={reducedMotion}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

export const GlowLightLayer = memo(GlowLightLayerInner);
