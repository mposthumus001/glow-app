export function twinkleDuration(delay: number, kind: string): number {
  if (kind === "circle") return 3.8 + (delay % 2.2);
  if (kind === "parent") return 2.6 + (delay % 2.6);
  return 2.4 + (delay % 2.8);
}

export function breatheDuration(delay: number): number {
  return 5.2 + (delay % 2.4);
}

export const clusterTwinkle = {
  opacity: [0.35, 0.95, 0.4, 0.85, 0.3],
  scale: [0.9, 1.2, 0.95, 1.15, 0.9],
};

export const circlePulse = {
  opacity: [0.45, 1, 0.5, 0.9, 0.45],
  scale: [0.95, 1.45, 1, 1.3, 0.95],
};

export const parentTwinkle = {
  opacity: [0.3, 0.95, 0.35, 0.8, 0.3],
  scale: [0.9, 1.25, 0.95, 1.15, 0.9],
};

export const breatheKeyframes = {
  opacity: [0.2, 0.9, 0.3, 0.75, 0.2],
  scale: [0.85, 1.35, 0.9, 1.2, 0.85],
};
