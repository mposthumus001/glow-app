import type {
  CalmPlayerSnapshot,
  PlaybackStatus,
  SleepTimerMinutes,
} from "../types";

export const DEFAULT_VOLUME = 0.7;
export const SLEEP_TIMER_OPTIONS: readonly SleepTimerMinutes[] = [
  0, 15, 30, 45, 60,
];

export function createInitialSnapshot(
  partial?: Partial<CalmPlayerSnapshot>,
): CalmPlayerSnapshot {
  return {
    soundId: null,
    status: "idle",
    volume: DEFAULT_VOLUME,
    errorMessage: null,
    sleepTimerMinutes: 0,
    sleepTimerEndsAt: null,
    favouriteSoundId: null,
    recentSoundId: null,
    ...partial,
  };
}

/** Stable SSR / useSyncExternalStore server snapshot — never recreated. */
export const CALM_SERVER_SNAPSHOT: CalmPlayerSnapshot = createInitialSnapshot();

/** Structural equality for Calm player snapshots (all fields are primitives / null). */
export function snapshotsEqual(
  a: CalmPlayerSnapshot,
  b: CalmPlayerSnapshot,
): boolean {
  return (
    a.soundId === b.soundId &&
    a.status === b.status &&
    a.volume === b.volume &&
    a.errorMessage === b.errorMessage &&
    a.sleepTimerMinutes === b.sleepTimerMinutes &&
    a.sleepTimerEndsAt === b.sleepTimerEndsAt &&
    a.favouriteSoundId === b.favouriteSoundId &&
    a.recentSoundId === b.recentSoundId
  );
}

/**
 * Cached snapshot store for useSyncExternalStore.
 * getSnapshot() returns the same object reference until commit/patch changes values.
 */
export class CalmSnapshotCache {
  private state: CalmPlayerSnapshot;
  private listeners = new Set<(snapshot: CalmPlayerSnapshot) => void>();

  constructor(initial: CalmPlayerSnapshot = createInitialSnapshot()) {
    this.state = initial;
  }

  getSnapshot(): CalmPlayerSnapshot {
    return this.state;
  }

  subscribe(listener: (snapshot: CalmPlayerSnapshot) => void): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Replace cache only when values change; notify listeners only then. */
  commit(next: CalmPlayerSnapshot): boolean {
    if (snapshotsEqual(this.state, next)) {
      return false;
    }
    this.state = next;
    for (const listener of this.listeners) {
      listener(this.state);
    }
    return true;
  }

  /**
   * Replace cached snapshot without notifying listeners.
   * Used for one-shot localStorage hydration during getSnapshot.
   */
  replaceSilent(next: CalmPlayerSnapshot): boolean {
    if (snapshotsEqual(this.state, next)) {
      return false;
    }
    this.state = next;
    return true;
  }

  patch(partial: Partial<CalmPlayerSnapshot>): boolean {
    return this.commit({ ...this.state, ...partial });
  }
}

/** Apply device prefs into a snapshot without autoplay / timer restore. */
export function hydrateSnapshotFromPrefs(
  current: CalmPlayerSnapshot,
  prefs: {
    volume: number;
    favouriteSoundId: CalmPlayerSnapshot["favouriteSoundId"];
    recentSoundId: CalmPlayerSnapshot["recentSoundId"];
    selectedSoundId: CalmPlayerSnapshot["soundId"];
  },
): CalmPlayerSnapshot {
  const next: CalmPlayerSnapshot = {
    ...current,
    volume: prefs.volume,
    favouriteSoundId: prefs.favouriteSoundId,
    recentSoundId: prefs.recentSoundId,
    soundId: prefs.selectedSoundId ?? prefs.recentSoundId,
    status: "idle",
    sleepTimerMinutes: 0,
    sleepTimerEndsAt: null,
    errorMessage: null,
  };
  return snapshotsEqual(current, next) ? current : next;
}

export function clampVolume(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_VOLUME;
  return Math.min(1, Math.max(0, value));
}

export function isSleepTimerMinutes(value: number): value is SleepTimerMinutes {
  return (SLEEP_TIMER_OPTIONS as readonly number[]).includes(value);
}

export function sleepTimerEndsAt(
  minutes: SleepTimerMinutes,
  nowMs: number,
): number | null {
  if (minutes === 0) return null;
  return nowMs + minutes * 60_000;
}

export function sleepTimerRemainingMs(
  endsAt: number | null,
  nowMs: number,
): number {
  if (endsAt == null) return 0;
  return Math.max(0, endsAt - nowMs);
}

export function isSleepTimerExpired(
  endsAt: number | null,
  nowMs: number,
): boolean {
  return endsAt != null && endsAt <= nowMs;
}

export function formatSleepTimerLabel(minutes: SleepTimerMinutes): string {
  if (minutes === 0) return "Off";
  return `${minutes} minutes`;
}

export function formatRemainingTimer(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function calmErrorMessage(kind: "load" | "play" | "unsupported" | "offline"): string {
  switch (kind) {
    case "load":
      return "This sound could not be loaded. Try another, or check your connection.";
    case "play":
      return "Playback could not start. Tap play again when you are ready.";
    case "unsupported":
      return "This device cannot play this sound format.";
    case "offline":
      return "This sound is unavailable offline right now.";
    default:
      return "Something went quiet. Please try again.";
  }
}

/**
 * Pure transition helpers for tests and service orchestration.
 * Selecting a new sound always leaves the previous one stopped (single owner).
 */
export function selectSoundSnapshot(
  current: CalmPlayerSnapshot,
  soundId: CalmPlayerSnapshot["soundId"],
): CalmPlayerSnapshot {
  if (soundId === current.soundId && current.status !== "error") {
    return current;
  }
  return {
    ...current,
    soundId,
    status: soundId ? "loading" : "idle",
    errorMessage: null,
    recentSoundId: soundId ?? current.recentSoundId,
  };
}

export function setStatusSnapshot(
  current: CalmPlayerSnapshot,
  status: PlaybackStatus,
  errorMessage: string | null = null,
): CalmPlayerSnapshot {
  return {
    ...current,
    status,
    errorMessage: status === "error" ? errorMessage : null,
  };
}

export function applyTimerExpiry(
  current: CalmPlayerSnapshot,
): CalmPlayerSnapshot {
  return {
    ...current,
    status: current.status === "playing" ? "paused" : current.status,
    sleepTimerMinutes: 0,
    sleepTimerEndsAt: null,
  };
}

export function clearTimerSnapshot(
  current: CalmPlayerSnapshot,
): CalmPlayerSnapshot {
  return {
    ...current,
    sleepTimerMinutes: 0,
    sleepTimerEndsAt: null,
  };
}

export function logoutSnapshot(
  current: CalmPlayerSnapshot,
): CalmPlayerSnapshot {
  return createInitialSnapshot({
    volume: current.volume,
    favouriteSoundId: current.favouriteSoundId,
    recentSoundId: current.recentSoundId,
  });
}
