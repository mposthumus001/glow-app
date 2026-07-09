"use client";

import { ChevronLeft } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { cn } from "@/lib/utils/cn";

export type GlowBackButtonProps = {
  visible: boolean;
  onBack: () => void;
  className?: string;
};

export function GlowBackButton({
  visible,
  onBack,
  className,
}: GlowBackButtonProps) {
  return (
    <AnimatePresence>
      {visible ? (
        <motion.button
          type="button"
          initial={{ opacity: 0, x: 6 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 6 }}
          transition={{ duration: 0.25 }}
          onClick={onBack}
          className={cn(
            "inline-flex items-center gap-0.5 rounded-full border border-white/[0.12]",
            "bg-[rgba(8,12,28,0.72)] px-2.5 py-1 text-[11px] font-medium text-glow-text",
            "shadow-[0_2px_10px_rgba(0,0,0,0.28)] backdrop-blur-md",
            "transition-colors hover:bg-[rgba(16,22,42,0.85)]",
            className,
          )}
          aria-label="Go back"
        >
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Back
        </motion.button>
      ) : null}
    </AnimatePresence>
  );
}
