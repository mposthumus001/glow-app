/**
 * Glow Atlas — shared types.
 * Presence overlays swap from demo → map_cluster_public without changing these shapes.
 */

export type AuStateCode =
  | "NSW"
  | "VIC"
  | "QLD"
  | "WA"
  | "SA"
  | "TAS"
  | "NT"
  | "ACT";

export type AtlasLevel = "country" | "state" | "city" | "suburb";

export type GlowLightKind = "cluster" | "circle" | "parent";

/** Approximate light — never an exact address pin */
export type AtlasLight = {
  id: string;
  x: number;
  y: number;
  size: number;
  kind: GlowLightKind;
  delay: number;
  duration?: number;
  breathe?: boolean;
};

export type AtlasBadge = {
  id: string;
  label: string;
  count: number;
  x: number;
  y: number;
};

export type FocusBounds = {
  /** Centre X as % of map canvas */
  cx: number;
  /** Centre Y as % of map canvas */
  cy: number;
  /** Scale factor relative to country view */
  scale: number;
};

export type AtlasState = {
  code: AuStateCode;
  name: string;
  /** Badge / focus anchor */
  x: number;
  y: number;
  focus: FocusBounds;
  awakeCount: number;
};

export type AtlasCity = {
  id: string;
  name: string;
  state: AuStateCode;
  x: number;
  y: number;
  focus: FocusBounds;
  awakeCount: number;
  weight: number;
  spread: number;
};

export type AtlasSuburb = {
  id: string;
  name: string;
  cityId: string;
  state: AuStateCode;
  x: number;
  y: number;
  focus: FocusBounds;
  awakeCount: number;
  spread: number;
};

export type AtlasSelection = {
  currentLevel: AtlasLevel;
  selectedState: AuStateCode | null;
  selectedCity: string | null;
  selectedSuburb: string | null;
};

export type AtlasPresenceSource = "demo" | "live";

export type AtlasPresence = {
  stateCounts: Record<AuStateCode, number>;
  cityCounts: Record<string, number>;
  suburbCounts: Record<string, number>;
  /** Approximate parent lights at neighbourhood level (privacy-safe) */
  suburbParents: Record<string, number>;
};
