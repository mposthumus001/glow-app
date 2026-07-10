import type { CircleFeedMessage } from "../messaging/messageLogic";

export type ReadMarker = {
  messageId: string;
  createdAt: string;
};

export const READ_STATE_DEBOUNCE_MS = 1_500;

export function compareReadPosition(
  a: Pick<ReadMarker, "createdAt" | "messageId">,
  b: Pick<ReadMarker, "createdAt" | "messageId">,
): number {
  if (a.createdAt < b.createdAt) return -1;
  if (a.createdAt > b.createdAt) return 1;
  if (a.messageId < b.messageId) return -1;
  if (a.messageId > b.messageId) return 1;
  return 0;
}

export function isAfterReadMarker(
  message: Pick<CircleFeedMessage, "id" | "createdAt" | "status">,
  marker: ReadMarker | null,
): boolean {
  if (message.status !== "confirmed") return false;
  if (!marker) return false;
  return (
    compareReadPosition(
      { messageId: message.id, createdAt: message.createdAt },
      marker,
    ) > 0
  );
}

export function countUnreadMessages(
  messages: CircleFeedMessage[],
  marker: ReadMarker | null,
): number {
  if (!marker) return 0;
  return messages.filter((m) => isAfterReadMarker(m, marker)).length;
}

export function findFirstUnreadIndex(
  messages: CircleFeedMessage[],
  marker: ReadMarker | null,
): number | null {
  if (!marker) return null;
  const index = messages.findIndex((m) => isAfterReadMarker(m, marker));
  return index >= 0 ? index : null;
}

export function pickReadCandidateNearBottom(
  messages: CircleFeedMessage[],
): CircleFeedMessage | null {
  const confirmed = messages.filter((m) => m.status === "confirmed");
  if (confirmed.length === 0) return null;
  return confirmed[confirmed.length - 1] ?? null;
}

export function shouldAdvanceReadMarker(input: {
  candidate: Pick<CircleFeedMessage, "id" | "createdAt" | "status"> | null;
  currentMarker: ReadMarker | null;
  isNearBottom: boolean;
  isPageVisible: boolean;
  observedNewestUnread: boolean;
}): boolean {
  if (!input.candidate || input.candidate.status !== "confirmed") {
    return false;
  }
  if (!input.isPageVisible) return false;

  if (
    input.currentMarker &&
    compareReadPosition(
      {
        messageId: input.candidate.id,
        createdAt: input.candidate.createdAt,
      },
      input.currentMarker,
    ) <= 0
  ) {
    return false;
  }

  return input.isNearBottom || input.observedNewestUnread;
}

/** Monotonic merge when another device advances the marker. */
export function mergeReadMarkerMonotonic(
  local: ReadMarker | null,
  incoming: ReadMarker | null,
): ReadMarker | null {
  if (!incoming) return local;
  if (!local) return incoming;
  return compareReadPosition(incoming, local) > 0 ? incoming : local;
}

export function formatUnreadHint(count: number): string | null {
  if (count <= 0) return null;
  if (count === 1) return "1 new message";
  return `${count} new messages`;
}

export function formatNavUnreadHint(count: number): string | null {
  if (count <= 0) return null;
  if (count === 1) return "1 new";
  return `${count} new`;
}

export function markerFromMembership(input: {
  lastReadMessageId: string | null;
  lastReadAt: string | null;
  messages: CircleFeedMessage[];
}): ReadMarker | null {
  if (input.lastReadMessageId) {
    const match = input.messages.find((m) => m.id === input.lastReadMessageId);
    if (match && match.status === "confirmed") {
      return { messageId: match.id, createdAt: match.createdAt };
    }
  }

  if (input.lastReadAt) {
    const confirmed = input.messages.filter((m) => m.status === "confirmed");
    let fallback: CircleFeedMessage | null = null;
    for (const message of confirmed) {
      if (message.createdAt <= input.lastReadAt) {
        if (
          !fallback ||
          compareReadPosition(
            { messageId: message.id, createdAt: message.createdAt },
            { messageId: fallback.id, createdAt: fallback.createdAt },
          ) > 0
        ) {
          fallback = message;
        }
      }
    }
    if (fallback) {
      return { messageId: fallback.id, createdAt: fallback.createdAt };
    }
  }

  return null;
}

export function scrollTargetForFirstUnread(
  firstUnreadIndex: number | null,
  messageCount: number,
): "bottom" | "first-unread" | "none" {
  if (messageCount === 0) return "none";
  if (firstUnreadIndex == null) return "bottom";
  return "first-unread";
}
