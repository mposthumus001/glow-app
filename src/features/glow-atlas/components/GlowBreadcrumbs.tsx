"use client";

import { ChevronRight } from "lucide-react";

import type { AtlasLevel } from "../types";
import { cn } from "@/lib/utils/cn";

export type GlowBreadcrumbsProps = {
  items: { id: string; label: string; level: AtlasLevel }[];
  onNavigate: (level: AtlasLevel) => void;
  className?: string;
};

export function GlowBreadcrumbs({
  items,
  onNavigate,
  className,
}: GlowBreadcrumbsProps) {
  return (
    <nav
      aria-label="Atlas location"
      className={cn(
        "flex max-w-[70%] flex-wrap items-center gap-0.5",
        className,
      )}
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <span key={item.id} className="flex items-center gap-0.5">
            {index > 0 ? (
              <ChevronRight
                className="h-3 w-3 shrink-0 text-glow-text-tertiary/70"
                aria-hidden="true"
              />
            ) : null}
            <button
              type="button"
              disabled={isLast}
              onClick={() => onNavigate(item.level)}
              className={cn(
                "truncate rounded-md px-1.5 py-0.5 text-[11px] font-medium tracking-wide transition-colors",
                isLast
                  ? "cursor-default text-glow-text"
                  : "text-glow-text-secondary hover:bg-white/[0.06] hover:text-glow-text",
              )}
            >
              {item.label}
            </button>
          </span>
        );
      })}
    </nav>
  );
}
