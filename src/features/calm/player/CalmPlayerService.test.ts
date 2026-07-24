import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CalmPlayerService } from "./CalmPlayerService.ts";
import { CALM_PREFS_STORAGE_KEY } from "./persistence.ts";
import { SleepTimerScheduler } from "./SleepTimerScheduler.ts";

class FakeAudio extends EventTarget {
  src = "";
  preload = "";
  volume = 1;
  loop = false;
  currentTime = 0;
  paused = true;
  error: MediaError | null = null;
  playCalls = 0;
  pauseCalls = 0;
  loadCalls = 0;

  setAttribute(): void {}

  removeAttribute(name: string): void {
    if (name === "src") this.src = "";
  }

  load(): void {
    this.loadCalls += 1;
  }

  async play(): Promise<void> {
    this.playCalls += 1;
    this.paused = false;
    this.dispatchEvent(new Event("playing"));
  }

  pause(): void {
    this.pauseCalls += 1;
    this.paused = true;
    this.dispatchEvent(new Event("pause"));
  }
}

function createHarness(storedPrefs?: string) {
  const audios: FakeAudio[] = [];
  const store = new Map<string, string>();
  if (storedPrefs) store.set(CALM_PREFS_STORAGE_KEY, storedPrefs);
  const storage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
  } as Storage;
  const service = new CalmPlayerService({
    createAudio: () => {
      const audio = new FakeAudio();
      audios.push(audio);
      return audio as unknown as HTMLAudioElement;
    },
    getMode: () => "preview",
    getStorage: () => storage,
  });
  return { service, audios, store };
}

describe("CalmPlayerService single-owner playback", () => {
  it("creates no audio for ownership or subscriptions and at most one on use", () => {
    const { service, audios } = createHarness();
    const release = service.acquireOwner();
    const unsubscribe = service.subscribe(() => undefined);
    assert.equal(audios.length, 0);

    assert.equal(service.selectSound("soft-rain"), true);
    assert.equal(service.selectSound("gentle-waves"), true);
    assert.equal(audios.length, 1);
    unsubscribe();
    release();
    service.handleLogout();
  });

  it("requires an explicit play call after selection", async () => {
    const { service, audios } = createHarness();
    service.selectSound("soft-rain");
    assert.equal(audios[0].playCalls, 0);
    audios[0].dispatchEvent(new Event("canplay"));
    assert.equal(service.getSnapshot().status, "paused");

    await service.play();
    assert.equal(audios[0].playCalls, 1);
    assert.equal(service.getSnapshot().status, "playing");
  });

  it("pause retains position while stop resets position and clears timer", async () => {
    const { service, audios } = createHarness();
    await service.selectAndPlay("soft-rain");
    audios[0].currentTime = 4.5;
    service.setSleepTimer(15, 1_000);

    service.pause();
    assert.equal(audios[0].currentTime, 4.5);
    assert.equal(service.getSnapshot().status, "paused");
    assert.notEqual(service.getSnapshot().sleepTimerEndsAt, null);

    service.stop();
    assert.equal(audios[0].currentTime, 0);
    assert.equal(service.getSnapshot().soundId, "soft-rain");
    assert.equal(service.getSnapshot().status, "paused");
    assert.equal(service.getSnapshot().sleepTimerEndsAt, null);
  });

  it("switching tracks replaces the source on the same audio element", async () => {
    const { service, audios } = createHarness();
    await service.selectAndPlay("soft-rain");
    audios[0].currentTime = 3;
    await service.selectAndPlay("steady-hush");

    assert.equal(audios.length, 1);
    assert.equal(audios[0].src, "/calm/placeholders/steady-hush.wav");
    assert.equal(audios[0].currentTime, 0);
    assert.equal(service.getSnapshot().soundId, "steady-hush");
    assert.equal(service.getSnapshot().status, "playing");
  });

  it("preserves playback while route-level subscribers change", async () => {
    const { service, audios } = createHarness();
    const releaseOwner = service.acquireOwner();
    const leaveSoundsRoute = service.subscribe(() => undefined);
    await service.selectAndPlay("soft-rain");

    leaveSoundsRoute();
    const enterAnotherRoute = service.subscribe(() => undefined);
    assert.equal(audios.length, 1);
    assert.equal(audios[0].paused, false);
    assert.equal(service.getSnapshot().status, "playing");

    enterAnotherRoute();
    releaseOwner();
    service.handleLogout();
  });

  it("updates active audio volume and safely persists favourites", () => {
    const { service, audios, store } = createHarness();
    service.selectSound("quiet-evening");
    service.setVolume(0.31);
    service.toggleFavourite();

    assert.equal(audios[0].volume, 0.31);
    assert.deepEqual(service.getSnapshot().favouriteSoundIds, [
      "quiet-evening",
    ]);
    assert.match(
      store.get(CALM_PREFS_STORAGE_KEY) ?? "",
      /"favouriteSoundIds":\["quiet-evening"\]/,
    );
  });

  it("restores selection paused without creating audio or autoplaying", () => {
    const { service, audios } = createHarness(
      JSON.stringify({
        version: 2,
        volume: 0.4,
        favouriteSoundIds: ["soft-rain"],
        recentSoundId: "soft-rain",
        selectedSoundId: "soft-rain",
      }),
    );

    const snapshot = service.getSnapshot();
    assert.equal(snapshot.soundId, "soft-rain");
    assert.equal(snapshot.status, "idle");
    assert.equal(audios.length, 0);
  });

  it("rejects unknown sound ids without creating audio", () => {
    const { service, audios } = createHarness();
    assert.equal(
      service.selectSound("unknown" as "soft-rain"),
      false,
    );
    assert.equal(audios.length, 0);
    assert.equal(service.getSnapshot().status, "error");
  });

  it("surfaces a calm playback error without exposing the source", async () => {
    const { service, audios } = createHarness();
    service.selectSound("soft-rain");
    audios[0].dispatchEvent(new Event("error"));

    assert.equal(service.getSnapshot().status, "error");
    assert.match(service.getSnapshot().errorMessage ?? "", /could not be loaded/i);
    assert.doesNotMatch(
      service.getSnapshot().errorMessage ?? "",
      /placeholders|\.wav|DOMException|MediaError/,
    );

    const loadCalls = audios[0].loadCalls;
    await service.play();
    assert.ok(audios[0].loadCalls > loadCalls);
    assert.equal(service.getSnapshot().status, "playing");
  });

  it("logout cancels the timer, unloads audio, and clears selection", () => {
    let timerCancels = 0;
    const scheduler = new SleepTimerScheduler({
      setTimeout: () => 1 as unknown as ReturnType<typeof setTimeout>,
      clearTimeout: () => {
        timerCancels += 1;
      },
    });
    const audio = new FakeAudio();
    const service = new CalmPlayerService({
      createAudio: () => audio as unknown as HTMLAudioElement,
      getMode: () => "preview",
      getStorage: () => null,
      sleepTimerScheduler: scheduler,
    });
    service.selectSound("soft-rain");
    service.setSleepTimer(15);

    service.handleLogout();

    assert.equal(audio.src, "");
    assert.equal(service.getSnapshot().soundId, null);
    assert.equal(service.getSnapshot().sleepTimerEndsAt, null);
    assert.ok(timerCancels >= 1);
  });
});
