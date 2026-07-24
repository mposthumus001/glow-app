import type { CalmSoundsMode } from "./types.ts";

export type CalmSoundsFlagInput = {
  previewEnabled: boolean;
  productionEnabled: boolean;
};

/**
 * Production takes precedence so preview placeholders can never leak when a
 * production build is enabled accidentally with both flags set.
 */
export function resolveCalmSoundsMode(
  flags: CalmSoundsFlagInput,
): CalmSoundsMode {
  if (flags.productionEnabled) return "production";
  if (flags.previewEnabled) return "preview";
  return "off";
}

export function getCalmSoundsMode(): CalmSoundsMode {
  return resolveCalmSoundsMode({
    previewEnabled:
      process.env.NEXT_PUBLIC_CALM_SOUNDS_PREVIEW_ENABLED === "true",
    productionEnabled:
      process.env.NEXT_PUBLIC_CALM_SOUNDS_ENABLED === "true",
  });
}

export function isCalmSoundsEnabled(): boolean {
  return getCalmSoundsMode() !== "off";
}
