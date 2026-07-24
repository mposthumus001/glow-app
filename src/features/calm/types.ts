import type { CalmSoundId } from "./sounds/types.ts";

export type {
  CalmCategory,
  CalmCategoryId,
  CalmSound,
  CalmSoundFormat,
  CalmSoundId,
  CalmSoundsMode,
} from "./sounds/types.ts";

export type PlaybackStatus =
  | "idle"
  | "loading"
  | "playing"
  | "paused"
  | "error";

export type SleepTimerMinutes = 0 | 15 | 30 | 45 | 60;

export type CalmPlayerSnapshot = {
  soundId: CalmSoundId | null;
  status: PlaybackStatus;
  volume: number;
  errorMessage: string | null;
  sleepTimerMinutes: SleepTimerMinutes;
  /** Absolute epoch ms when the timer should stop playback; null if off. */
  sleepTimerEndsAt: number | null;
  favouriteSoundIds: readonly CalmSoundId[];
  recentSoundId: CalmSoundId | null;
};

export type CalmPersistedPrefs = {
  version: 2;
  volume: number;
  favouriteSoundIds: readonly CalmSoundId[];
  /** Compatibility alias for the first favourite in legacy settings UI. */
  favouriteSoundId: string | null;
  recentSoundId: string | null;
  selectedSoundId: string | null;
};
