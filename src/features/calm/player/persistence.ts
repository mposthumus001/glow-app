import type { CalmPersistedPrefs, CalmSoundId } from "../types.ts";
import { isKnownCalmSoundId } from "../sounds/catalogue.ts";

export const CALM_PREFS_STORAGE_KEY = "glow.calm.prefs.v2";
export const LEGACY_CALM_PREFS_STORAGE_KEY = "glow.calm.prefs.v1";
const DEFAULT_VOLUME = 0.7;

export type CalmPersistedPrefsInput = {
  version?: 2;
  volume: number;
  favouriteSoundIds?: readonly CalmSoundId[];
  favouriteSoundId?: CalmSoundId | null;
  recentSoundId: CalmSoundId | null;
  selectedSoundId: CalmSoundId | null;
};

export type CalmLegacyCompatiblePrefs = {
  volume: number;
  favouriteSoundId: string | null;
  recentSoundId: string | null;
  selectedSoundId: string | null;
};

function clampVolume(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_VOLUME;
  return Math.min(1, Math.max(0, value));
}

export function parsePersistedPrefs(
  raw: string | null,
): CalmPersistedPrefs | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<CalmPersistedPrefs> & {
      favouriteSoundId?: unknown;
    };
    const favourites = Array.isArray(parsed.favouriteSoundIds)
      ? parsed.favouriteSoundIds
          .filter(isKnownCalmSoundId)
          .filter((id, index, all) => all.indexOf(id) === index)
      : normalizeSoundId(parsed.favouriteSoundId)
        ? [normalizeSoundId(parsed.favouriteSoundId) as CalmSoundId]
        : [];
    return {
      version: 2,
      volume: clampVolume(
        typeof parsed.volume === "number" ? parsed.volume : DEFAULT_VOLUME,
      ),
      favouriteSoundIds: favourites,
      favouriteSoundId: favourites[0] ?? null,
      recentSoundId: normalizeSoundId(parsed.recentSoundId),
      selectedSoundId: normalizeSoundId(parsed.selectedSoundId),
    };
  } catch {
    return null;
  }
}

export function serializePersistedPrefs(prefs: CalmPersistedPrefsInput): string {
  const favouriteSoundIds =
    prefs.favouriteSoundIds ??
    (prefs.favouriteSoundId ? [prefs.favouriteSoundId] : []);
  return JSON.stringify({
    version: 2,
    volume: clampVolume(prefs.volume),
    favouriteSoundIds,
    recentSoundId: prefs.recentSoundId,
    selectedSoundId: prefs.selectedSoundId,
  });
}

function normalizeSoundId(value: unknown): CalmSoundId | null {
  return isKnownCalmSoundId(value) ? value : null;
}

export function readPersistedPrefs(
  storage: Pick<Storage, "getItem"> | null | undefined,
): CalmLegacyCompatiblePrefs | null {
  const prefs = readPersistedPrefsV2(storage);
  if (!prefs) return null;
  return {
    volume: prefs.volume,
    favouriteSoundId: prefs.favouriteSoundId,
    recentSoundId: prefs.recentSoundId,
    selectedSoundId: prefs.selectedSoundId,
  };
}

export function readPersistedPrefsV2(
  storage: Pick<Storage, "getItem"> | null | undefined,
): CalmPersistedPrefs | null {
  if (!storage) return null;
  try {
    return parsePersistedPrefs(
      storage.getItem(CALM_PREFS_STORAGE_KEY) ??
        storage.getItem(LEGACY_CALM_PREFS_STORAGE_KEY),
    );
  } catch {
    return null;
  }
}

export function writePersistedPrefs(
  storage: Pick<Storage, "setItem"> | null | undefined,
  prefs: CalmPersistedPrefsInput,
): void {
  if (!storage) return;
  try {
    storage.setItem(CALM_PREFS_STORAGE_KEY, serializePersistedPrefs(prefs));
  } catch {
    // Quota / private mode — ignore; playback still works in-session.
  }
}
