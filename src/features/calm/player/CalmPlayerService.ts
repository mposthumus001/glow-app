import {
  getSoundById,
  getSoundsForMode,
  isKnownCalmSoundId,
} from "../sounds/catalogue.ts";
import { getCalmSoundsMode } from "../sounds/flags.ts";
import type {
  CalmPlayerSnapshot,
  CalmSoundId,
  CalmSoundsMode,
  SleepTimerMinutes,
} from "../types.ts";
import {
  readPersistedPrefsV2,
  writePersistedPrefs,
} from "./persistence.ts";
import {
  applyTimerExpiry,
  calmErrorMessage,
  clampVolume,
  clearTimerSnapshot,
  hydrateSnapshotFromPrefs,
  isSleepTimerMinutes,
  logoutSnapshot,
  sleepTimerEndsAt,
  CalmSnapshotCache,
} from "./playerLogic.ts";
import { SleepTimerScheduler } from "./SleepTimerScheduler.ts";

export type CalmPlayerServiceOptions = {
  createAudio?: () => HTMLAudioElement;
  getMode?: () => CalmSoundsMode;
  getStorage?: () => Storage | null;
  now?: () => number;
  sleepTimerScheduler?: SleepTimerScheduler;
};

/**
 * The only owner of Calm playback for an authenticated app-shell session.
 * Audio creation is lazy: mounting the owner or opening Support creates no
 * HTMLAudioElement. The element is retained through route transitions and is
 * disposed when the shell owner leaves or logout is explicit.
 */
export class CalmPlayerService {
  private audio: HTMLAudioElement | null = null;
  private loadedSoundId: CalmSoundId | null = null;
  private readonly cache = new CalmSnapshotCache();
  private readonly createAudio: () => HTMLAudioElement;
  private readonly getMode: () => CalmSoundsMode;
  private readonly getStorage: () => Storage | null;
  private readonly now: () => number;
  private readonly sleepTimerScheduler: SleepTimerScheduler;
  private prefsHydrated = false;
  private operationToken = 0;
  private playRequested = false;
  private ownerCount = 0;
  private ownerDisposeTimer: ReturnType<typeof setTimeout> | null = null;
  private lifecycleListenersAttached = false;

  constructor(options: CalmPlayerServiceOptions = {}) {
    this.createAudio =
      options.createAudio ??
      (() => {
        if (typeof Audio === "undefined") {
          throw new Error("Audio is not available in this environment.");
        }
        return new Audio();
      });
    this.getMode = options.getMode ?? getCalmSoundsMode;
    this.getStorage =
      options.getStorage ??
      (() => {
        if (typeof window === "undefined") return null;
        return window.localStorage;
      });
    this.now = options.now ?? Date.now;
    this.sleepTimerScheduler =
      options.sleepTimerScheduler ??
      new SleepTimerScheduler({ now: this.now });
  }

  private get state(): CalmPlayerSnapshot {
    return this.cache.getSnapshot();
  }

