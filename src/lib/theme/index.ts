export { colors } from "./colors";
export type { GlowColors } from "./colors";

export { typography, textStyles } from "./typography";
export type { GlowTypography, GlowTextStyles } from "./typography";

export { borderRadius, radius } from "./border-radius";
export type { GlowBorderRadius, GlowRadius } from "./border-radius";

export { spacing, layout } from "./spacing";
export type { GlowSpacing, GlowLayout } from "./spacing";

export { shadows } from "./shadows";
export type { GlowShadows } from "./shadows";

export { gradients, gradientClasses } from "./gradients";
export type { GlowGradients, GlowGradientClasses } from "./gradients";

import { colors } from "./colors";
import { typography, textStyles } from "./typography";
import { borderRadius, radius } from "./border-radius";
import { spacing, layout } from "./spacing";
import { shadows } from "./shadows";
import { gradients, gradientClasses } from "./gradients";

/** Unified Glow OS theme object */
export const glowTheme = {
  colors,
  typography,
  textStyles,
  borderRadius,
  radius,
  spacing,
  layout,
  shadows,
  gradients,
  gradientClasses,
} as const;

export type GlowTheme = typeof glowTheme;
