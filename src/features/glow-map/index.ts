export { GlowMap } from "./components/GlowMap";
export { GlowLight } from "./components/GlowLight";
export { GlowParticles } from "./components/GlowParticles";
export { StateBadge, StateCountBubble } from "./components/StateBadge";
export { GlowLegend } from "./components/GlowLegend";
export { GlowMapOverlay } from "./components/GlowMapOverlay";
export {
  AustraliaMapSvg,
  AUSTRALIA_MAP_VIEWBOX,
} from "./components/AustraliaMapSvg";
export type { AustraliaMapSvgProps } from "./components/AustraliaMapSvg";

export { useGlowMap } from "./hooks/useGlowMap";
export type { UseGlowMapOptions, GlowMapSource } from "./hooks/useGlowMap";

export {
  demoLights,
  demoGlowMapData,
  demoStateCounts,
  demoTotalAwake,
  mockGlowLights,
} from "./data/demoLights";
export { mockStateCounts } from "./data/stateCounts";
export { cityCoordinates } from "./data/cityCoordinates";
export {
  stateBadgePositions,
  buildStateCounts,
  demoStateAwakeCounts,
} from "./data/statePositions";

export { latLngToPercent, svgToPercent, MAP_VIEWBOX } from "./utils/projection";

export type {
  AuStateCode,
  GlowLight as GlowLightData,
  GlowLightKind,
  GlowMapData,
  GlowMapProps,
  StateCount,
} from "./types";
