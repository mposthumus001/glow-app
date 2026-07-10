/** Circle presence + typing timing (Sprint 4.3). */

/** Wait after input before publishing typing=true. */
export const TYPING_PUBLISH_DELAY_MS = 300;

/** Re-broadcast typing while the parent is still actively typing. */
export const TYPING_REFRESH_MS = 2000;

/** Drop a peer's typing indicator if no refresh arrives. */
export const TYPING_EXPIRE_MS = 3000;

/** Max first names shown before collapsing to a count phrase. */
export const TYPING_VISIBLE_NAME_CAP = 2;

export const PRESENCE_RECONNECT_BASE_MS = 1_000;
export const PRESENCE_RECONNECT_MAX_MS = 30_000;

export type CircleConnectionState =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected";

/** Ephemeral Realtime Presence payload — privacy-safe only. */
export type CirclePresencePayload = {
  parentId: string;
  /** First name / short display name only. */
  displayName: string;
};

/** Ephemeral Broadcast payload for typing. */
export type CircleTypingPayload = {
  parentId: string;
  displayName: string;
  typing: boolean;
  at: number;
};

export type CircleTypingPeer = {
  parentId: string;
  displayName: string;
  expiresAt: number;
};

export function firstDisplayName(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "A parent";
  return trimmed.split(/\s+/)[0] ?? trimmed;
}

/**
 * Deduplicate presence metas by parentId.
 * Multiple tabs/devices for one parent count as one.
 */
export function uniquePresenceByParentId(
  peers: CirclePresencePayload[],
): CirclePresencePayload[] {
  const byId = new Map<string, CirclePresencePayload>();
  for (const peer of peers) {
    if (!peer.parentId) continue;
    byId.set(peer.parentId, {
      parentId: peer.parentId,
      displayName: firstDisplayName(peer.displayName),
    });
  }
  return [...byId.values()];
}

export function countUniqueOnlineParents(
  peers: CirclePresencePayload[],
): number {
  return uniquePresenceByParentId(peers).length;
}

export function formatOnlinePresenceCopy(input: {
  onlineCount: number;
  memberCount: number;
  previewNames?: string[];
}): string {
  const { onlineCount, memberCount, previewNames = [] } = input;
  const memberLabel =
    memberCount === 1 ? "1 parent" : `${memberCount} parents`;

  // 0–1 unique parents in-channel ≈ only you (or not yet tracked).
  if (onlineCount <= 1) {
    return `${memberLabel} · You're the first one here tonight`;
  }

  if (onlineCount === 2 && previewNames.length >= 1) {
    return `${memberLabel} · ${previewNames[0]} is here with you`;
  }

  if (onlineCount <= 5) {
    return `${memberLabel} · A few parents are here`;
  }

  return `${memberLabel} · ${onlineCount} here now`;
}

/**
 * Apply a typing broadcast into the local peer map.
 * Excludes the viewer. Dedupes by parentId.
 */
export function applyTypingEvent(
  current: CircleTypingPeer[],
  event: CircleTypingPayload,
  viewerParentId: string,
  now = Date.now(),
): CircleTypingPeer[] {
  if (event.parentId === viewerParentId) return current;

  const without = current.filter((p) => p.parentId !== event.parentId);

  if (!event.typing) {
    return without;
  }

  return [
    ...without,
    {
      parentId: event.parentId,
      displayName: firstDisplayName(event.displayName),
      expiresAt: now + TYPING_EXPIRE_MS,
    },
  ];
}

export function applyTypingEventForCircle(
  current: CircleTypingPeer[],
  event: CircleTypingPayload,
  viewerParentId: string,
  activeCircleId: string,
  eventCircleId: string,
  now = Date.now(),
): CircleTypingPeer[] {
  if (eventCircleId !== activeCircleId) return current;
  return applyTypingEvent(current, event, viewerParentId, now);
}

export function clearExpiredTyping(
  peers: CircleTypingPeer[],
  now = Date.now(),
): CircleTypingPeer[] {
  return peers.filter((p) => p.expiresAt > now);
}

export function formatTypingIndicatorCopy(
  peers: CircleTypingPeer[],
  viewerParentId: string,
): string | null {
  const unique = new Map<string, CircleTypingPeer>();
  for (const peer of peers) {
    if (peer.parentId === viewerParentId) continue;
    unique.set(peer.parentId, peer);
  }

  const list = [...unique.values()];
  if (list.length === 0) return null;

  if (list.length === 1) {
    return `${list[0].displayName} is typing…`;
  }

  if (list.length === 2) {
    return `${list[0].displayName} and ${list[1].displayName} are typing…`;
  }

  if (list.length <= TYPING_VISIBLE_NAME_CAP + 1) {
    return `${list[0].displayName} and ${list.length - 1} others are typing…`;
  }

  return `A few parents are typing…`;
}

export function shouldIgnorePresenceForCircle(
  activeCircleId: string,
  eventCircleId: string,
): boolean {
  return activeCircleId !== eventCircleId;
}

export function reconnectBackoffMs(attempt: number): number {
  return Math.min(
    PRESENCE_RECONNECT_MAX_MS,
    PRESENCE_RECONNECT_BASE_MS * 2 ** Math.max(0, attempt),
  );
}
