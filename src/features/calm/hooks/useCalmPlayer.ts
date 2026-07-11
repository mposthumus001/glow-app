"use client";

import { useEffect, useSyncExternalStore } from "react";

import { getCalmPlayerService } from "../player/CalmPlayerService";
import type { CalmPlayerSnapshot } from "../types";
import { CALM_SERVER_SNAPSHOT } from "../player/playerLogic";

export function subscribeCalmPlayer(onStoreChange: () => void): () => void {
  return getCalmPlayerService().subscribe(() => {
    onStoreChange();
  });
}

/**
 * Client snapshot getter for useSyncExternalStore.
 * Returns the store-owned cached object (same reference when unchanged).
 */
export function getClientSnapshot(): CalmPlayerSnapshot {
  return getCalmPlayerService().getSnapshot();
}

export function getServerSnapshot(): CalmPlayerSnapshot {
  return CALM_SERVER_SNAPSHOT;
}

/**
 * React binding to the shell-owned Calm player singleton.
 */
export function useCalmPlayer(): CalmPlayerSnapshot {
  return useSyncExternalStore(
    subscribeCalmPlayer,
    getClientSnapshot,
    getServerSnapshot,
  );
}

/**
 * Keeps the player service alive for the authenticated shell lifetime so
 * playback survives route changes without recreating the audio element.
 * Does not subscribe the shell to every playback tick.
 */
export function useCalmPlayerLifecycle(): void {
  useEffect(() => {
    const service = getCalmPlayerService();
    return service.subscribe(() => {
      // Intentionally empty — ownership only.
    });
  }, []);
}
