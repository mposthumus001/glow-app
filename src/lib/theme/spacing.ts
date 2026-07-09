/**
 * Glow OS — Spacing Tokens
 *
 * 4px base grid for consistent rhythm across the app.
 */

export const spacing = {
  0: "0",
  px: "1px",
  0.5: "0.125rem", // 2px
  1: "0.25rem", // 4px
  1.5: "0.375rem", // 6px
  2: "0.5rem", // 8px
  2.5: "0.625rem", // 10px
  3: "0.75rem", // 12px
  3.5: "0.875rem", // 14px
  4: "1rem", // 16px
  5: "1.25rem", // 20px
  6: "1.5rem", // 24px
  7: "1.75rem", // 28px
  8: "2rem", // 32px
  9: "2.25rem", // 36px
  10: "2.5rem", // 40px
  11: "2.75rem", // 44px
  12: "3rem", // 48px
  14: "3.5rem", // 56px
  16: "4rem", // 64px
  20: "5rem", // 80px
  24: "6rem", // 96px
} as const;

/** Semantic spacing for layout patterns */
export const layout = {
  pagePaddingX: spacing[6],
  pagePaddingY: spacing[6],
  sectionGap: spacing[8],
  cardPadding: spacing[6],
  cardPaddingSm: spacing[4],
  cardPaddingLg: spacing[8],
  bottomNavHeight: spacing[16],
  safeAreaBottom: "env(safe-area-inset-bottom, 0px)",
  safeAreaTop: "env(safe-area-inset-top, 0px)",
} as const;

export type GlowSpacing = typeof spacing;
export type GlowLayout = typeof layout;
