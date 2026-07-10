"use client";

import { memo, useState } from "react";

import type { ReactionAggregate } from "@/features/circles/reactions/reactionLogic";
import {
  REACTION_CATALOG,
  formatReactionCountLabel,
  type CircleReactionType,
} from "@/features/circles/reactions/reactionTypes";
import { cn } from "@/lib/utils/cn";
import { useGlowReducedMotion } from "@/lib/hooks/useGlowReducedMotion";

export interface CircleMessageReactionsProps {
  messageId: string;
  aggregates: ReactionAggregate[];
  canReact: boolean;
  onToggle: (reactionType: CircleReactionType) => Promise<{ ok: boolean }>;
}

export const CircleMessageReactions = memo(function CircleMessageReactions({
  messageId,
  aggregates,
  canReact,
  onToggle,
}: CircleMessageReactionsProps) {
  const reduceMotion = useGlowReducedMotion();
  const [expanded, setExpanded] = useState(false);
  const [pendingType, setPendingType] = useState<CircleReactionType | null>(
    null,
  );

  const visibleAggregates = aggregates.filter((item) => item.count > 0);

  async function handleToggle(type: CircleReactionType) {
    if (!canReact || pendingType) return;
    setPendingType(type);
    await onToggle(type);
    setPendingType(null);
  }

  return (
    <div className="mt-2 space-y-2">
      {visibleAggregates.length > 0 ? (
        <div
          className="flex flex-wrap gap-1.5"
          aria-label="Message reactions"
        >
          {visibleAggregates.map((aggregate) => {
            const entry = REACTION_CATALOG.find(
              (item) => item.type === aggregate.type,
            );
            if (!entry) return null;

            const label = formatReactionCountLabel(
              aggregate.type,
              aggregate.count,
            );

            return (
              <span
                key={`${messageId}:${aggregate.type}`}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs",
                  "border border-white/[0.08] bg-white/[0.03] text-glow-text-secondary",
                  aggregate.viewerSelected &&
                    "border-glow-primary/30 bg-glow-primary/10 text-glow-text",
                )}
                aria-label={label}
              >
                <span aria-hidden="true">{entry.emoji}</span>
                <span>{aggregate.count}</span>
              </span>
            );
          })}
        </div>
      ) : null}

      {canReact ? (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className={cn(
              "min-h-9 rounded-full px-3 text-xs text-glow-text-tertiary",
              "border border-white/[0.06] hover:text-glow-text-secondary",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glow-primary/50",
            )}
            aria-expanded={expanded}
            aria-controls={`reactions-${messageId}`}
          >
            {expanded ? "Close reactions" : "Send support"}
          </button>

          {expanded ? (
            <div
              id={`reactions-${messageId}`}
              className="flex flex-wrap gap-1.5"
              role="group"
              aria-label="Choose a supportive reaction"
            >
              {REACTION_CATALOG.map((entry) => {
                const selected = aggregates.some(
                  (aggregate) =>
                    aggregate.type === entry.type && aggregate.viewerSelected,
                );

                return (
                  <button
                    key={entry.type}
                    type="button"
                    disabled={pendingType != null}
                    aria-pressed={selected}
                    aria-label={`${entry.actionLabel}${selected ? ", selected" : ""}`}
                    onClick={() => {
                      void handleToggle(entry.type);
                    }}
                    className={cn(
                      "inline-flex min-h-9 items-center gap-1 rounded-full px-2.5 text-xs",
                      "border border-white/[0.08] bg-white/[0.02]",
                      "transition-colors duration-200",
                      !reduceMotion && "hover:bg-white/[0.05]",
                      selected &&
                        "border-glow-primary/35 bg-glow-primary/10 text-glow-text",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glow-primary/50",
                      "disabled:opacity-50",
                    )}
                  >
                    <span aria-hidden="true">{entry.emoji}</span>
                    <span>{entry.label}</span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
});
