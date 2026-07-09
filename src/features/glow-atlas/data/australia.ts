import type { FocusBounds } from "../types";

/** Permanent SVG viewBox — never change the asset geometry */
export const ATLAS_VIEWBOX = {
  minX: 6.5,
  minY: 4.8,
  width: 273,
  height: 252.8,
  string: "6.5 4.8 273 252.8",
} as const;

export const ATLAS_ASPECT = ATLAS_VIEWBOX.width / ATLAS_VIEWBOX.height;

export const COUNTRY_FOCUS: FocusBounds = {
  cx: 50,
  cy: 50,
  scale: 1,
};

export const australiaMeta = {
  id: "australia",
  name: "Australia",
  focus: COUNTRY_FOCUS,
} as const;
