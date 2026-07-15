"use client";

import { Home } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { useGlowReducedMotion } from "@/lib/hooks/useGlowReducedMotion";
import { uiFadeTransitionFor } from "../utils/animation";
import { cn } from "@/lib/utils/cn";

export type GlowResetControlProps = {
  /** Only shown once the user has drilled into state/city/suburb — matches GlowBackButton's pattern. */
  visible: boolean;
  onReset: () => void;
  className?: string;
};

/**
 * Keyboard-accessible "Reset to Australia" control — always jumps straight
 * to the country level/camera regardless of how deep the user has drilled,
 * distinct from Back (one level at a time) and the breadcrumb root link
 * (text, easy to miss). A real labelled `<button>` with a visible focus
 * ring, reachable by Tab like every other Atlas control.
 */
export function GlowResetControl({
  visible,
  onReset,
  className,
}: GlowResetControlProps) {
  const reducedMotion = useGlowReducedMotion();
  const slide = reducedMotion ? 0 : 6;
  return (
    <AnimatePresence>
      {visible ? (
        <motion.button
          type="button"
          initial={{ opacity: 0, x: slide }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: slide }}
          transition={uiFadeTransitionFor(reducedMotion)}
          onClick={onReset}
          className={cn(
            "inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/[0.12]",
            "bg-[rgba(8,12,28,0.72)] text-glow-text",
            "shadow-[0_2px_10px_rgba(0,0,0,0.28)] backdrop-blur-md",
            "transition-colors hover:bg-[rgba(16,22,42,0.85)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glow-primary-light/60",
            className,
          )}
          aria-label="Reset map to Australia"
          title="Reset to Australia"
        >
          <Home className="h-3.5 w-3.5" aria-hidden="true" />
        </motion.button>
      ) : null}
    </AnimatePresence>
  );
}