  /**
   * Keeps this singleton alive for the app-shell lifetime without eagerly
   * creating audio. Deferred disposal tolerates React development remounts.
   */
  acquireOwner(): () => void {
    this.ensureHydrated();
    this.ownerCount += 1;
    if (this.ownerDisposeTimer != null) {
      clearTimeout(this.ownerDisposeTimer);
      this.ownerDisposeTimer = null;
    }
    this.attachLifecycleListeners();

    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.ownerCount = Math.max(0, this.ownerCount - 1);
      if (this.ownerCount > 0) return;
      this.ownerDisposeTimer = setTimeout(() => {
        this.ownerDisposeTimer = null;
        if (this.ownerCount === 0) this.handleLogout();
      }, 0);
    };
  }

  subscribe(listener: (snapshot: CalmPlayerSnapshot) => void): () => void {
    this.ensureHydrated();
    return this.cache.subscribe(listener);
  }

  getSnapshot(): CalmPlayerSnapshot {
    this.ensureHydrated();
    return this.cache.getSnapshot();
  }

  selectSound(soundId: CalmSoundId): boolean {
    this.ensureHydrated();
    const sound = getSoundById(soundId, this.getMode());
    if (!sound) {
      this.patch({
        status: "error",
        errorMessage: calmErrorMessage("load"),
      });
      return false;
    }

    let audio: HTMLAudioElement;
    try {
      audio = this.ensureAudio();
    } catch {
      this.patch({
        status: "error",
        errorMessage: calmErrorMessage("unsupported"),
      });
      return false;
    }

    this.operationToken += 1;
    this.playRequested = false;
    audio.pause();
    this.resetCurrentTime(audio);
    audio.loop = sound.loop;
    audio.preload = "metadata";
    audio.src = sound.source.src;
    this.loadedSoundId = sound.id;
    this.patch({
      soundId,
      status: "loading",
      errorMessage: null,
      recentSoundId: soundId,
    });
    this.updateMediaMetadata(sound.title);
    this.setMediaPlaybackState("paused");
    this.persist();
    audio.load();
    return true;
  }

  /** Call only from a user or Media Session action. */
  async selectAndPlay(soundId: CalmSoundId): Promise<void> {
    if (!this.selectSound(soundId)) return;
    await this.playInternal();
  }

  /** Call only from a user or Media Session action. */
  async play(): Promise<void> {
    this.ensureHydrated();
    if (!this.state.soundId) {
      const fallback =
        this.state.recentSoundId ?? this.state.favouriteSoundIds[0] ?? null;
      if (fallback) {
        await this.selectAndPlay(fallback);
        return;
      }
      this.patch({
        status: "error",
        errorMessage: "Choose a sound to begin.",
      });
      return;
    }

    const sound = getSoundById(this.state.soundId, this.getMode());
    if (!sound) {
      this.patch({
        soundId: null,
        status: "error",
        errorMessage: calmErrorMessage("load"),
      });
      return;
    }
    if (
      (this.loadedSoundId !== sound.id || this.state.status === "error") &&
      !this.selectSound(sound.id)
    ) {
      return;
    }
    await this.playInternal();
  }

  pause(): void {
    this.operationToken += 1;
    this.playRequested = false;
    this.audio?.pause();
    if (this.state.soundId) {
      this.patch({ status: "paused", errorMessage: null });
    }
    this.setMediaPlaybackState("paused");
  }

  /**
   * Stop retains the selected track, pauses it, resets position to zero, and
   * clears the sleep timer. Only logout/disposal unloads and clears the source.
   */
  stop(): void {
    this.operationToken += 1;
    this.playRequested = false;
    if (this.audio) {
      this.audio.pause();
      this.resetCurrentTime(this.audio);
    }
    this.clearSleepTimer();
    this.patch({
      status: this.state.soundId ? "paused" : "idle",
      errorMessage: null,
    });
    this.setMediaPlaybackState("paused");
    this.persist();
  }

  setVolume(volume: number): void {
    const next = clampVolume(volume);
    if (this.audio) this.audio.volume = next;
    this.patch({ volume: next });
    this.persist();
  }

  toggleFavourite(soundId?: CalmSoundId | null): void {
    this.ensureHydrated();
    const target = soundId ?? this.state.soundId ?? this.state.recentSoundId;
    if (!target || !getSoundById(target, this.getMode())) return;
    const exists = this.state.favouriteSoundIds.includes(target);
    const favouriteSoundIds = exists
      ? this.state.favouriteSoundIds.filter((id) => id !== target)
      : [...this.state.favouriteSoundIds, target];
    this.patch({ favouriteSoundIds });
    this.persist();
  }

  /** Compatibility for the device-preferences clear action. */
  setFavourite(soundId: CalmSoundId | null): void {
    const favouriteSoundIds =
      soundId && getSoundById(soundId, this.getMode()) ? [soundId] : [];
    this.patch({ favouriteSoundIds });
    this.persist();
  }

  setSleepTimer(minutes: SleepTimerMinutes, nowMs = this.now()): void {
    if (!isSleepTimerMinutes(minutes)) return;
    if (minutes === 0) {
      this.clearSleepTimer();
      return;
    }
    if (!this.state.soundId) return;

    const endsAt = sleepTimerEndsAt(minutes, nowMs);
    if (endsAt == null) return;
    this.patch({
      sleepTimerMinutes: minutes,
      sleepTimerEndsAt: endsAt,
    });
    this.sleepTimerScheduler.replace(endsAt, () => {
      this.expireSleepTimer();
    });
  }

  clearSleepTimer(): void {
    this.sleepTimerScheduler.cancel();
    this.cache.commit(clearTimerSnapshot(this.state));
  }

  /** Stops and clears playback state while retaining device-only preferences. */
  handleLogout(): void {
    this.operationToken += 1;
    this.playRequested = false;
    this.sleepTimerScheduler.cancel();
    this.detachLifecycleListeners();
    this.teardownAudioElement();
    this.cache.commit(logoutSnapshot(this.state));
    this.clearMediaSession();
    this.persist();
  }

  private async playInternal(): Promise<void> {
    const sound = getSoundById(this.state.soundId, this.getMode());
    if (!sound) {
      this.patch({
        status: "error",
        errorMessage: calmErrorMessage("load"),
      });
      return;
    }

    let audio: HTMLAudioElement;
    try {
      audio = this.ensureAudio();
    } catch {
      this.patch({
        status: "error",
        errorMessage: calmErrorMessage("unsupported"),
      });
      return;
    }

    const token = ++this.operationToken;
    this.playRequested = true;
    audio.volume = this.state.volume;
    audio.loop = sound.loop;
    this.patch({ status: "loading", errorMessage: null });

    try {
      await audio.play();
      if (token !== this.operationToken || !this.playRequested) return;
      this.patch({
        status: "playing",
        errorMessage: null,
        recentSoundId: sound.id,
      });
      this.persist();
      this.updateMediaMetadata(sound.title);
      this.setMediaPlaybackState("playing");
    } catch (error) {
      if (token !== this.operationToken) return;
      this.playRequested = false;
      const name =
        error && typeof error === "object" && "name" in error
          ? String((error as { name: string }).name)
          : "";
      this.patch({
        status: name === "NotAllowedError" ? "paused" : "error",
        errorMessage: calmErrorMessage("play"),
      });
      this.setMediaPlaybackState("paused");
    }
  }

  private ensureHydrated(): void {
    if (this.prefsHydrated) return;
    this.prefsHydrated = true;

    const prefs = readPersistedPrefsV2(this.getStorage());
    if (!prefs) return;
    const mode = this.getMode();
    const availableIds = new Set(
      getSoundsForMode(mode).map((sound) => sound.id),
    );
    const next = hydrateSnapshotFromPrefs(this.state, {
      volume: prefs.volume,
      favouriteSoundIds: prefs.favouriteSoundIds.filter((id) =>
        availableIds.has(id),
      ),
      recentSoundId:
        isKnownCalmSoundId(prefs.recentSoundId) &&
        availableIds.has(prefs.recentSoundId)
          ? prefs.recentSoundId
          : null,
      selectedSoundId:
        isKnownCalmSoundId(prefs.selectedSoundId) &&
        availableIds.has(prefs.selectedSoundId)
          ? prefs.selectedSoundId
          : null,
    });
    this.cache.replaceSilent(next);
  }

  private persist(): void {
    writePersistedPrefs(this.getStorage(), {
      version: 2,
      volume: this.state.volume,
      favouriteSoundIds: this.state.favouriteSoundIds,
      recentSoundId: this.state.recentSoundId,
      selectedSoundId: this.state.soundId,
    });
  }

  private ensureAudio(): HTMLAudioElement {
    if (this.audio) return this.audio;
    const audio = this.createAudio();
    audio.preload = "none";
    audio.volume = this.state.volume;
    audio.setAttribute("playsinline", "true");
    audio.addEventListener("playing", this.handlePlaying);
    audio.addEventListener("pause", this.handlePause);
    audio.addEventListener("waiting", this.handleWaiting);
    audio.addEventListener("canplay", this.handleCanPlay);
    audio.addEventListener("stalled", this.handleStalled);
    audio.addEventListener("error", this.handleAudioError);
    audio.addEventListener("ended", this.handleEnded);
    this.audio = audio;
    this.installMediaSessionHandlers();
    return audio;
  }

  private readonly handlePlaying = () => {
    if (!this.playRequested) return;
    this.patch({ status: "playing", errorMessage: null });
    this.setMediaPlaybackState("playing");
  };

  private readonly handlePause = () => {
    if (this.state.status === "playing") {
      this.patch({ status: "paused" });
    }
    this.setMediaPlaybackState("paused");
  };

  private readonly handleWaiting = () => {
    if (this.playRequested) this.patch({ status: "loading" });
  };

  private readonly handleCanPlay = () => {
    if (!this.playRequested && this.state.status === "loading") {
      this.patch({ status: "paused", errorMessage: null });
    }
  };

  private readonly handleStalled = () => {
    if (!this.playRequested) return;
    this.patch({
      status: "error",
      errorMessage: calmErrorMessage(
        typeof navigator !== "undefined" && navigator.onLine === false
          ? "offline"
          : "load",
      ),
    });
  };

  private readonly handleAudioError = () => {
    this.playRequested = false;
    const unsupported = this.audio?.error?.code === 4;
    const offline =
      typeof navigator !== "undefined" && navigator.onLine === false;
    this.patch({
      status: "error",
      errorMessage: calmErrorMessage(
        unsupported ? "unsupported" : offline ? "offline" : "load",
      ),
    });
    this.setMediaPlaybackState("paused");
  };

  private readonly handleEnded = () => {
    this.playRequested = false;
    if (this.audio) this.resetCurrentTime(this.audio);
    this.patch({ status: this.state.soundId ? "paused" : "idle" });
    this.setMediaPlaybackState("paused");
  };

  private expireSleepTimer(): void {
    if (this.state.sleepTimerEndsAt == null) return;
    this.operationToken += 1;
    this.playRequested = false;
    if (this.audio) {
      this.audio.pause();
      this.resetCurrentTime(this.audio);
    }
    this.cache.commit(applyTimerExpiry(this.state));
    this.setMediaPlaybackState("paused");
  }

  private resetCurrentTime(audio: HTMLAudioElement): void {
    try {
      audio.currentTime = 0;
    } catch {
      // Some browsers reject seeking before metadata; source replacement still
      // starts the next track at zero.
    }
  }

  private teardownAudioElement(): void {
    if (!this.audio) return;
    this.audio.removeEventListener("playing", this.handlePlaying);
    this.audio.removeEventListener("pause", this.handlePause);
    this.audio.removeEventListener("waiting", this.handleWaiting);
    this.audio.removeEventListener("canplay", this.handleCanPlay);
    this.audio.removeEventListener("stalled", this.handleStalled);
    this.audio.removeEventListener("error", this.handleAudioError);
    this.audio.removeEventListener("ended", this.handleEnded);
    this.audio.pause();
    this.audio.removeAttribute("src");
    this.audio.load();
    this.audio = null;
    this.loadedSoundId = null;
  }

  private attachLifecycleListeners(): void {
    if (this.lifecycleListenersAttached || typeof window === "undefined") return;
    window.addEventListener("pageshow", this.handleClockResume);
    document.addEventListener("visibilitychange", this.handleClockResume);
    this.lifecycleListenersAttached = true;
  }

  private detachLifecycleListeners(): void {
    if (!this.lifecycleListenersAttached || typeof window === "undefined") return;
    window.removeEventListener("pageshow", this.handleClockResume);
    document.removeEventListener("visibilitychange", this.handleClockResume);
    this.lifecycleListenersAttached = false;
  }

  private readonly handleClockResume = () => {
    this.sleepTimerScheduler.checkNow();
  };

  private installMediaSessionHandlers(): void {
    const mediaSession = this.getMediaSession();
    if (!mediaSession) return;
    try {
      mediaSession.setActionHandler("play", () => void this.play());
      mediaSession.setActionHandler("pause", () => this.pause());
      mediaSession.setActionHandler("stop", () => this.stop());
    } catch {
      // Media Session support is partial on some browser versions.
    }
  }

  private updateMediaMetadata(soundTitle: string): void {
    const mediaSession = this.getMediaSession();
    if (!mediaSession || typeof MediaMetadata === "undefined") return;
    try {
      mediaSession.metadata = new MediaMetadata({
        title: soundTitle,
        artist: "Glow Sounds",
      });
    } catch {
      // Metadata is best-effort and contains no account or wellbeing data.
    }
  }

  private setMediaPlaybackState(state: MediaSessionPlaybackState): void {
    const mediaSession = this.getMediaSession();
    if (!mediaSession) return;
    try {
      mediaSession.playbackState = state;
    } catch {
      // Best-effort browser integration.
    }
  }

  private clearMediaSession(): void {
    const mediaSession = this.getMediaSession();
    if (!mediaSession) return;
    try {
      mediaSession.metadata = null;
      mediaSession.playbackState = "none";
      mediaSession.setActionHandler("play", null);
      mediaSession.setActionHandler("pause", null);
      mediaSession.setActionHandler("stop", null);
    } catch {
      // Best-effort browser integration.
    }
  }

  private getMediaSession(): MediaSession | null {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) {
      return null;
    }
    return navigator.mediaSession;
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

export function __resetCalmPlayerServiceForTests(): void {
  shared?.handleLogout();
  shared = null;
}
