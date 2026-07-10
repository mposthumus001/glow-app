"use client";

import { cn } from "@/lib/utils/cn";
import { useGlowReducedMotion } from "@/lib/hooks/useGlowReducedMotion";

export interface CircleTypingIndicatorProps {
  label: string | null;
}

/**
 * Quiet typing feedback — polite live region, no noisy animation.
 */
export function CircleTypingIndicator({ label }: CircleTypingIndicatorProps) {
  const reduceMotion = useGlowReducedMotion();

  if (!label) {
    return (
      <div
        className="min-h-6 px-1"
        aria-live="polite"
        aria-atomic="true"
        aria-relevant="text"
      />
    );
  }

  return (
    <div
      className="min-h-6 px-1"
      aria-live="polite"
      aria-atomic="true"
      aria-relevant="text"
    >
      <p
        className={cn(
          "text-sm text-glow-text-tertiary",
          !reduceMotion && "transition-opacity duration-300",
        )}
      >
        {label}
      </p>
    </div>
  );
}
