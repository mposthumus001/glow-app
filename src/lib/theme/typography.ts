/**
 * Glow OS — Typography Tokens
 *
 * Clean, readable hierarchy with generous line heights.
 * Geist Sans is the primary typeface (loaded in root layout).
 */

export const typography = {
  fontFamily: {
    sans: "var(--font-geist-sans), system-ui, -apple-system, sans-serif",
    mono: "var(--font-geist-mono), ui-monospace, monospace",
  },

  fontSize: {
    xs: "0.75rem", // 12px
    sm: "0.875rem", // 14px
    base: "1rem", // 16px
    lg: "1.125rem", // 18px
    xl: "1.25rem", // 20px
    "2xl": "1.5rem", // 24px
    "3xl": "1.875rem", // 30px
    "4xl": "2.25rem", // 36px
    "5xl": "3rem", // 48px
  },

  fontWeight: {
    regular: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
  },

  lineHeight: {
    tight: "1.2",
    snug: "1.35",
    normal: "1.5",
    relaxed: "1.65",
    loose: "1.8",
  },

  letterSpacing: {
    tight: "-0.02em",
    normal: "0",
    wide: "0.02em",
    wider: "0.04em",
  },
} as const;

/** Tailwind class presets for common text styles */
export const textStyles = {
  display: "text-4xl font-bold leading-tight tracking-tight text-glow-text",
  h1: "text-3xl font-semibold leading-tight tracking-tight text-glow-text",
  h2: "text-2xl font-semibold leading-snug text-glow-text",
  h3: "text-xl font-semibold leading-snug text-glow-text",
  h4: "text-lg font-medium leading-snug text-glow-text",
  body: "text-base font-normal leading-relaxed text-glow-text",
  bodyLarge: "text-lg font-normal leading-relaxed text-glow-text",
  bodySmall: "text-sm font-normal leading-normal text-glow-text-secondary",
  caption: "text-xs font-normal leading-normal text-glow-text-tertiary",
  label: "text-sm font-medium leading-normal text-glow-text-secondary tracking-wide",
  overline:
    "text-xs font-semibold leading-normal text-glow-text-tertiary uppercase tracking-wider",
} as const;

export type GlowTypography = typeof typography;
export type GlowTextStyles = typeof textStyles;
