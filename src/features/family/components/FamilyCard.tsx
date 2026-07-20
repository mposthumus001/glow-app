import Link from "next/link";
import { ChevronRight, Lock } from "lucide-react";

import { GlowCard } from "@/components/ui";
import { cn } from "@/lib/utils/cn";

import { formatFamilyDate } from "../formatFamilyDate";
import type { SharedFamilyListItem } from "../types";

export type FamilyCardProps = {
  family: SharedFamilyListItem;
};

export function FamilyCard({ family }: FamilyCardProps) {
  const dateLabel = formatFamilyDate(family.updatedAt || family.createdAt);

  return (
    <Link
      href={`/family/${family.id}`}
      className={cn(
        "block rounded-glow-card focus-visible:outline-none",
        "focus-visible:ring-2 focus-visible:ring-glow-primary/40",
        "focus-visible:ring-offset-2 focus-visible:ring-offset-glow-background",
      )}
      aria-label={`${family.name}, ${family.roleLabel}, ${family.memberCount} members`}
    >
      <GlowCard
        variant="interactive"
        padding="md"
        className="border-white/[0.08]"
      >
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-lg font-semibold text-glow-text">
                {family.name}
              </h2>
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5",
                  "text-[11px] font-medium tracking-wide",
                  family.role === "owner"
                    ? "bg-glow-primary/15 text-glow-primary-light"
                    : "bg-white/[0.06] text-glow-text-secondary",
                )}
              >
                {family.roleLabel}
              </span>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-glow-text-secondary">
              <span className="inline-flex items-center gap-1">
                <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>Private</span>
              </span>
              <span>
                {family.memberCount}{" "}
                {family.memberCount === 1 ? "member" : "members"}
              </span>
              {dateLabel ? <span>Updated {dateLabel}</span> : null}
            </div>
          </div>

          <ChevronRight
            className="mt-1 h-5 w-5 shrink-0 text-glow-text-tertiary"
            aria-hidden="true"
          />
        </div>
      </GlowCard>
    </Link>
  );
}
