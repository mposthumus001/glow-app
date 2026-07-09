import { atlasCities } from "./cities";
import { atlasStates } from "./states";
import { atlasSuburbs } from "./suburbs";
import type { AtlasPresence, AuStateCode } from "../types";

/**
 * Demo presence for Glow Atlas v1.
 *
 * Tomorrow: replace this module's export with a fetch from
 * `map_cluster_public` (and related views). Keep the AtlasPresence shape.
 */

function buildDemoPresence(): AtlasPresence {
  const stateCounts = Object.fromEntries(
    atlasStates.map((s) => [s.code, s.awakeCount]),
  ) as Record<AuStateCode, number>;

  const cityCounts = Object.fromEntries(
    atlasCities.map((c) => [c.id, c.awakeCount]),
  );

  const suburbCounts = Object.fromEntries(
    atlasSuburbs.map((s) => [s.id, s.awakeCount]),
  );

  /** Neighbourhood parent lights — approximate, never exact addresses */
  const suburbParents = Object.fromEntries(
    atlasSuburbs.map((s) => [
      s.id,
      Math.max(5, Math.min(28, Math.round(s.awakeCount * 0.55))),
    ]),
  );

  return { stateCounts, cityCounts, suburbCounts, suburbParents };
}

export const demoPresence: AtlasPresence = buildDemoPresence();

export const demoTotalAwake = atlasStates.reduce(
  (sum, s) => sum + s.awakeCount,
  0,
);
