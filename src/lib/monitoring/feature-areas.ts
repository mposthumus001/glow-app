export const GLOW_FEATURE_AREAS = [
  "global",
  "circle",
  "atlas",
  "baby",
  "calm",
  "profile",
] as const;

export type GlowFeatureArea = (typeof GLOW_FEATURE_AREAS)[number];

export function isGlowFeatureArea(value: string): value is GlowFeatureArea {
  return (GLOW_FEATURE_AREAS as readonly string[]).includes(value);
}
