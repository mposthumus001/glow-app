import type {
  CalmCategory,
  CalmSound,
  CalmSoundId,
  CalmSoundsMode,
} from "./types.ts";
import { CALM_AUDIO_ASSET_REGISTRY } from "./assetRegistry.ts";
import { validateCalmSoundCatalogue } from "./validateCatalogue.ts";

export const CALM_SOUND_CATEGORIES: readonly CalmCategory[] = [
  {
    id: "rain",
    title: "Rain",
    description: "Soft rainfall for a quieter background.",
  },
  {
    id: "white-noise",
    title: "White Noise",
    description: "A steady, neutral wash of sound.",
  },
  {
    id: "ocean",
    title: "Ocean",
    description: "Gentle waves at an unhurried pace.",
  },
  {
    id: "night",
    title: "Night Sounds",
    description: "A quiet evening atmosphere.",
  },
] as const;

export const PREVIEW_SOUND_CATALOGUE: readonly CalmSound[] = [
  {
    id: "soft-rain",
    slug: "soft-rain",
    title: "Soft Rain",
    summary: "A light, steady rainfall.",
    category: "rain",
    categoryLabel: "Rain",
    durationLabel: "8-second test loop",
    source: { src: "/calm/placeholders/soft-rain.wav", format: "wav" },
    fileSizeBytes: 352_844,
    loop: true,
    enabled: true,
    previewOnly: true,
    productionApproved: false,
    assetVersion: "preview-1",
    checksum:
      "sha256:16925dc6e716f070ba101169527be219901057b2ccfdf2e5177010b2f53f9587",
    licenceRecordId: "soft-rain",
    attributionRequired: false,
    attributionText: null,
    visual: "rain",
  },
  {
    id: "steady-hush",
    slug: "steady-hush",
    title: "Steady Hush",
    summary: "Even white noise without sharp edges.",
    category: "white-noise",
    categoryLabel: "White Noise",
    durationLabel: "8-second test loop",
    source: { src: "/calm/placeholders/steady-hush.wav", format: "wav" },
    fileSizeBytes: 352_844,
    loop: true,
    enabled: true,
    previewOnly: true,
    productionApproved: false,
    assetVersion: "preview-1",
    checksum:
      "sha256:4d9d3119123f29cda72a7290a0e8044884e82f6aac2b220dfa8084acbe727e0b",
    licenceRecordId: "steady-hush",
    attributionRequired: false,
    attributionText: null,
    visual: "hush",
  },
  {
    id: "gentle-waves",
    slug: "gentle-waves",
    title: "Gentle Waves",
    summary: "Soft shore waves on a slow loop.",
    category: "ocean",
    categoryLabel: "Ocean",
    durationLabel: "8-second test loop",
    source: { src: "/calm/placeholders/gentle-waves.wav", format: "wav" },
    fileSizeBytes: 352_844,
    loop: true,
    enabled: true,
    previewOnly: true,
    productionApproved: false,
    assetVersion: "preview-1",
    checksum:
      "sha256:2275a413382aab61cb457ba6c8ba670662acc63bbbc85108aca25d5d5e450713",
    licenceRecordId: "gentle-waves",
    attributionRequired: false,
    attributionText: null,
    visual: "ocean",
  },
  {
    id: "quiet-evening",
    slug: "quiet-evening",
    title: "Quiet Evening",
    summary: "A hushed night atmosphere.",
    category: "night",
    categoryLabel: "Night Sounds",
    durationLabel: "8-second test loop",
    source: { src: "/calm/placeholders/quiet-evening.wav", format: "wav" },
    fileSizeBytes: 352_844,
    loop: true,
    enabled: true,
    previewOnly: true,
    productionApproved: false,
    assetVersion: "preview-1",
    checksum:
      "sha256:bcceb4c98af088ac9f971a275ac029d9701fbb9bf59afdf29c0146f6da5d3769",
    licenceRecordId: "quiet-evening",
    attributionRequired: false,
    attributionText: null,
    visual: "night",
  },
] as const;

/**
 * Intentionally empty until an asset has an approved registry record and
 * passes production validation. Preview records are never merged into this.
 */
export const PRODUCTION_SOUND_CATALOGUE: readonly CalmSound[] = [];

const ALL_KNOWN_SOUNDS = [
  ...PREVIEW_SOUND_CATALOGUE,
  ...PRODUCTION_SOUND_CATALOGUE,
] as const;
const KNOWN_BY_ID = new Map(ALL_KNOWN_SOUNDS.map((sound) => [sound.id, sound]));

export function getSoundsForMode(mode: CalmSoundsMode): readonly CalmSound[] {
  if (mode === "preview") {
    return PREVIEW_SOUND_CATALOGUE.filter(
      (sound) =>
        sound.enabled &&
        sound.previewOnly &&
        validateCalmSoundCatalogue(
          [sound],
          CALM_AUDIO_ASSET_REGISTRY,
          { production: false },
        ).length === 0,
    );
  }
  if (mode === "production") {
    return PRODUCTION_SOUND_CATALOGUE.filter(
      (sound) =>
        sound.enabled &&
        sound.productionApproved &&
        !sound.previewOnly &&
        validateCalmSoundCatalogue(
          [sound],
          CALM_AUDIO_ASSET_REGISTRY,
          { production: true },
        ).length === 0,
    );
  }
  return [];
}

export function getSoundById(
  id: string | null | undefined,
  mode: CalmSoundsMode,
): CalmSound | null {
  if (!id) return null;
  return getSoundsForMode(mode).find((sound) => sound.id === id) ?? null;
}

export function getSoundsByCategory(
  categoryId: string,
  mode: CalmSoundsMode,
): readonly CalmSound[] {
  return getSoundsForMode(mode).filter(
    (sound) => sound.category === categoryId,
  );
}

export function isKnownCalmSoundId(
  value: unknown,
): value is CalmSoundId {
  return typeof value === "string" && KNOWN_BY_ID.has(value as CalmSoundId);
}
