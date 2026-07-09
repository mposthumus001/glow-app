import { clamp, seededGaussian, seededRandom } from "./projection";
import type { AtlasLight, GlowLightKind } from "../types";

export type ClusterSeed = {
  id: string;
  x: number;
  y: number;
  count: number;
  spread: number;
  circleRatio?: number;
  kind?: GlowLightKind;
};

/**
 * Scatter approximate lights around a cluster centre.
 * Deterministic from seed — stable across renders.
 */
export function buildClusterLights(seed: ClusterSeed): AtlasLight[] {
  const lights: AtlasLight[] = [];
  const circleRatio = seed.circleRatio ?? 0.1;
  const forcedKind = seed.kind;

  for (let i = 0; i < seed.count; i++) {
    const gx = seededGaussian(`${seed.id}-x-${i}`);
    const gy = seededGaussian(`${seed.id}-y-${i}`);
    const roll = seededRandom(`${seed.id}-k-${i}`);
    const kind: GlowLightKind =
      forcedKind ?? (roll < circleRatio ? "circle" : "cluster");

    const size =
      kind === "parent"
        ? 2.2 + seededRandom(`${seed.id}-s-${i}`) * 0.9
        : kind === "circle"
          ? 3.2 + seededRandom(`${seed.id}-s-${i}`) * 0.7
          : 2 + seededRandom(`${seed.id}-s-${i}`) * 1.0;

    lights.push({
      id: `${seed.id}-l-${i}`,
      x: clamp(seed.x + gx * seed.spread, 0.5, 99.5),
      y: clamp(seed.y + gy * seed.spread, 0.5, 99.5),
      size,
      kind,
      delay: seededRandom(`${seed.id}-d-${i}`) * 4.2,
      duration: 2.2 + seededRandom(`${seed.id}-dur-${i}`) * 3.4,
      breathe: kind !== "circle" && seededRandom(`${seed.id}-br-${i}`) > 0.7,
    });
  }

  return lights;
}

/**
 * Neighbourhood parent lights — ~500m privacy radius simulation.
 * Slight randomisation; never exact addresses.
 */
export function buildNeighbourhoodLights(
  suburbId: string,
  cx: number,
  cy: number,
  parentCount: number,
  spread = 0.22,
): AtlasLight[] {
  return buildClusterLights({
    id: `${suburbId}-nbhd`,
    x: cx,
    y: cy,
    count: parentCount,
    spread,
    kind: "parent",
    circleRatio: 0.18,
  }).map((light, i) => {
    // Mix a few circle members into neighbourhood view
    if (seededRandom(`${suburbId}-circ-${i}`) < 0.15) {
      return {
        ...light,
        kind: "circle" as const,
        size: 3.4,
        breathe: true,
      };
    }
    return light;
  });
}
