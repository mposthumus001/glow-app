import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  applyTimerExpiry,
  calmErrorMessage,
  clampVolume,
  clearTimerSnapshot,
  createInitialSnapshot,
  formatRemainingTimer,
  isSleepTimerExpired,
  logoutSnapshot,
  selectSoundSnapshot,
  setStatusSnapshot,
  sleepTimerEndsAt,
  sleepTimerRemainingMs,
  snapshotsEqual,
} from "./playerLogic.ts";

describe("playerLogic volume", () => {
  it("clamps volume into 0..1", () => {
    assert.equal(clampVolume(-1), 0);
    assert.equal(clampVolume(2), 1);
    assert.equal(clampVolume(0.4), 0.4);
  });
});

describe("playerLogic selection", () => {
  it("selecting a new sound leaves a loading state and updates recent", () => {
    const current = createInitialSnapshot({
      soundId: "soft-rain",
      status: "playing",
    });
    const next = selectSoundSnapshot(current, "gentle-waves");
    assert.equal(next.soundId, "gentle-waves");
    assert.equal(next.status, "loading");
    assert.equal(next.recentSoundId, "gentle-waves");
    assert.equal(next.errorMessage, null);
  });

  it("only one selected sound exists at a time", () => {
    const a = selectSoundSnapshot(createInitialSnapshot(), "soft-rain");
    const b = selectSoundSnapshot(a, "steady-hush");
    assert.equal(b.soundId, "steady-hush");
    assert.notEqual(b.soundId, "soft-rain");
  });
});

describe("playerLogic play/pause transitions", () => {
  it("moves between playing and paused", () => {
    const playing = setStatusSnapshot(createInitialSnapshot(), "playing");
    assert.equal(playing.status, "playing");
    const paused = setStatusSnapshot(playing, "paused");
    assert.equal(paused.status, "paused");
  });

  it("surfaces calm errors without raw exceptions", () => {
    const errored = setStatusSnapshot(
      createInitialSnapshot(),
      "error",
      calmErrorMessage("load"),
    );
    assert.equal(errored.status, "error");
    assert.match(errored.errorMessage ?? "", /could not be loaded/i);
    assert.doesNotMatch(errored.errorMessage ?? "", /TypeError|DOMException/);
  });
});

describe("playerLogic sleep timer", () => {
  it("starts with an absolute end time", () => {
    const now = 1_000_000;
    assert.equal(sleepTimerEndsAt(0, now), null);
    assert.equal(sleepTimerEndsAt(15, now), now + 15 * 60_000);
  });

  it("expires and clears timer fields", () => {
    const now = 5_000;
    assert.equal(isSleepTimerExpired(4_000, now), true);
    assert.equal(isSleepTimerExpired(6_000, now), false);
    assert.equal(sleepTimerRemainingMs(6_000, now), 1_000);

    const active = createInitialSnapshot({
      soundId: "soft-rain",
      status: "playing",
      sleepTimerMinutes: 15,
      sleepTimerEndsAt: 4_000,
    });
    const expired = applyTimerExpiry(active);
    assert.equal(expired.status, "paused");
    assert.equal(expired.sleepTimerMinutes, 0);
    assert.equal(expired.sleepTimerEndsAt, null);
  });

  it("cancel clears timer without forcing pause", () => {
    const active = createInitialSnapshot({
      status: "playing",
      sleepTimerMinutes: 30,
      sleepTimerEndsAt: 99_000,
    });
    const cleared = clearTimerSnapshot(active);
    assert.equal(cleared.status, "playing");
    assert.equal(cleared.sleepTimerEndsAt, null);
  });

  it("formats remaining time", () => {
    assert.equal(formatRemainingTimer(65_000), "1:05");
  });

  it("expired timer does not restore via logout snapshot", () => {
    const expired = applyTimerExpiry(
      createInitialSnapshot({
        status: "playing",
        sleepTimerMinutes: 15,
        sleepTimerEndsAt: 1,
        volume: 0.55,
        favouriteSoundIds: ["soft-rain"],
        recentSoundId: "soft-rain",
      }),
    );
    const afterLogout = logoutSnapshot(expired);
    assert.equal(afterLogout.sleepTimerEndsAt, null);
    assert.equal(afterLogout.sleepTimerMinutes, 0);
    assert.equal(afterLogout.status, "idle");
    assert.equal(afterLogout.soundId, null);
    assert.equal(afterLogout.volume, 0.55);
    assert.deepEqual(afterLogout.favouriteSoundIds, ["soft-rain"]);
  });
});

describe("snapshotsEqual", () => {
  it("returns true for identical values", () => {
    const a = createInitialSnapshot({ volume: 0.4 });
    const b = createInitialSnapshot({ volume: 0.4 });
    assert.equal(snapshotsEqual(a, b), true);
  });

  it("returns false when a field changes", () => {
    const a = createInitialSnapshot();
    const b = createInitialSnapshot({ status: "playing" });
    assert.equal(snapshotsEqual(a, b), false);
  });
});
