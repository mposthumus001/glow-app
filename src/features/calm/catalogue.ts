import {
  CALM_SOUND_CATEGORIES,
  PREVIEW_SOUND_CATALOGUE,
  PRODUCTION_SOUND_CATALOGUE,
  getSoundById as getSoundByIdForMode,
  getSoundsByCategory as getSoundsByCategoryForMode,
  getSoundsForMode,
  isKnownCalmSoundId,
} from "./sounds/catalogue.ts";
import { getCalmSoundsMode } from "./sounds/flags.ts";
import type { CalmSoundsMode } from "./sounds/types.ts";

/**
 * Compatibility facade for existing Calm and device-preferences imports. New
 * catalogue work lives under sounds/ so Support never imports audio metadata.
 */
export const CALM_CATEGORIES = CALM_SOUND_CATEGORIES;
export const CALM_SOUNDS = PREVIEW_SOUND_CATALOGUE;
export { PRODUCTION_SOUND_CATALOGUE };

export function getActiveSounds(mode = getCalmSoundsMode()) {
  return getSoundsForMode(mode);
}

export function getSoundById(
  id: string | null | undefined,
  mode: CalmSoundsMode = getCalmSoundsMode(),
) {
  return getSoundByIdForMode(id, mode);
}

export function getSoundsByCategory(
  categoryId: string,
  mode: CalmSoundsMode = getCalmSoundsMode(),
) {
  return getSoundsByCategoryForMode(categoryId, mode);
}

export const isCalmSoundId = isKnownCalmSoundId;
