import { getSoundById } from "../catalogue";
import type {
  CalmPlayerSnapshot,
  CalmSoundId,
  SleepTimerMinutes,
} from "../types";
import {
  readPersistedPrefs,
  writePersistedPrefs,
} from "./persistence";
import {
  applyTimerExpiry,
  calmErrorMessage,
  clampVolume,
  clearTimerSnapshot,
  hydrateSnapshotFromPrefs,
  isSleepTimerExpired,
  isSleepTimerMinutes,
  logoutSnapshot,
  sleepTimerEndsAt,
  CalmSnapshotCache,
} from "./playerLogic";

/**
 * Single owner of Calm playback for the authenticated shell.
 *
 * - One HTMLAudioElement for the whole app session
 * - Survives route changes while AppShell is mounted
 * - Never auto-resumes audible playback after a full page refresh
 * - Stops on logout / explicit stop
 * - Caches one snapshot object; replaces it only on meaningful change
 */
export class CalmPlayerService {
  private audio: HTMLAudioElement | null = null;
  private refCount = 0;
  private readonly cache = new CalmSnapshotCache();
  private timerWatch: ReturnType<typeof setInterval> | null = null;
  private prefsHydrated = false;
  private loadToken = 0;

  private get state(): CalmPlayerSnapshot {
    return this.cache.getSnapshot();
  }

  subscribe(listener: (snapshot: CalmPlayerSnapshot) => void): () => void {
    this.ensureHydrated();
    const unsubscribe = this.cache.subscribe(listener);

    this.refCount += 1;
    if (this.refCount === 1) {
      this.ensureAudio();
    }

    return () => {
      unsubscribe();
      this.refCount = Math.max(0, this.refCount - 1);
      // Keep the element alive while shell may remount briefly; tear down only
      // when fully idle with no subscribers and not playing.
      if (this.refCount === 0 && this.state.status !== "playing") {
        this.teardownAudioElement();
      }
    };
  }

  /**
   * Must return the same object reference when state is unchanged.
   * Required by React useSyncExternalStore.
   */
  getSnapshot(): CalmPlayerSnapshot {
    this.ensureHydrated();
    return this.cache.getSnapshot();
  }

  selectSound(soundId: CalmSoundId, options?: { autoplay?: boolean }): void {
    this.ensureHydrated();
    const sound = getSoundById(soundId);
    if (!sound || !sound.active) {
      this.patch({
        status: "error",
        errorMessage: calmErrorMessage("load"),
      });
      return;
    }

    const audio = this.ensureAudio();
    const token = ++this.loadToken;
    const shouldPlay = options?.autoplay ?? this.state.status === "playing";

    this.patch({
      soundId,
      status: "loading",
      errorMessage: null,
      recentSoundId: soundId,
    });
    this.persist();

    audio.pause();
    audio.loop = sound.continuous;
    audio.preload = "metadata";
    audio.src = sound.src;
    audio.load();

    const onReady = () => {
      if (token !== this.loadToken) return;
      cleanup();
      if (shouldPlay) {
        void this.playInternal();
      } else {
        this.patch({ status: "paused" });
      }
    };

    const onError = () => {
      if (token !== this.loadToken) return;
      cleanup();
      const offline =
        typeof navigator !== "undefined" && navigator.onLine === false;
      this.patch({
        status: "error",
        errorMessage: calmErrorMessage(offline ? "offline" : "load"),
      });
    };

    const cleanup = () => {
      audio.removeEventListener("canplay", onReady);
      audio.removeEventListener("error", onError);
    };

    audio.addEventListener("canplay", onReady, { once: true });
    audio.addEventListener("error", onError, { once: true });
  }

