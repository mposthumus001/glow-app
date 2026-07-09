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
import type { AtlasLight } from "../types";
import { cn } from "@/lib/utils/cn";

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

function LightDot({ light }: { light: AtlasLight }) {
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

export function GlowLights({ lights }: { lights: AtlasLight[] }) {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      {lights.map((light) => (
        <LightDot key={light.id} light={light} />
      ))}
    </div>
  );
}
