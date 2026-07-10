"use client";

import { useEffect, useState } from "react";

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
};

export type UseCircleMessagesResult = MessagingSnapshot & {
  send: (body: string) => Promise<{ ok: boolean; reason?: string }>;
  retry: (clientKey: string) => Promise<{ ok: boolean }>;
  loadEarlier: () => Promise<void>;
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
  };
}
