import type { CircleFeedMessage } from "../messaging/messageLogic";

export function filterVisibleMessages(
  messages: CircleFeedMessage[],
  hiddenIds: ReadonlySet<string>,
): CircleFeedMessage[] {
  if (hiddenIds.size === 0) return messages;
  return messages.filter((message) => !hiddenIds.has(message.id));
}

export function mergeHiddenIds(
  current: ReadonlySet<string>,
  messageId: string,
): Set<string> {
  const next = new Set(current);
  next.add(messageId);
  return next;
}

export function removeHiddenId(
  current: ReadonlySet<string>,
  messageId: string,
): Set<string> {
  const next = new Set(current);
  next.delete(messageId);
  return next;
}

export function isMessageHidden(
  messageId: string,
  hiddenIds: ReadonlySet<string>,
): boolean {
  return hiddenIds.has(messageId);
}
