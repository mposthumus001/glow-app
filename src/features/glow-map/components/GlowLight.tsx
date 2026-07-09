"use client";

import { motion } from "framer-motion";

import {
  breatheDuration,
  breatheKeyframes,
  circlePulseKeyframes,
  clusterTwinkleKeyframes,
  twinkleDuration,
} from "../utils/animation";
import type { GlowLight as GlowLightData } from "../types";
import { cn } from "@/lib/utils/cn";

const kindStyles = {
  cluster: {
    bg: "bg-glow-accent",
    shadow: "0 0 6px 1.5px rgba(255, 216, 122, 0.5)",
  },
  circle: {
    bg: "bg-glow-primary-light",
    shadow: "0 0 10px 3px rgba(182, 148, 255, 0.6)",
  },
} as const;

export function GlowLight({ light }: { light: GlowLightData }) {
  const style = kindStyles[light.kind];
  const duration =
    light.duration ??
    (light.breathe
      ? breatheDuration(light.delay)
      : twinkleDuration(light.delay, light.kind));

  const keyframes = light.breathe
    ? breatheKeyframes
    : light.kind === "circle"
      ? circlePulseKeyframes
      : clusterTwinkleKeyframes;

  return (
    <motion.div
      className={cn("pointer-events-none absolute rounded-full", style.bg)}
      style={{
        left: `${light.x}%`,
        top: `${light.y}%`,
        width: light.size,
        height: light.size,
        boxShadow: style.shadow,
        translateX: "-50%",
        translateY: "-50%",
      }}
      initial={{ opacity: 0.3, scale: 0.85 }}
      animate={keyframes}
      transition={{
        duration,
        repeat: Infinity,
        delay: light.delay,
        ease: "easeInOut",
      }}
      aria-hidden="true"
    />
  );
}
