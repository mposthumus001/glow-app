export type CalmCategoryId =
  | "rain"
  | "white-noise"
  | "ocean"
  | "night";

export type CalmSoundId =
  | "soft-rain"
  | "steady-hush"
  | "gentle-waves"
  | "quiet-evening";

export type CalmSound = {
  id: CalmSoundId;
  title: string;
  categoryId: CalmCategoryId;
  categoryLabel: string;
  description: string;
  /** Public path under /public — placeholder assets until licensed audio lands. */
  src: string;
  continuous: boolean;
  /** Soft visual treatment token for cards / player art. */
  visual: "rain" | "hush" | "ocean" | "night";
  active: boolean;
  /** True while using in-repo generated placeholders. */
  isPlaceholderAsset: boolean;
};

export type CalmCategory = {
  id: CalmCategoryId;
  title: string;
  description: string;
};

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
  favouriteSoundId: CalmSoundId | null;
  recentSoundId: CalmSoundId | null;
};

export type CalmPersistedPrefs = {
  volume: number;
  favouriteSoundId: CalmSoundId | null;
  recentSoundId: CalmSoundId | null;
  selectedSoundId: CalmSoundId | null;
};
