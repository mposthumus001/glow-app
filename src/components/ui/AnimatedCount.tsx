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
  /**
   * Whether this element owns its own `aria-live` announcement.
   * Default true for standalone use. Set false when an ancestor already
   * exposes an equivalent live region or label (e.g. a badge button's own
   * `aria-label`, or a wrapping `<p aria-live>`) — otherwise the count
   * change gets announced twice on every realtime tick.
   */
  announce?: boolean;
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
  announce = true,
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

  // When `announce` is false, this renders as plain text with no live
  // region or overriding label of its own — it relies on an ancestor
  // (a labelled button, or a wrapping `aria-live` element) to expose the
  // count to assistive tech exactly once instead of twice.
  return (
    <span
      className={cn("tabular-nums", className)}
      style={style}
      aria-label={announce ? ariaLabel ?? String(shown) : undefined}
      aria-live={announce ? "polite" : undefined}
      aria-atomic={announce ? true : undefined}
    >
      {shown.toLocaleString()}
    </span>
  );
}