  async play(): Promise<void> {
    this.ensureHydrated();
    if (!this.state.soundId) {
      const fallback = this.state.recentSoundId ?? this.state.favouriteSoundId;
      if (fallback) {
        this.selectSound(fallback, { autoplay: true });
        return;
      }
      this.patch({
        status: "error",
        errorMessage: "Choose a sound to begin.",
      });
      return;
    }

    if (this.state.status === "loading") return;
    if (this.state.status === "error") {
      this.selectSound(this.state.soundId, { autoplay: true });
      return;
    }

    await this.playInternal();
  }

  pause(): void {
    const audio = this.ensureAudio();
    audio.pause();
    if (this.state.status === "playing" || this.state.status === "loading") {
      this.patch({ status: "paused", errorMessage: null });
    }
  }

  stop(): void {
    this.loadToken += 1;
    const audio = this.audio;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
    this.clearSleepTimer();
    this.patch({
      soundId: null,
      status: "idle",
      errorMessage: null,
    });
    this.clearMediaSession();
    this.persist();
  }

  setVolume(volume: number): void {
    const next = clampVolume(volume);
    const audio = this.ensureAudio();
    audio.volume = next;
    this.patch({ volume: next });
    this.persist();
  }

  toggleFavourite(soundId?: CalmSoundId | null): void {
    this.ensureHydrated();
    const target = soundId ?? this.state.soundId ?? this.state.recentSoundId;
    if (!target) return;
    const next = this.state.favouriteSoundId === target ? null : target;
    this.patch({ favouriteSoundId: next });
    this.persist();
  }

  setFavourite(soundId: CalmSoundId | null): void {
    this.patch({ favouriteSoundId: soundId });
    this.persist();
  }

  setSleepTimer(minutes: SleepTimerMinutes, nowMs = Date.now()): void {
    if (!isSleepTimerMinutes(minutes)) return;
    if (minutes === 0) {
      this.clearSleepTimer();
      return;
    }
    const endsAt = sleepTimerEndsAt(minutes, nowMs);
    this.patch({
      sleepTimerMinutes: minutes,
      sleepTimerEndsAt: endsAt,
    });
    this.startTimerWatch();
  }

  clearSleepTimer(): void {
    this.stopTimerWatch();
    this.cache.commit(clearTimerSnapshot(this.state));
  }

  /** Stops audible playback and active timer; keeps device prefs. */
  handleLogout(): void {
    this.loadToken += 1;
    this.stopTimerWatch();
    if (this.audio) {
      this.audio.pause();
      this.audio.removeAttribute("src");
      this.audio.load();
    }
    this.cache.commit(logoutSnapshot(this.state));
    this.clearMediaSession();
    this.teardownAudioElement();
  }

  private async playInternal(): Promise<void> {
    const audio = this.ensureAudio();
    const sound = getSoundById(this.state.soundId);
    if (!sound) {
      this.patch({
        status: "error",
        errorMessage: calmErrorMessage("load"),
      });
      return;
    }

    audio.volume = this.state.volume;
    audio.loop = sound.continuous;

    try {
      this.patch({ status: "loading", errorMessage: null });
      await audio.play();
      this.patch({
        status: "playing",
        errorMessage: null,
        recentSoundId: sound.id,
      });
      this.persist();
      this.updateMediaSession(sound.title, sound.categoryLabel);
    } catch (error) {
      const name =
        error && typeof error === "object" && "name" in error
          ? String((error as { name: string }).name)
          : "";
      if (name === "NotAllowedError") {
        this.patch({
          status: "paused",
          errorMessage: calmErrorMessage("play"),
        });
        return;
      }
      this.patch({
        status: "error",
        errorMessage: calmErrorMessage("play"),
      });
    }
  }

  /**
   * Hydrate once from localStorage. Replaces the cached snapshot only when
   * persisted values differ — never on every getSnapshot call.
   * Uses replaceSilent so snapshot reads do not notify subscribers.
   */
  private ensureHydrated(): void {
    if (this.prefsHydrated) return;
    this.prefsHydrated = true;
    if (typeof window === "undefined") return;

    const prefs = readPersistedPrefs(window.localStorage);
    if (!prefs) return;

    const next = hydrateSnapshotFromPrefs(this.state, prefs);
    this.cache.replaceSilent(next);
  }

