import type { CalmCategory, CalmSound, CalmSoundId } from "./types";

/**
 * Sprint 5.3 beta sound catalogue — static typed source of truth.
 *
 * `media_library` exists in Supabase for a future CMS, but seed URLs point at
 * a non-existent CDN and categories do not match the beta IA. Prefer this
 * in-code catalogue until production assets and schema alignment land.
 */
export const CALM_CATEGORIES: readonly CalmCategory[] = [
  {
    id: "rain",
    title: "Rain",
    description: "Soft rainfall for settling nights.",
  },
  {
    id: "white-noise",
    title: "White Noise",
    description: "Steady hush for focus and rest.",
  },
  {
    id: "ocean",
    title: "Ocean",
    description: "Gentle waves, unhurried.",
  },
  {
    id: "night",
    title: "Night Sounds",
    description: "Quiet evening atmosphere.",
  },
] as const;

export const CALM_SOUNDS: readonly CalmSound[] = [
  {
    id: "soft-rain",
    title: "Soft Rain",
    categoryId: "rain",
    categoryLabel: "Rain",
    description: "A light, steady rainfall.",
    src: "/calm/placeholders/soft-rain.wav",
    continuous: true,
    visual: "rain",
    active: true,
    isPlaceholderAsset: true,
  },
  {
    id: "steady-hush",
    title: "Steady Hush",
    categoryId: "white-noise",
    categoryLabel: "White Noise",
    description: "Even white noise without sharp edges.",
    src: "/calm/placeholders/steady-hush.wav",
    continuous: true,
    visual: "hush",
    active: true,
    isPlaceholderAsset: true,
  },
  {
    id: "gentle-waves",
    title: "Gentle Waves",
    categoryId: "ocean",
    categoryLabel: "Ocean",
    description: "Soft shore waves on a slow loop.",
    src: "/calm/placeholders/gentle-waves.wav",
    continuous: true,
    visual: "ocean",
    active: true,
    isPlaceholderAsset: true,
  },
  {
    id: "quiet-evening",
    title: "Quiet Evening",
    categoryId: "night",
    categoryLabel: "Night Sounds",
    description: "A hushed night atmosphere.",
    src: "/calm/placeholders/quiet-evening.wav",
    continuous: true,
    visual: "night",
    active: true,
    isPlaceholderAsset: true,
  },
] as const;

const SOUND_BY_ID = new Map(CALM_SOUNDS.map((sound) => [sound.id, sound]));

export function getActiveSounds(): CalmSound[] {
  return CALM_SOUNDS.filter((sound) => sound.active);
}

export function getSoundById(id: string | null | undefined): CalmSound | null {
  if (!id) return null;
  return SOUND_BY_ID.get(id as CalmSoundId) ?? null;
}

export function getSoundsByCategory(categoryId: string): CalmSound[] {
  return getActiveSounds().filter((sound) => sound.categoryId === categoryId);
}

export function isCalmSoundId(value: string | null | undefined): value is CalmSoundId {
  return Boolean(value && SOUND_BY_ID.has(value as CalmSoundId));
}
