"use client";

import { AnimatePresence, motion } from "framer-motion";

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
      layout={false}
      className="pointer-events-none absolute"
      style={{
        left: `${light.x}%`,
        top: `${light.y}%`,
        width: light.size,
        height: light.size,
        translateX: "-50%",
        translateY: "-50%",
      }}
      initial={{ opacity: 0, scale: 0.55 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{
        opacity: 0,
        scale: 0.45,
        transition: presenceExitTransition,
      }}
      transition={presenceEnterTransition}
      aria-hidden="true"
    >
      <motion.div
        className={cn("h-full w-full rounded-full", style.bg)}
        style={{ boxShadow: style.shadow }}
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

/** Map-space lights (legacy composition). Prefer GlowLightLayer. */
export function GlowLights({ lights }: { lights: AtlasLight[] }) {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <AnimatePresence initial={false}>
        {lights.map((light) => (
          <LightDot key={light.id} light={light} />
        ))}
      </AnimatePresence>
    </div>
  );
}
