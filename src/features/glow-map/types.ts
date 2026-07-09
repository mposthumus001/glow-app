export type AuStateCode =
  | "NSW"
  | "VIC"
  | "QLD"
  | "WA"
  | "SA"
  | "TAS"
  | "NT"
  | "ACT";

export type GlowLightKind = "cluster" | "circle";

/**
 * Approximate light on the map — never an exact address pin.
 * x/y are percentages of the Australia SVG bounding box.
 */
export type GlowLight = {
  id: string;
  /** 0–100 percentage across the map canvas */
  x: number;
  /** 0–100 percentage down the map canvas */
  y: number;
  /** Diameter in px (typically 2–3 for clusters, ~3.5 for circles) */
  size: number;
  kind: GlowLightKind;
  /** Stagger for pulse / fade animations */
  delay: number;
  /** Duration multiplier for desynchronized twinkle */
  duration?: number;
  /** Optional slower fade-in/out “alive” cycle */
  breathe?: boolean;
};

export type StateCount = {
  code: AuStateCode;
  count: number;
  /** Badge anchor as % of map canvas */
  x: number;
  y: number;
};

/**
 * Map overlay data contract.
 * Today: demoLights / mockStateCounts.
 * Tomorrow: map_cluster_public (and related views) — swap only the data source.
 */
export type GlowMapData = {
  lights: GlowLight[];
  stateCounts: StateCount[];
  totalAwake: number;
};

export type GlowMapProps = {
  className?: string;
  /** Override data; defaults to useGlowMap() demo source */
  data?: GlowMapData;
  caption?: string;
  helperText?: string;
  showLegend?: boolean;
};
