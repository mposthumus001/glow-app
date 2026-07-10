import type { AtlasPresence, AuStateCode } from "@/features/glow-atlas/types";

import type { MapPresenceRow } from "../types";
import { emptyAtlasPresence } from "./emptyAtlasPresence";
import { matchAtlasSuburb } from "./matchSuburb";

function isAuState(value: string): value is AuStateCode {
  return ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "NT", "ACT"].includes(value);
}

/**
 * Aggregate privacy-safe map_presence rows into Atlas overlay counts.
 * state_only → state badges only.
 * suburb_area → state + matched city/suburb (never lat/lng).
 */
export function toAtlasPresence(rows: MapPresenceRow[]): AtlasPresence {
  const presence = emptyAtlasPresence();

  for (const row of rows) {
    if (!isAuState(row.state)) continue;

    presence.stateCounts[row.state] =
      (presence.stateCounts[row.state] ?? 0) + 1;

    if (row.map_visibility !== "suburb_area" || !row.suburb_area) {
      continue;
    }

    const suburb = matchAtlasSuburb(row.state, row.suburb_area);
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

export function totalAwakeFromPresence(presence: AtlasPresence): number {
  return Object.values(presence.stateCounts).reduce((sum, n) => sum + n, 0);
}
