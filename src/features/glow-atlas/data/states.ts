import type { AtlasState, AuStateCode } from "../types";

/**
 * State anchors + zoom focus for Glow Atlas.
 * Coordinates are % of the permanent Australia SVG viewBox.
 */
export const atlasStates: AtlasState[] = [
  {
    code: "WA",
    name: "Western Australia",
    x: 22,
    y: 48,
    awakeCount: 165,
    focus: { cx: 22, cy: 50, scale: 2.1 },
  },
  {
    code: "NT",
    name: "Northern Territory",
    x: 48,
    y: 26,
    awakeCount: 28,
    focus: { cx: 48, cy: 32, scale: 2.3 },
  },
  {
    code: "QLD",
    name: "Queensland",
    x: 78,
    y: 32,
    awakeCount: 402,
    focus: { cx: 78, cy: 40, scale: 2.0 },
  },
  {
    code: "SA",
    name: "South Australia",
    x: 52,
    y: 62,
    awakeCount: 94,
    focus: { cx: 52, cy: 62, scale: 2.4 },
  },
  {
    code: "NSW",
    name: "New South Wales",
    x: 88,
    y: 56,
    awakeCount: 684,
    focus: { cx: 86, cy: 58, scale: 2.8 },
  },
  {
    code: "ACT",
    name: "Australian Capital Territory",
    x: 86,
    y: 68,
    awakeCount: 30,
    focus: { cx: 86, cy: 68, scale: 4.5 },
  },
  {
    code: "VIC",
    name: "Victoria",
    x: 74,
    y: 78,
    awakeCount: 531,
    // Softer zoom so city badges stay comfortably inside the card
    focus: { cx: 73.5, cy: 76.5, scale: 3.15 },
  },
  {
    code: "TAS",
    name: "Tasmania",
    x: 80,
    y: 92,
    awakeCount: 42,
    focus: { cx: 80, cy: 90, scale: 3.8 },
  },
];

export const atlasStatesByCode: Record<AuStateCode, AtlasState> =
  Object.fromEntries(atlasStates.map((s) => [s.code, s])) as Record<
    AuStateCode,
    AtlasState
  >;

export function getState(code: AuStateCode): AtlasState {
  return atlasStatesByCode[code];
}
