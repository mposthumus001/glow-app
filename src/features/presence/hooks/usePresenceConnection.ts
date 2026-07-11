"use client";

import { useEffect, useState } from "react";

import { getPresenceService } from "../service/PresenceService";
import type { PresenceConnectionState } from "../types";

/**
 * Shell-safe presence binding — only connectionState.
 * Avoids rerendering the app shell on every peer presence sync.
 */
export function usePresenceConnection(): PresenceConnectionState {
  const [connectionState, setConnectionState] =
    useState<PresenceConnectionState>("idle");

  useEffect(() => {
    const service = getPresenceService();
    return service.subscribe((snapshot) => {
      setConnectionState((prev) =>
        prev === snapshot.connectionState ? prev : snapshot.connectionState,
      );
    });
  }, []);

  return connectionState;
}
