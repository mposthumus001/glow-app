import type { AuStateCode, StateCount } from "../types";

/**
 * Glass badge anchors over each state on AustraliaMapSvg.
 * Percentages of viewBox (6.5 4.8 273 252.8).
 */
export const stateBadgePositions: Record<
  AuStateCode,
  { x: number; y: number }
> = {
  WA: { x: 22, y: 48 },
  NT: { x: 48, y: 26 },
  QLD: { x: 78, y: 32 },
  SA: { x: 52, y: 62 },
  NSW: { x: 88, y: 56 },
  ACT: { x: 86, y: 68 },
  VIC: { x: 74, y: 78 },
  TAS: { x: 80, y: 92 },
};

/** Demo awake counts — later from map_cluster_public level=state */
export const demoStateAwakeCounts: Record<AuStateCode, number> = {
  NSW: 684,
  VIC: 531,
  QLD: 402,
  WA: 165,
  SA: 94,
  TAS: 42,
  ACT: 30,
  NT: 28,
};

export function buildStateCounts(
  counts: Partial<Record<AuStateCode, number>> = demoStateAwakeCounts,
): StateCount[] {
  return (Object.keys(stateBadgePositions) as AuStateCode[]).map((code) => ({
    code,
    count: counts[code] ?? demoStateAwakeCounts[code],
    x: stateBadgePositions[code].x,
    y: stateBadgePositions[code].y,
  }));
}
