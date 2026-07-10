import type { AtlasPresence, AuStateCode } from "@/features/glow-atlas/types";

import type { PresenceTrackPayload } from "../types";
import { isAwakeOnMap } from "../types";
import { emptyAtlasPresence } from "./emptyAtlasPresence";
import { matchAtlasSuburb } from "./matchSuburb";

function isAuState(value: string): value is AuStateCode {
  return ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "NT", "ACT"].includes(value);
}

/** Keep one payload per parent_id (latest updated_at wins). */
export function uniquePeersByParentId(
  peers: PresenceTrackPayload[],
): PresenceTrackPayload[] {
  const byId = new Map<string, PresenceTrackPayload>();

  for (const peer of peers) {
    const existing = byId.get(peer.parent_id);
    if (!existing || peer.updated_at >= existing.updated_at) {
      byId.set(peer.parent_id, peer);
    }
  }

  return [...byId.values()];
}

/**
 * Aggregate Realtime Presence peers into Atlas overlay counts.
 * No GPS — state + optional suburb_area only.
 * Counts unique parent_id only.
 */
export function peersToAtlasPresence(
  peers: PresenceTrackPayload[],
): AtlasPresence {
  const presence = emptyAtlasPresence();

  for (const peer of uniquePeersByParentId(peers)) {
    if (!isAwakeOnMap(peer.status)) continue;
    if (!isAuState(peer.state)) continue;
    if (peer.map_visibility === "hidden") continue;

    presence.stateCounts[peer.state] =
      (presence.stateCounts[peer.state] ?? 0) + 1;

    if (peer.map_visibility !== "suburb_area" || !peer.suburb_area) {
      continue;
    }

    const suburb = matchAtlasSuburb(peer.state, peer.suburb_area);
    if (!suburb) continue;

    presence.suburbCounts[suburb.id] =
      (presence.suburbCounts[suburb.id] ?? 0) + 1;
    presence.suburbParents[suburb.id] =
      (presence.suburbParents[suburb.id] ?? 0) + 1;
    presence.cityCounts[suburb.cityId] =
      (presence.cityCounts[suburb.cityId] ?? 0) + 1;
  }

  return presence;
}

export function totalAwakeFromPeers(peers: PresenceTrackPayload[]): number {
  return uniquePeersByParentId(peers).filter(
    (p) => isAwakeOnMap(p.status) && p.map_visibility !== "hidden",
  ).length;
}
