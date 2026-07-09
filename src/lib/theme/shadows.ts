/**
 * Glow OS — Shadow Tokens
 *
 * Soft, diffused shadows with subtle colour tints.
 */

export const shadows = {
  none: "none",
  xs: "0 1px 2px rgba(6, 9, 20, 0.3)",
  sm: "0 2px 8px rgba(6, 9, 20, 0.35)",
  md: "0 4px 16px rgba(6, 9, 20, 0.4)",
  lg: "0 8px 32px rgba(6, 9, 20, 0.45)",
  xl: "0 16px 48px rgba(6, 9, 20, 0.5)",
  "2xl": "0 24px 64px rgba(6, 9, 20, 0.55)",

  /** Coloured glow shadows */
  glowPrimary: "0 4px 24px rgba(182, 148, 255, 0.25)",
  glowSecondary: "0 4px 24px rgba(108, 123, 255, 0.25)",
  glowAccent: "0 4px 24px rgba(255, 216, 122, 0.2)",

  /** Card-specific */
  card: "0 4px 24px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.04)",
  cardElevated:
    "0 8px 40px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.06)",
  cardInteractive:
    "0 2px 12px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.04)",
} as const;

export type GlowShadows = typeof shadows;
