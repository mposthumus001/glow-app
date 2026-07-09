import {
  cityCoordinates,
  sparseInteriorAnchors,
} from "./cityCoordinates";
import { buildStateCounts } from "./statePositions";
import { clamp, seededGaussian, seededRandom } from "../utils/projection";
import type { GlowLight, GlowMapData } from "../types";

/**
 * Demo overlay for Glow Map.
 *
 * Tomorrow this module is replaced by a fetch from `map_cluster_public`
 * (and related presence views). GlowMap / useGlowMap already accept
 * GlowMapData — only the data source changes.
 */

const TARGET_LIGHTS = 320;
const CIRCLE_RATIO = 0.12;

function scatterAround(
  id: string,
  cx: number,
  cy: number,
  spread: number,
  index: number,
): { x: number; y: number } {
  const gx = seededGaussian(`${id}-x-${index}`);
  const gy = seededGaussian(`${id}-y-${index}`);
  return {
    x: clamp(cx + gx * spread, 1.5, 98.5),
    y: clamp(cy + gy * spread, 1.5, 98.5),
  };
}

function buildDemoLights(): GlowLight[] {
  const totalWeight =
    cityCoordinates.reduce((sum, c) => sum + c.weight, 0) +
    sparseInteriorAnchors.reduce((sum, c) => sum + c.weight, 0);

  const lights: GlowLight[] = [];
  let seq = 0;

  const placeCluster = (
    prefix: string,
    cx: number,
    cy: number,
    spread: number,
    count: number,
  ) => {
    for (let i = 0; i < count; i++) {
      const { x, y } = scatterAround(prefix, cx, cy, spread, i);
      const roll = seededRandom(`${prefix}-kind-${i}`);
      const isCircle = roll < CIRCLE_RATIO;
      const delay = seededRandom(`${prefix}-d-${i}`) * 4.5;
      const size = isCircle
        ? 3.2 + seededRandom(`${prefix}-s-${i}`) * 0.8
        : 2 + seededRandom(`${prefix}-s-${i}`) * 1.1;

      lights.push({
        id: `${prefix}-${seq++}`,
        x,
        y,
        size,
        kind: isCircle ? "circle" : "cluster",
        delay,
        duration: 2.2 + seededRandom(`${prefix}-dur-${i}`) * 3.2,
        breathe: !isCircle && seededRandom(`${prefix}-br-${i}`) > 0.72,
      });
    }
  };

  for (const city of cityCoordinates) {
    const share = city.weight / totalWeight;
    const count = Math.max(2, Math.round(TARGET_LIGHTS * share));
    placeCluster(city.id, city.x, city.y, city.spread, count);
  }

  for (const spot of sparseInteriorAnchors) {
    const share = spot.weight / totalWeight;
    const count = Math.max(1, Math.round(TARGET_LIGHTS * share));
    placeCluster(spot.id, spot.x, spot.y, spot.spread, count);
  }

  // A few intentional circle members near major metros (lavender pulse)
  const circleAnchors = [
    { id: "circ-syd", x: 96, y: 61 },
    { id: "circ-mel", x: 75.5, y: 76 },
    { id: "circ-bne", x: 95, y: 49 },
    { id: "circ-per", x: 7, y: 68 },
    { id: "circ-adl", x: 59, y: 71 },
    { id: "circ-cbr", x: 86.5, y: 68.5 },
  ];

  for (const c of circleAnchors) {
    lights.push({
      id: c.id,
      x: c.x,
      y: c.y,
      size: 3.6,
      kind: "circle",
      delay: seededRandom(c.id) * 2,
      duration: 4.2,
      breathe: true,
    });
  }

  return lights;
}

export const demoLights: GlowLight[] = buildDemoLights();

export const demoStateCounts = buildStateCounts();

export const demoTotalAwake = demoStateCounts.reduce(
  (sum, s) => sum + s.count,
  0,
);

/** Full demo payload matching the future live data shape */
export const demoGlowMapData: GlowMapData = {
  lights: demoLights,
  stateCounts: demoStateCounts,
  totalAwake: demoTotalAwake,
};

/** @deprecated Prefer demoLights — kept for brief import compatibility */
export const mockGlowLights = demoLights;
