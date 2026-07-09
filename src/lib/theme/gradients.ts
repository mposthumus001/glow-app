/**
 * Glow OS — Gradient Tokens
 *
 * Soft, atmospheric gradients for backgrounds, buttons, and accents.
 */

export const gradients = {
  primary: "linear-gradient(135deg, #B694FF 0%, #6C7BFF 100%)",
  primarySoft:
    "linear-gradient(135deg, rgba(182, 148, 255, 0.3) 0%, rgba(108, 123, 255, 0.2) 100%)",
  secondary: "linear-gradient(135deg, #6C7BFF 0%, #4F5FE0 100%)",
  accent: "linear-gradient(135deg, #FFD87A 0%, #E8BE4A 100%)",
  accentSoft:
    "linear-gradient(135deg, rgba(255, 216, 122, 0.25) 0%, rgba(232, 190, 74, 0.15) 100%)",

  /** Atmospheric background gradients */
  backgroundRadial:
    "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(182, 148, 255, 0.12) 0%, transparent 60%)",
  backgroundGlow:
    "radial-gradient(ellipse 60% 40% at 80% 20%, rgba(108, 123, 255, 0.08) 0%, transparent 50%)",
  backgroundAccent:
    "radial-gradient(ellipse 50% 30% at 20% 80%, rgba(255, 216, 122, 0.06) 0%, transparent 50%)",

  /** Text gradients */
  textPrimary: "linear-gradient(135deg, #D4BCFF 0%, #8E9AFF 100%)",
  textAccent: "linear-gradient(135deg, #FFD87A 0%, #FFE8A8 100%)",

  /** Glass highlight */
  glassHighlight:
    "linear-gradient(180deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0) 100%)",
} as const;

/** Tailwind background-image class names mapped to gradients */
export const gradientClasses = {
  primary: "bg-glow-gradient-primary",
  primarySoft: "bg-glow-gradient-primary-soft",
  secondary: "bg-glow-gradient-secondary",
  accent: "bg-glow-gradient-accent",
  textPrimary: "bg-glow-gradient-text-primary bg-clip-text text-transparent",
  textAccent: "bg-glow-gradient-text-accent bg-clip-text text-transparent",
} as const;

export type GlowGradients = typeof gradients;
export type GlowGradientClasses = typeof gradientClasses;
