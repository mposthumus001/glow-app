"use client";

import { motion } from "framer-motion";

import {
  breatheDuration,
  breatheKeyframes,
  circlePulse,
  clusterTwinkle,
  parentTwinkle,
  twinkleDuration,
} from "../utils/animation";
import {
  lightSizeFactor,
  projectMapPoint,
  zoomTransition,
} from "../utils/zoom";
import type { AtlasLight, FocusBounds } from "../types";
import { cn } from "@/lib/utils/cn";
import { useMemo } from "react";

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
}: {
  light: AtlasLight;
  x: number;
  y: number;
  size: number;
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

  return (
    <motion.div
      className="pointer-events-none absolute"
      style={{ width: size, height: size }}
      animate={{
        left: `${x}%`,
        top: `${y}%`,
        x: "-50%",
        y: "-50%",
      }}
      transition={zoomTransition}
      aria-hidden="true"
    >
      <motion.div
        className={cn("h-full w-full rounded-full", style.bg)}
        style={{ boxShadow: style.shadow }}
        initial={{ opacity: 0.3, scale: 0.85 }}
        animate={keyframes}
        transition={{
          duration,
          repeat: Infinity,
          delay: light.delay,
          ease: "easeInOut",
        }}
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
 * Positions follow map zoom; pixel size stays controlled.
 */
export function GlowLightLayer({ lights, focus }: GlowLightLayerProps) {
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
      {projected.map(({ light, x, y, size }) => (
        <LightDot key={light.id} light={light} x={x} y={y} size={size} />
      ))}
    </div>
  );
}
