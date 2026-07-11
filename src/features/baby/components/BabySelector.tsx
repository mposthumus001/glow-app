"use client";

import { cn } from "@/lib/utils/cn";

import type { BabyProfile } from "../types";

export type BabySelectorProps = {
  babies: BabyProfile[];
  selectedId: string | null;
  onSelect: (babyId: string) => void;
  className?: string;
};

/**
 * Calm multi-baby selector. Hidden when only one baby exists.
 */
export function BabySelector({
  babies,
  selectedId,
  onSelect,
  className,
}: BabySelectorProps) {
  if (babies.length <= 1) return null;

  return (
    <div className={cn("mb-4", className)}>
      <p className="mb-2 text-sm text-glow-text-tertiary" id="baby-selector-label">
        Viewing
      </p>
      <div
        role="group"
        aria-labelledby="baby-selector-label"
        className="flex flex-wrap gap-2"
      >
        {babies.map((baby) => {
          const active = baby.id === selectedId;
          return (
            <button
              key={baby.id}
              type="button"
              aria-pressed={active}
              onClick={() => onSelect(baby.id)}
              className={cn(
                "min-h-11 rounded-2xl px-4 text-sm font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glow-primary/40",
                active
                  ? "bg-glow-primary/15 text-glow-primary"
                  : "bg-white/[0.04] text-glow-text-secondary hover:bg-white/[0.07]",
              )}
            >
              {baby.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
