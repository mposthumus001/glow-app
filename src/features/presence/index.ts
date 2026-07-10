export { usePresence } from "./hooks/usePresence";
export {
  getPresenceService,
  PresenceService,
} from "./service/PresenceService";
export { markPresenceOffline, fetchMapPresence } from "./api";
export { emptyAtlasPresence } from "./utils/emptyAtlasPresence";
export { toAtlasPresence } from "./utils/toAtlasPresence";
export { peersToAtlasPresence, uniquePeersByParentId } from "./utils/peersToAtlasPresence";
export { matchAtlasSuburb } from "./utils/matchSuburb";
export {
  lifecycleToAppState,
  isAwakeOnMap,
} from "./types";
export type {
  AppState,
  MapPresenceRow,
  PresenceConnectionState,
  PresenceHookStatus,
  PresenceLifecycleStatus,
  PresenceSnapshot,
  PresenceTrackPayload,
  UsePresenceResult,
} from "./types";
