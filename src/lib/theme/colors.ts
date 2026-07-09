/**
 * Glow OS — Colour Tokens
 *
 * Calm, warm palette inspired by Apple, Calm, and Headspace.
 * Use Tailwind classes (e.g. `bg-glow-background`) or these constants
 * for programmatic access (Framer Motion, canvas, etc.).
 */

export const colors = {
  background: {
    DEFAULT: "#060914",
    elevated: "#0C1020",
    sunken: "#04060D",
  },

  primary: {
    DEFAULT: "#B694FF",
    light: "#D4BCFF",
    dark: "#9A6FE8",
    muted: "rgba(182, 148, 255, 0.15)",
  },

  secondary: {
    DEFAULT: "#6C7BFF",
    light: "#8E9AFF",
    dark: "#4F5FE0",
    muted: "rgba(108, 123, 255, 0.15)",
  },

  accent: {
    DEFAULT: "#FFD87A",
    light: "#FFE8A8",
    dark: "#E8BE4A",
    muted: "rgba(255, 216, 122, 0.15)",
  },

  text: {
    DEFAULT: "#F4EEFF",
    secondary: "#B8AFCF",
    tertiary: "#827A99",
    inverse: "#060914",
    muted: "rgba(244, 238, 255, 0.6)",
  },

  card: {
    DEFAULT: "rgba(255, 255, 255, 0.06)",
    elevated: "rgba(255, 255, 255, 0.09)",
    border: "rgba(255, 255, 255, 0.12)",
    borderHover: "rgba(255, 255, 255, 0.18)",
  },

  glass: {
    background: "rgba(12, 16, 32, 0.72)",
    border: "rgba(255, 255, 255, 0.06)",
    highlight: "rgba(255, 255, 255, 0.03)",
  },

  status: {
    success: "#7AE8A0",
    warning: "#FFD87A",
    error: "#FF8A8A",
    info: "#6C7BFF",
  },

  overlay: {
    light: "rgba(6, 9, 20, 0.4)",
    medium: "rgba(6, 9, 20, 0.6)",
    heavy: "rgba(6, 9, 20, 0.85)",
  },
} as const;

export type GlowColors = typeof colors;
