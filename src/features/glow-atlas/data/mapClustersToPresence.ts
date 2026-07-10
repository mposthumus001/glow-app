import { emptyAtlasPresence, matchAtlasSuburb } from "@/features/presence";
import type { AuState } from "@/lib/supabase/database.types";

import { getSuburb } from "./suburbs";
import type { AtlasPresence, AuStateCode } from "../types";

/** Row shape from public.map_cluster_public */
export type MapClusterPublicRow = {
  id: string;
  level: "country" | "state" | "suburb_area";
  state: AuState | null;
  suburb_area: string | null;
  online_count: number;
  approximate_lat: number | null;
  approximate_lng: number | null;
  updated_at: string;
};

/**
 * Known suburb_area labels that do not match an Atlas suburb name 1:1.
 * Key: `${state}:${normalized}` or normalized label alone.
 */
const SUBURB_AREA_ALIASES: Record<string, string> = {
  "vic:inner north": "mel-brunswick",
  "inner north": "mel-brunswick",
};

function isAuState(value: string | null): value is AuStateCode {
  return (
    value !== null &&
    ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "NT", "ACT"].includes(value)
  );
}

function normalizeLabel(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ");
}

function resolveSuburb(
  state: AuStateCode,
  suburbArea: string,
) {
  const normalized = normalizeLabel(suburbArea);
  const aliasId =
    SUBURB_AREA_ALIASES[`${state.toLowerCase()}:${normalized}`] ??
    SUBURB_AREA_ALIASES[normalized];

  if (aliasId) {
    const aliased = getSuburb(aliasId);
    if (aliased) return aliased;
  }

  return matchAtlasSuburb(state, suburbArea);
}

export type MapClusterPresenceResult = {
  presence: AtlasPresence;
  /** Country-level online_count from map_cluster_public */
  countryCount: number;
};

/**
 * Map pre-aggregated map_cluster_public rows → AtlasPresence.
 *
 * DB levels: country | state | suburb_area
 * Atlas hierarchy: Australia → State → City → Suburb
 *
 * City counts are summed from matched suburb_area clusters
 * (map_clusters has no city level — privacy-safe aggregates only).
 * Lat/lng from the view are ignored for overlay placement.
 */
export function mapClustersToPresence(
  rows: MapClusterPublicRow[],
): MapClusterPresenceResult {
  const presence = emptyAtlasPresence();
  let countryCount = 0;

  for (const row of rows) {
    if (row.online_count <= 0) continue;

    if (row.level === "country") {
      countryCount = row.online_count;
      continue;
    }

    if (row.level === "state" && isAuState(row.state)) {
      presence.stateCounts[row.state] = row.online_count;
      continue;
    }

    if (
      row.level === "suburb_area" &&
      isAuState(row.state) &&
      row.suburb_area
    ) {
      const suburb = resolveSuburb(row.state, row.suburb_area);
      if (!suburb) continue;

      presence.suburbCounts[suburb.id] = row.online_count;
      presence.suburbParents[suburb.id] = Math.max(
        5,
        Math.min(28, Math.round(row.online_count * 0.55)),
      );
      presence.cityCounts[suburb.cityId] =
        (presence.cityCounts[suburb.cityId] ?? 0) + row.online_count;
    }
  }

  return { presence, countryCount };
}
