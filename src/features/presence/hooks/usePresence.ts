"use client";

import { useCallback, useEffect, useState } from "react";

import { getPresenceService } from "../service/PresenceService";
import type {
  AppState,
  PresenceConnectionState,
  PresenceLifecycleStatus,
  PresenceSnapshot,
  UsePresenceResult,
} from "../types";
import { lifecycleToAppState } from "../types";
import { emptyAtlasPresence } from "../utils/emptyAtlasPresence";

const INITIAL: PresenceSnapshot = {
  lifecycleStatus: "offline",
  connectionState: "idle",
  atlasPresence: emptyAtlasPresence(),
  totalAwake: 0,
  peers: [],
  error: null,
  ready: false,
};

/**
 * React binding for PresenceService.
 * No polling — status + Atlas peer sync via Supabase Realtime Presence.
 */
export function usePresence(): UsePresenceResult {
  const [snapshot, setSnapshot] = useState<PresenceSnapshot>(INITIAL);

  useEffect(() => {
    const service = getPresenceService();
    return service.subscribe(setSnapshot);
  }, []);

  const markOffline = useCallback(async () => {
    await getPresenceService().markOffline();
  }, []);

  const refreshMapPresence = useCallback(async () => {
    await getPresenceService().refreshMapPresence();
  }, []);

  const lifecycleStatus: PresenceLifecycleStatus = snapshot.lifecycleStatus;
  const connectionState: PresenceConnectionState = snapshot.connectionState;
  const appState: AppState = lifecycleToAppState(lifecycleStatus);

  return {
    status: snapshot.ready
      ? snapshot.error
        ? "error"
        : "ready"
      : "loading",
    appState,
    lifecycleStatus,
    connectionState,
    atlasPresence: snapshot.atlasPresence,
    totalAwake: snapshot.totalAwake,
    error: snapshot.error,
    markOffline,
    refreshMapPresence,
  };
}
