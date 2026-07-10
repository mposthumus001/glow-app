import type { CircleMessagePreview } from "../types";

/** Soft UX cap — database allows up to 4000. */
export const MESSAGE_MAX_LENGTH = 2000;

export const MESSAGE_PAGE_SIZE = 30;

export type MessageDeliveryStatus = "confirmed" | "optimistic" | "failed";

export type CircleFeedMessage = {
  /** Server id when confirmed; temporary id while optimistic/failed. */
  id: string;
  /** Stable React key across optimistic → confirmed reconciliation. */
  clientKey: string;
  circleId: string;
  parentId: string;
  body: string;
  createdAt: string;
  authorName: string;
  status: MessageDeliveryStatus;
  isOwn: boolean;
  /** Set when sent in response to the daily prompt. */
  promptId?: string | null;
};

export type MessageCursor = {
  createdAt: string;
  id: string;
};

export function prepareMessageBody(
  raw: string,
):
  | { ok: true; body: string }
  | { ok: false; reason: "empty" | "too_long" } {
  const body = raw.trim();
  if (!body) return { ok: false, reason: "empty" };
  if (body.length > MESSAGE_MAX_LENGTH) {
    return { ok: false, reason: "too_long" };
  }
  return { ok: true, body };
}

export function compareMessages(
  a: Pick<CircleFeedMessage, "createdAt" | "id">,
  b: Pick<CircleFeedMessage, "createdAt" | "id">,
): number {
  if (a.createdAt < b.createdAt) return -1;
  if (a.createdAt > b.createdAt) return 1;
  if (a.id < b.id) return -1;
  if (a.id > b.id) return 1;
  return 0;
}

export function sortMessagesAscending(
  messages: CircleFeedMessage[],
): CircleFeedMessage[] {
  return [...messages].sort(compareMessages);
}

export function previewToFeedMessage(
  preview: CircleMessagePreview & {
    parentId?: string;
    circleId: string;
    promptId?: string | null;
  },
  viewerParentId: string,
): CircleFeedMessage {
  const parentId = preview.parentId ?? "";
  return {
    id: preview.id,
    clientKey: preview.id,
    circleId: preview.circleId,
    parentId,
    body: preview.body,
    createdAt: preview.createdAt,
    authorName: preview.authorName,
    status: "confirmed",
    isOwn: parentId !== "" && parentId === viewerParentId,
    promptId: preview.promptId ?? null,
  };
}

export function createOptimisticMessage(input: {
  clientKey: string;
  circleId: string;
  parentId: string;
  body: string;
  authorName: string;
  createdAt?: string;
  promptId?: string | null;
}): CircleFeedMessage {
  return {
    id: `optimistic:${input.clientKey}`,
    clientKey: input.clientKey,
    circleId: input.circleId,
    parentId: input.parentId,
    body: input.body,
    createdAt: input.createdAt ?? new Date().toISOString(),
    authorName: input.authorName,
    status: "optimistic",
    isOwn: true,
    promptId: input.promptId ?? null,
  };
}

/**
 * Insert or reconcile a confirmed message into the feed.
 * Rejects messages from another circle. Dedupes by server id and
 * reconciles matching optimistic rows from the same parent.
 */
export function upsertConfirmedMessage(
  messages: CircleFeedMessage[],
  incoming: CircleFeedMessage,
  activeCircleId: string,
): CircleFeedMessage[] {
  if (incoming.circleId !== activeCircleId) {
    return messages;
  }

  const byId = messages.findIndex((m) => m.id === incoming.id);
  if (byId >= 0) {
    const next = [...messages];
    next[byId] = {
      ...incoming,
      clientKey: messages[byId].clientKey,
      status: "confirmed",
    };
    return sortMessagesAscending(next);
  }

  const optimisticIndex = messages.findIndex(
    (m) =>
      m.status !== "confirmed" &&
      m.isOwn &&
      m.parentId === incoming.parentId &&
      m.body === incoming.body,
  );

  if (optimisticIndex >= 0) {
    const next = [...messages];
    next[optimisticIndex] = {
      ...incoming,
      clientKey: messages[optimisticIndex].clientKey,
      status: "confirmed",
    };
    return sortMessagesAscending(next);
  }

  return sortMessagesAscending([
    ...messages,
    { ...incoming, status: "confirmed" },
  ]);
}

export function markMessageFailed(
  messages: CircleFeedMessage[],
  clientKey: string,
): CircleFeedMessage[] {
  return messages.map((m) =>
    m.clientKey === clientKey ? { ...m, status: "failed" as const } : m,
  );
}

export function markMessageOptimistic(
  messages: CircleFeedMessage[],
  clientKey: string,
): CircleFeedMessage[] {
  return messages.map((m) =>
    m.clientKey === clientKey
      ? { ...m, status: "optimistic" as const }
      : m,
  );
}

export function replaceOptimisticWithConfirmed(
  messages: CircleFeedMessage[],
  clientKey: string,
  confirmed: CircleFeedMessage,
  activeCircleId: string,
): CircleFeedMessage[] {
  if (confirmed.circleId !== activeCircleId) {
    return messages.filter((m) => m.clientKey !== clientKey);
  }

  const withoutDupes = messages.filter(
    (m) => m.clientKey !== clientKey && m.id !== confirmed.id,
  );

  return sortMessagesAscending([
    ...withoutDupes,
    {
      ...confirmed,
      clientKey,
      status: "confirmed",
    },
  ]);
}

export function prependOlderMessages(
  current: CircleFeedMessage[],
  older: CircleFeedMessage[],
  activeCircleId: string,
): CircleFeedMessage[] {
  const filtered = older.filter((m) => m.circleId === activeCircleId);
  const existingIds = new Set(current.map((m) => m.id));
  const unique = filtered.filter((m) => !existingIds.has(m.id));
  return sortMessagesAscending([...unique, ...current]);
}

export function oldestCursor(
  messages: CircleFeedMessage[],
): MessageCursor | null {
  const confirmed = messages.filter((m) => m.status === "confirmed");
  if (confirmed.length === 0) return null;
  const oldest = confirmed[0];
  return { createdAt: oldest.createdAt, id: oldest.id };
}

export function shouldAutoScrollForIncoming(input: {
  isOwn: boolean;
  isNearBottom: boolean;
}): boolean {
  return input.isOwn || input.isNearBottom;
}
