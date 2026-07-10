import type { CircleReactionType } from "@/lib/supabase/database.types";

export const SUPPORTED_REACTION_TYPES: readonly CircleReactionType[] = [
  "support",
  "with_you",
  "tiny_win",
  "sending_care",
];

export function isSupportedReactionType(
  value: string,
): value is CircleReactionType {
  return (SUPPORTED_REACTION_TYPES as readonly string[]).includes(value);
}

export type ReactionRow = {
  id: string;
  messageId: string;
  parentId: string;
  reactionType: CircleReactionType;
};

export type ReactionAggregate = {
  type: CircleReactionType;
  count: number;
  viewerSelected: boolean;
};

export type MessageReactions = {
  messageId: string;
  aggregates: ReactionAggregate[];
};

export function reactionRowKey(row: Pick<ReactionRow, "messageId" | "parentId" | "reactionType">): string {
  return `${row.messageId}:${row.parentId}:${row.reactionType}`;
}

export function aggregateReactions(
  rows: ReactionRow[],
  viewerParentId: string,
): Map<string, MessageReactions> {
  const byMessage = new Map<string, Map<CircleReactionType, { count: number; viewerSelected: boolean }>>();

  for (const row of rows) {
    if (!isSupportedReactionType(row.reactionType)) continue;

    let messageMap = byMessage.get(row.messageId);
    if (!messageMap) {
      messageMap = new Map();
      byMessage.set(row.messageId, messageMap);
    }

    const current = messageMap.get(row.reactionType) ?? {
      count: 0,
      viewerSelected: false,
    };

    messageMap.set(row.reactionType, {
      count: current.count + 1,
      viewerSelected:
        current.viewerSelected || row.parentId === viewerParentId,
    });
  }

  const result = new Map<string, MessageReactions>();

  for (const [messageId, typeMap] of byMessage) {
    const aggregates: ReactionAggregate[] = [];
    for (const [type, value] of typeMap) {
      if (value.count <= 0) continue;
      aggregates.push({
        type,
        count: value.count,
        viewerSelected: value.viewerSelected,
      });
    }
    aggregates.sort((a, b) => a.type.localeCompare(b.type));
    result.set(messageId, { messageId, aggregates });
  }

  return result;
}

export function applyOptimisticReactionToggle(input: {
  current: Map<string, MessageReactions>;
  messageId: string;
  reactionType: CircleReactionType;
  viewerParentId: string;
  adding: boolean;
}): Map<string, MessageReactions> {
  const next = new Map(input.current);
  const existing = next.get(input.messageId);
  const aggregates = existing?.aggregates ?? [];

  const index = aggregates.findIndex((a) => a.type === input.reactionType);
  const updated = [...aggregates];

  if (input.adding) {
    if (index >= 0) {
      const row = updated[index];
      if (row.viewerSelected) return next;
      updated[index] = {
        ...row,
        count: row.count + 1,
        viewerSelected: true,
      };
    } else {
      updated.push({
        type: input.reactionType,
        count: 1,
        viewerSelected: true,
      });
    }
  } else if (index >= 0) {
    const row = updated[index];
    if (!row.viewerSelected) return next;
    const count = row.count - 1;
    if (count <= 0) {
      updated.splice(index, 1);
    } else {
      updated[index] = { ...row, count, viewerSelected: false };
    }
  }

  updated.sort((a, b) => a.type.localeCompare(b.type));

  if (updated.length === 0) {
    next.delete(input.messageId);
  } else {
    next.set(input.messageId, { messageId: input.messageId, aggregates: updated });
  }

  return next;
}

export function reactionsForMessage(
  map: Map<string, MessageReactions>,
  messageId: string,
): ReactionAggregate[] {
  return map.get(messageId)?.aggregates ?? [];
}

export function viewerHasReaction(
  map: Map<string, MessageReactions>,
  messageId: string,
  reactionType: CircleReactionType,
): boolean {
  return (
    map
      .get(messageId)
      ?.aggregates.find((a) => a.type === reactionType)?.viewerSelected ?? false
  );
}

export function upsertReactionRow(
  rows: ReactionRow[],
  row: ReactionRow,
): ReactionRow[] {
  const key = reactionRowKey(row);
  const exists = rows.some((existing) => reactionRowKey(existing) === key);
  if (exists) return rows;
  return [...rows, row];
}

export function removeReactionRow(
  rows: ReactionRow[],
  predicate: (row: ReactionRow) => boolean,
): ReactionRow[] {
  return rows.filter((row) => !predicate(row));
}

export function replaceReactionRowId(
  rows: ReactionRow[],
  tempId: string,
  confirmed: ReactionRow,
): ReactionRow[] {
  const withoutTemp = rows.filter((row) => row.id !== tempId);
  return upsertReactionRow(withoutTemp, confirmed);
}

export function findViewerReactionRow(
  rows: ReactionRow[],
  input: {
    messageId: string;
    parentId: string;
    reactionType: CircleReactionType;
  },
): ReactionRow | undefined {
  return rows.find(
    (row) =>
      row.messageId === input.messageId &&
      row.parentId === input.parentId &&
      row.reactionType === input.reactionType,
  );
}

/** Prevent reacting to optimistic/failed messages or another circle. */
export function canReactToMessage(input: {
  messageId: string;
  circleId: string;
  activeCircleId: string;
  status: "confirmed" | "optimistic" | "failed";
}): boolean {
  if (input.circleId !== input.activeCircleId) return false;
  if (input.status !== "confirmed") return false;
  if (input.messageId.startsWith("optimistic:")) return false;
  return true;
}
