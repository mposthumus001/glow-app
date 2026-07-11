import type { CalmPersistedPrefs, CalmSoundId } from "../types";

export const CALM_PREFS_STORAGE_KEY = "glow.calm.prefs.v1";
const DEFAULT_VOLUME = 0.7;

const KNOWN_SOUND_IDS = new Set<string>([
  "soft-rain",
  "steady-hush",
  "gentle-waves",
  "quiet-evening",
]);

function clampVolume(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_VOLUME;
  return Math.min(1, Math.max(0, value));
}

export function parsePersistedPrefs(
  raw: string | null,
): CalmPersistedPrefs | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<CalmPersistedPrefs>;
    return {
      volume: clampVolume(
        typeof parsed.volume === "number" ? parsed.volume : DEFAULT_VOLUME,
      ),
      favouriteSoundId: normalizeSoundId(parsed.favouriteSoundId),
      recentSoundId: normalizeSoundId(parsed.recentSoundId),
      selectedSoundId: normalizeSoundId(parsed.selectedSoundId),
    };
  } catch {
    return null;
  }
}

export function serializePersistedPrefs(prefs: CalmPersistedPrefs): string {
  return JSON.stringify({
    volume: clampVolume(prefs.volume),
    favouriteSoundId: prefs.favouriteSoundId,
    recentSoundId: prefs.recentSoundId,
    selectedSoundId: prefs.selectedSoundId,
  });
}

function normalizeSoundId(value: unknown): CalmSoundId | null {
  if (typeof value !== "string") return null;
  return KNOWN_SOUND_IDS.has(value) ? (value as CalmSoundId) : null;
}

export function readPersistedPrefs(
  storage: Pick<Storage, "getItem"> | null | undefined,
): CalmPersistedPrefs | null {
  if (!storage) return null;
  try {
    return parsePersistedPrefs(storage.getItem(CALM_PREFS_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function writePersistedPrefs(
  storage: Pick<Storage, "setItem"> | null | undefined,
  prefs: CalmPersistedPrefs,
): void {
  if (!storage) return;
  try {
    storage.setItem(CALM_PREFS_STORAGE_KEY, serializePersistedPrefs(prefs));
  } catch {
    // Quota / private mode — ignore; playback still works in-session.
  }
}
