import { GlowCard } from "@/components/ui";
import { cn } from "@/lib/utils/cn";

import type { TodaySummary } from "../types";
import { activityTitle, formatDuration, formatActivityTime } from "../tracking/eventLogic";

export type TodaySummaryCardProps = {
  summary: TodaySummary;
  empty: boolean;
  className?: string;
};

export function TodaySummaryCard({
  summary,
  empty,
  className,
}: TodaySummaryCardProps) {
  return (
    <GlowCard padding="md" className={cn("border-white/[0.06]", className)}>
      <h2 className="text-base font-semibold text-glow-text">Today</h2>
      <p className="mt-1 text-sm text-glow-text-tertiary">
        A gentle snapshot — no goals, no scores.
      </p>

      {empty ? (
        <p className="mt-4 text-sm leading-relaxed text-glow-text-secondary">
          Nothing logged yet today. When you’re ready, add a feed, sleep, or
          nappy below.
        </p>
      ) : (
        <>
          <ul className="mt-4 grid grid-cols-3 gap-3">
            <li className="rounded-2xl bg-white/[0.03] px-3 py-3 text-center">
              <p className="text-lg font-semibold text-glow-text">
                {summary.feedCount}
              </p>
              <p className="mt-0.5 text-[11px] text-glow-text-tertiary">
                {summary.feedCount === 1 ? "Feed" : "Feeds"}
              </p>
            </li>
            <li className="rounded-2xl bg-white/[0.03] px-3 py-3 text-center">
              <p className="text-lg font-semibold text-glow-text">
                {summary.sleepMs > 0 ? formatDuration(summary.sleepMs) : "—"}
              </p>
              <p className="mt-0.5 text-[11px] text-glow-text-tertiary">Sleep</p>
            </li>
            <li className="rounded-2xl bg-white/[0.03] px-3 py-3 text-center">
              <p className="text-lg font-semibold text-glow-text">
                {summary.nappyCount}
              </p>
              <p className="mt-0.5 text-[11px] text-glow-text-tertiary">
                {summary.nappyCount === 1 ? "Nappy" : "Nappies"}
              </p>
            </li>
          </ul>

          {summary.mostRecent ? (
            <p className="mt-4 text-sm text-glow-text-secondary">
              Most recent:{" "}
              <span className="text-glow-text">
                {activityTitle(summary.mostRecent)}
              </span>
              <span className="text-glow-text-tertiary">
                {" "}
                · {formatActivityTime(summary.mostRecent.startedAt)}
              </span>
            </p>
          ) : null}
        </>
      )}
    </GlowCard>
  );
}
