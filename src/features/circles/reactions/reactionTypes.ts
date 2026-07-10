import type { CircleReactionType } from "@/lib/supabase/database.types";

export type { CircleReactionType };

export type ReactionCatalogEntry = {
  type: CircleReactionType;
  emoji: string;
  label: string;
  /** Accessible verb phrase, e.g. "Send support" */
  actionLabel: string;
  /** Aggregate count phrase, e.g. "parents sent support" */
  countNoun: string;
};

/** Curated supportive reactions — no picker, no downvotes. */
export const REACTION_CATALOG: readonly ReactionCatalogEntry[] = [
  {
    type: "support",
    emoji: "💜",
    label: "Support",
    actionLabel: "Send support",
    countNoun: "parents sent support",
  },
  {
    type: "with_you",
    emoji: "🌙",
    label: "With you",
    actionLabel: "Send with you",
    countNoun: "parents are with you",
  },
  {
    type: "tiny_win",
    emoji: "✨",
    label: "Tiny win",
    actionLabel: "Celebrate a tiny win",
    countNoun: "parents noted a tiny win",
  },
  {
    type: "sending_care",
    emoji: "🤍",
    label: "Sending care",
    actionLabel: "Send care",
    countNoun: "parents sent care",
  },
] as const;

export { SUPPORTED_REACTION_TYPES, isSupportedReactionType } from "./reactionLogic";

export function reactionCatalogEntry(
  type: CircleReactionType,
): ReactionCatalogEntry {
  const entry = REACTION_CATALOG.find((item) => item.type === type);
  if (!entry) {
    return REACTION_CATALOG[0];
  }
  return entry;
}

export function formatReactionCountLabel(
  type: CircleReactionType,
  count: number,
): string {
  if (count <= 0) return "";
  const entry = reactionCatalogEntry(type);
  if (count === 1) return `1 parent ${entry.countNoun.replace(/^parents /, "")}`;
  return `${count} ${entry.countNoun}`;
}
