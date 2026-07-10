import type { AtlasPresence, AuStateCode } from "@/features/glow-atlas/types";

const AU_STATES: AuStateCode[] = [
  "NSW",
  "VIC",
  "QLD",
  "WA",
  "SA",
  "TAS",
  "NT",
  "ACT",
];

/** Zeroed Atlas presence — live maps must not fall back to demo counts. */
export function emptyAtlasPresence(): AtlasPresence {
  const stateCounts = Object.fromEntries(
    AU_STATES.map((code) => [code, 0]),
  ) as Record<AuStateCode, number>;

  return {
    stateCounts,
    cityCounts: {},
    suburbCounts: {},
    suburbParents: {},
  };
}
