"use client";

import { useEffect, useRef, useState } from "react";

import { useGlowReducedMotion } from "@/lib/hooks/useGlowReducedMotion";
import { cn } from "@/lib/utils/cn";

export type AnimatedCountProps = {
  value: number;
  /** Animation duration in ms (default 600) */
  duration?: number;
  className?: string;
  style?: React.CSSProperties;
  /** Screen reader label prefix, e.g. "2 parents awake" */
  "aria-label"?: string;
};

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

/**
 * Smoothly animates between numeric values.
 * Skips animation on first render; respects reduced motion.
 */
export function AnimatedCount({
  value,
  duration = 600,
  className,
  style,
  "aria-label": ariaLabel,
}: AnimatedCountProps) {
  const reducedMotion = useGlowReducedMotion();
  const [display, setDisplay] = useState(value);
  const mountedRef = useRef(false);
  const prevRef = useRef(value);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (reducedMotion) return;

    if (!mountedRef.current) {
      mountedRef.current = true;
      prevRef.current = value;
      return;
    }

    if (value === prevRef.current) return;

    const from = prevRef.current;
    const to = value;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = easeOutCubic(progress);
      setDisplay(Math.round(from + (to - from) * eased));

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        prevRef.current = to;
      }
    };

    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [duration, reducedMotion, value]);

  const shown = reducedMotion ? value : display;

  return (
    <span
      className={cn("tabular-nums", className)}
      style={style}
      aria-label={ariaLabel ?? String(shown)}
      aria-live="polite"
      aria-atomic="true"
    >
      {shown.toLocaleString()}
    </span>
  );
}
