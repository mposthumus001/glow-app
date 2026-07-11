"use client";

import { GlowButton, GlowCard } from "@/components/ui";
import { cn } from "@/lib/utils/cn";

import type { BabyActivityItem } from "../types";
import { activityDetail, activityTitle, formatActivityTime } from "../tracking/eventLogic";

export type RecentActivityListProps = {
  items: BabyActivityItem[];
  hasMore: boolean;
  loadingMore: boolean;
  onLoadEarlier: () => void;
  onEdit: (item: BabyActivityItem) => void;
  onDeleteRequest: (item: BabyActivityItem) => void;
  className?: string;
};

export function RecentActivityList({
  items,
  hasMore,
  loadingMore,
  onLoadEarlier,
  onEdit,
  onDeleteRequest,
  className,
}: RecentActivityListProps) {
  return (
    <section className={cn("space-y-3", className)} aria-labelledby="recent-activity-heading">
      <div className="flex items-end justify-between gap-3">
        <h2
          id="recent-activity-heading"
          className="text-base font-semibold text-glow-text"
        >
          Recent activity
        </h2>
      </div>

      {items.length === 0 ? (
        <GlowCard padding="md" className="border-white/[0.06]">
          <p className="text-sm leading-relaxed text-glow-text-secondary">
            No activity yet. Logging a feed, sleep, or nappy will show up here —
            newest first, private to your family.
          </p>
        </GlowCard>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => {
            const detail = activityDetail(item);
            const kindLabel =
              item.kind === "feeding"
                ? "Feed"
                : item.kind === "sleep"
                  ? "Sleep"
                  : "Nappy";

            return (
              <li key={item.clientKey}>
                <GlowCard
                  padding="sm"
                  className="border-white/[0.06]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-[11px] font-medium uppercase tracking-wide text-glow-text-tertiary">
                          {kindLabel}
                        </span>
                        <span className="text-xs text-glow-text-tertiary">
                          {formatActivityTime(item.startedAt)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-medium text-glow-text">
                        {activityTitle(item)}
                      </p>
                      {detail ? (
                        <p className="mt-0.5 text-sm text-glow-text-secondary line-clamp-2">
                          {detail}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => onEdit(item)}
                        className="min-h-10 min-w-10 rounded-xl px-2 text-xs text-glow-text-secondary hover:bg-white/[0.05] hover:text-glow-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glow-primary/40"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteRequest(item)}
                        className="min-h-10 min-w-10 rounded-xl px-2 text-xs text-glow-text-tertiary hover:bg-white/[0.05] hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glow-primary/40"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </GlowCard>
              </li>
            );
          })}
        </ul>
      )}

      {hasMore ? (
        <div className="pt-1">
          <GlowButton
            type="button"
            variant="ghost"
            size="sm"
            fullWidth
            isLoading={loadingMore}
            onClick={onLoadEarlier}
          >
            Earlier activity
          </GlowButton>
        </div>
      ) : null}
    </section>
  );
}
