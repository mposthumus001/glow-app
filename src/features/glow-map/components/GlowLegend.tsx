"use client";

import { cn } from "@/lib/utils/cn";

export type GlowLegendProps = {
  className?: string;
  caption?: string;
  helperText?: string;
};

const DEFAULT_CAPTION = "Every light is another parent awake right now.";
const DEFAULT_HELPER = "Privacy-safe · Approximate only";

export function GlowLegend({
  className,
  caption = DEFAULT_CAPTION,
  helperText = DEFAULT_HELPER,
}: GlowLegendProps) {
  return (
    <div className={cn("text-center", className)}>
      <p className="text-sm leading-relaxed text-glow-text-secondary">
        {caption}
      </p>
      <p className="mt-1.5 text-[11px] tracking-wide text-glow-text-tertiary">
        {helperText}
      </p>
    </div>
  );
}
