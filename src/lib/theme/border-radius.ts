/**
 * Glow OS — Border Radius Tokens
 *
 * Soft, rounded corners — Apple-inspired continuous curves.
 */

export const borderRadius = {
  none: "0",
  xs: "0.375rem", // 6px
  sm: "0.5rem", // 8px
  md: "0.75rem", // 12px
  lg: "1rem", // 16px
  xl: "1.25rem", // 20px
  "2xl": "1.5rem", // 24px
  "3xl": "1.75rem", // 28px
  "4xl": "2rem", // 32px
  full: "9999px",
} as const;

/** Semantic radius aliases */
export const radius = {
  button: borderRadius["2xl"],
  card: borderRadius["3xl"],
  input: borderRadius.xl,
  chip: borderRadius.full,
  modal: borderRadius["4xl"],
  page: borderRadius.none,
} as const;

export type GlowBorderRadius = typeof borderRadius;
export type GlowRadius = typeof radius;
