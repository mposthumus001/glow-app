import type { AtlasPresence, AuStateCode } from "@/features/glow-atlas/types";
import type { MapVisibility } from "@/lib/supabase/database.types";

/** DB enum — persisted on public.presence.app_state */
export type AppState = "active" | "background" | "offline";

/**
 * Client lifecycle statuses (Sprint 3.4).
 * Away is client-side idle; DB maps it to `active` so the parent stays on the map.
 */
export type PresenceLifecycleStatus =
  | "online"
  | "away"
  | "offline"
  | "background";

export type PresenceConnectionState =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected";

export type PresenceHookStatus = "loading" | "ready" | "error";

/** Privacy-safe row from map_presence (never exact GPS). */
export type MapPresenceRow = {
  parent_id: string;
  online_status: boolean;
  app_state: AppState;
  state: AuStateCode;
  suburb_area: string | null;
  approximate_lat: number | null;
  approximate_lng: number | null;
  map_visibility: MapVisibility;
  current_circle_id: string | null;
  last_seen_at: string;
};

/** Ephemeral Realtime Presence payload — no GPS. */
export type PresenceTrackPayload = {
  parent_id: string;
  status: PresenceLifecycleStatus;
  state: AuStateCode;
  suburb_area: string | null;
  map_visibility: MapVisibility;
  updated_at: string;
};

export type PresenceSnapshot = {
  lifecycleStatus: PresenceLifecycleStatus;
  connectionState: PresenceConnectionState;
  atlasPresence: AtlasPresence;
  totalAwake: number;
  peers: PresenceTrackPayload[];
  error: string | null;
  ready: boolean;
};

export type UsePresenceResult = {
  status: PresenceHookStatus;
  /** @deprecated Prefer lifecycleStatus — maps online→active, away→active, etc. */
  appState: AppState;
  lifecycleStatus: PresenceLifecycleStatus;
  connectionState: PresenceConnectionState;
  atlasPresence: AtlasPresence;
  totalAwake: number;
  error: string | null;
  markOffline: () => Promise<void>;
  /** Event-driven refresh only — not a poller. */
  refreshMapPresence: () => Promise<void>;
};

/** Map lifecycle → DB app_state (no schema change). */
export function lifecycleToAppState(
  status: PresenceLifecycleStatus,
): AppState {
  switch (status) {
    case "online":
    case "away":
      return "active";
    case "background":
      return "background";
    case "offline":
      return "offline";
  }
}

export function isAwakeOnMap(status: PresenceLifecycleStatus): boolean {
  return status === "online" || status === "away" || status === "background";
}