  private persist(): void {
    if (typeof window === "undefined") return;
    writePersistedPrefs(window.localStorage, {
      volume: this.state.volume,
      favouriteSoundId: this.state.favouriteSoundId,
      recentSoundId: this.state.recentSoundId,
      selectedSoundId: this.state.soundId,
    });
  }

  private ensureAudio(): HTMLAudioElement {
    if (this.audio) return this.audio;
    if (typeof window === "undefined" || typeof Audio === "undefined") {
      throw new Error("Audio is not available in this environment.");
    }

    const audio = new Audio();
    audio.preload = "none";
    audio.volume = this.state.volume;
    audio.setAttribute("playsinline", "true");

    audio.addEventListener("playing", () => {
      if (this.state.status !== "playing") {
        this.patch({ status: "playing", errorMessage: null });
      }
    });
    audio.addEventListener("pause", () => {
      if (this.state.status === "playing") {
        this.patch({ status: "paused" });
      }
    });
    audio.addEventListener("waiting", () => {
      if (this.state.status === "playing") {
        this.patch({ status: "loading" });
      }
    });
    audio.addEventListener("stalled", () => {
      if (this.state.status === "playing" || this.state.status === "loading") {
        this.patch({
          status: "error",
          errorMessage: calmErrorMessage("load"),
        });
      }
    });

    this.audio = audio;
    return audio;
  }

  private teardownAudioElement(): void {
    if (!this.audio) return;
    this.audio.pause();
    this.audio.removeAttribute("src");
    this.audio.load();
    this.audio = null;
  }

  private startTimerWatch(): void {
    this.stopTimerWatch();
    this.timerWatch = setInterval(() => {
      this.checkSleepTimer();
    }, 1000);
    this.checkSleepTimer();
  }

  private stopTimerWatch(): void {
    if (this.timerWatch) {
      clearInterval(this.timerWatch);
      this.timerWatch = null;
    }
  }

  private checkSleepTimer(nowMs = Date.now()): void {
    if (!isSleepTimerExpired(this.state.sleepTimerEndsAt, nowMs)) {
      // Remaining time is derived in UI from sleepTimerEndsAt + local clock.
      // Do not emit on every tick — that would thrash subscribers.
      return;
    }

    this.stopTimerWatch();
    if (this.audio && !this.audio.paused) {
      this.audio.pause();
    }
    this.cache.commit(applyTimerExpiry(this.state));
    this.clearMediaSession();
  }

  private updateMediaSession(title: string, category: string): void {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) {
      return;
    }
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title,
        artist: "Glow Calm",
        album: category,
      });
      navigator.mediaSession.setActionHandler("play", () => {
        void this.play();
      });
      navigator.mediaSession.setActionHandler("pause", () => {
        this.pause();
      });
      navigator.mediaSession.setActionHandler("stop", () => {
        this.stop();
      });
      navigator.mediaSession.playbackState = "playing";
    } catch {
      // Media Session is best-effort.
    }
  }

  private clearMediaSession(): void {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) {
      return;
    }
    try {
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.playbackState = "none";
      navigator.mediaSession.setActionHandler("play", null);
      navigator.mediaSession.setActionHandler("pause", null);
      navigator.mediaSession.setActionHandler("stop", null);
    } catch {
      // ignore
    }
  }

  private patch(partial: Partial<CalmPlayerSnapshot>): void {
    this.cache.patch(partial);
  }
}

let shared: CalmPlayerService | null = null;

export function getCalmPlayerService(): CalmPlayerService {
  if (!shared) shared = new CalmPlayerService();
  return shared;
}

/** Test-only: reset singleton between unit suites that touch the service. */
export function __resetCalmPlayerServiceForTests(): void {
  if (shared) {
    shared.handleLogout();
  }
  shared = null;
}
