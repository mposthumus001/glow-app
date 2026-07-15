// Deliberately relative, not the `@/` alias — this is a pure, framework-
// free module (no React, no Supabase client), and the project's plain
// `node --test` runner (see package.json's `test` script) has no loader
// configured to resolve `@/` path aliases, only real relative specifiers.
// Importing the exact submodules below (rather than `@/features/presence`'s
// barrel) also keeps this module's own dependency graph pure — the barrel
// re-exports several "use client" hooks and a Supabase realtime service
// this file never touches.
import { emptyAtlasPresence } from "../../presence/utils/emptyAtlasPresence.ts";
import { matchAtlasSuburb, normalizeLabel } from "../../presence/utils/matchSuburb.ts";
import type { AuState } from "../../../lib/supabase/database.types.ts";

import { getSuburb } from "./suburbs.ts";
import type { AtlasPresence, AuStateCode } from "../types.ts";

/**
 * Row shape from public.map_cluster_public, restricted to the columns the
 * client actually consumes. `approximate_lat`/`approximate_lng` exist on
 * the view but are intentionally never selected or typed here — overlay
 * placement always comes from Atlas's own static anchors (see
 * utils/projection.ts), never from per-cluster coordinates.
 */
export type MapClusterPublicRow = {
  id: string;
  level: "country" | "state" | "suburb_area";
  state: AuState | null;
  suburb_area: string | null;
  online_count: number;
  updated_at: string;
};

/**
 * Suburb-level clusters must already satisfy k-anonymity (online_count >= 5)
 * in the `map_cluster_public` view. This constant duplicates that floor as
 * defense-in-depth: if the view definition ever regresses, the client still
 * refuses to render an identifiable small cluster.
 */
const MIN_SUBURB_CLUSTER_SIZE = 5;

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
      if (row.online_count < MIN_SUBURB_CLUSTER_SIZE) continue;

      const suburb = resolveSuburb(row.state, row.suburb_area);
      if (!suburb) continue;

      // Accumulate (not overwrite) — a fuzzy-matched suburb_area label can
      // collide with another raw label onto the same Atlas suburb, and
      // every match must still be counted rather than silently dropped.
      presence.suburbCounts[suburb.id] =
        (presence.suburbCounts[suburb.id] ?? 0) + row.online_count;
      presence.cityCounts[suburb.cityId] =
        (presence.cityCounts[suburb.cityId] ?? 0) + row.online_count;
    }
  }

  for (const suburbId of Object.keys(presence.suburbCounts)) {
    presence.suburbParents[suburbId] = Math.max(
      5,
      Math.min(28, Math.round(presence.suburbCounts[suburbId] * 0.55)),
    );
  }

  return { presence, countryCount };
}

function shallowNumberRecordEqual(
  a: Record<string, number>,
  b: Record<string, number>,
): boolean {
  if (a === b) return true;
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  for (const key of aKeys) {
    if (a[key] !== b[key]) return false;
  }
  return true;
}

/**
 * Re-derive `next` but reuse `prev`'s field references (and, if nothing at
 * all changed, `prev` itself) wherever the values are numerically identical.
 * `mapClustersToPresence` always builds a fresh object graph, which would
 * otherwise invalidate every `useMemo` in `useGlowAtlas` keyed on
 * `presence.stateCounts` / `cityCounts` / etc. on every realtime tick even
 * when nothing actually changed.
 */
export function reconcilePresence(
  prev: AtlasPresence,
  next: AtlasPresence,
): AtlasPresence {
  const stateCounts = shallowNumberRecordEqual(prev.stateCounts, next.stateCounts)
    ? prev.stateCounts
    : next.stateCounts;
  const cityCounts = shallowNumberRecordEqual(prev.cityCounts, next.cityCounts)
    ? prev.cityCounts
    : next.cityCounts;
  const suburbCounts = shallowNumberRecordEqual(
    prev.suburbCounts,
    next.suburbCounts,
  )
    ? prev.suburbCounts
    : next.suburbCounts;
  const suburbParents = shallowNumberRecordEqual(
    prev.suburbParents,
    next.suburbParents,
  )
    ? prev.suburbParents
    : next.suburbParents;

  if (
    stateCounts === prev.stateCounts &&
    cityCounts === prev.cityCounts &&
    suburbCounts === prev.suburbCounts &&
    suburbParents === prev.suburbParents
  ) {
    return prev;
  }

  return { stateCounts, cityCounts, suburbCounts, suburbParents };
}
