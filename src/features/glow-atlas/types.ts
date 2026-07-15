/**
 * Glow Atlas — shared types.
 * Counts come from map_cluster_public → AtlasPresence (hierarchy unchanged).
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
  /** Stagger for fade-in when cluster count grows */
  enterStagger?: number;
  /** Slight opacity variation (0–1) for visual depth */
  baseOpacity?: number;
};

export type AtlasBadge = {
  id: string;
  label: string;
  count: number;
  x: number;
  y: number;
  /** Data-driven disclosure preference — see utils/disclosure.ts */
  featured?: boolean;
  featuredPriority?: number;
};

export type FocusBounds = {
  /** Centre X as % of map canvas */
  cx: number;
  /** Centre Y as % of map canvas */
  cy: number;
  /** Scale factor relative to country view */
  scale: number;
};

/** A real-world coordinate — the geographic source of truth for an anchor. */
export type GeoPoint = {
  lat: number;
  lng: number;
};

/**
 * A small, documented display-only nudge away from the geographic anchor
 * (coastal clipping, badge collision, or legibility). Geography is never
 * overwritten — only adjusted for display, with a required `reason`.
 */
export type DisplayOffset = {
  dx: number;
  dy: number;
  reason: string;
};

export type AtlasState = {
  code: AuStateCode;
  name: string;
  /** Geographic source of truth (approximate landmass centroid, not capital) */
  geo: GeoPoint;
  /** Documented display exception, if any */
  displayOffset?: DisplayOffset;
  /** Derived badge / focus anchor (% of viewBox) — see `geo` for source of truth */
  x: number;
  y: number;
  focus: FocusBounds;
  awakeCount: number;
};

export type AtlasCity = {
  id: string;
  name: string;
  state: AuStateCode;
  geo: GeoPoint;
  displayOffset?: DisplayOffset;
  x: number;
  y: number;
  focus: FocusBounds;
  awakeCount: number;
  weight: number;
  spread: number;
  /** Data-driven disclosure preference (replaces per-state allowlists) */
  featured?: boolean;
  /** Lower sorts first among featured cities within a state; ties broken by count */
  featuredPriority?: number;
};

export type AtlasSuburb = {
  id: string;
  name: string;
  cityId: string;
  state: AuStateCode;
  geo: GeoPoint;
  displayOffset?: DisplayOffset;
  x: number;
  y: number;
  focus: FocusBounds;
  awakeCount: number;
  spread: number;
  featured?: boolean;
  featuredPriority?: number;
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
