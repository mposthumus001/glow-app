"use client";

import { useEffect, useState } from "react";

import type { CircleReactionType, ReportReason } from "@/lib/supabase/database.types";

import {
  CircleMessagingService,
  type MessagingSnapshot,
} from "./CircleMessagingService";

const emptySnapshot: MessagingSnapshot = {
  messages: [],
  status: "loading",
  error: null,
  hasEarlier: false,
  loadingEarlier: false,
  sendingClientKey: null,
  connection: "idle",
  onlineCount: 0,
  onlinePreviewNames: [],
  typingLabel: null,
  reactionsByMessage: {},
  unreadCount: 0,
  firstUnreadIndex: null,
  readMarker: null,
};

export type UseCircleMessagesResult = MessagingSnapshot & {
  send: (body: string) => Promise<{ ok: boolean; reason?: string }>;
  retry: (clientKey: string) => Promise<{ ok: boolean }>;
  loadEarlier: () => Promise<void>;
  notifyTypingActivity: () => void;
  stopTyping: () => Promise<void>;
  toggleReaction: (
    messageId: string,
    reactionType: CircleReactionType,
  ) => Promise<{ ok: boolean }>;
  updateReadObservation: (input: {
    isNearBottom: boolean;
    isPageVisible: boolean;
    observedMessageId: string | null;
  }) => void;
  setSendPromptId: (promptId: string | null) => void;
  hideMessage: (messageId: string) => Promise<{ ok: boolean }>;
  reportMessage: (input: {
    messageId: string;
    reportedParentId: string;
    reasonCode: ReportReason;
    notes: string | null;
  }) => Promise<{ ok: boolean; duplicate?: boolean }>;
};

/**
 * Binds a CircleMessagingService to React for one assigned circle.
 */
export function useCircleMessages(input: {
  circleId: string;
  parentId: string;
  authorName: string;
  enabled?: boolean;
}): UseCircleMessagesResult {
  const enabled = input.enabled ?? true;
  const [service] = useState(() => new CircleMessagingService());
  const [snapshot, setSnapshot] = useState<MessagingSnapshot>(emptySnapshot);

  useEffect(() => {
    if (!enabled) {
      void service.stop();
      return;
    }

    const unsubscribe = service.subscribe(setSnapshot);
    void service.start({
      circleId: input.circleId,
      parentId: input.parentId,
      authorName: input.authorName,
    });

    return () => {
      unsubscribe();
      void service.stop();
    };
  }, [enabled, input.circleId, input.parentId, input.authorName, service]);

  return {
    ...snapshot,
    send: (body: string) => service.send(body),
    retry: (clientKey: string) => service.retry(clientKey),
    loadEarlier: () => service.loadEarlier(),
    notifyTypingActivity: () => service.notifyTypingActivity(),
    stopTyping: () => service.stopTyping(),
    toggleReaction: (messageId, reactionType) =>
      service.toggleReaction({ messageId, reactionType }),
    updateReadObservation: (input) => service.updateReadObservation(input),
    setSendPromptId: (promptId) => service.setSendPromptId(promptId),
    hideMessage: (messageId) => service.hideMessage(messageId),
    reportMessage: (input) => service.reportMessage(input),
  };
}
