import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CALM_PREFS_STORAGE_KEY,
  parsePersistedPrefs,
  serializePersistedPrefs,
  writePersistedPrefs,
  readPersistedPrefs,
} from "./persistence.ts";

describe("Calm persistence", () => {
  it("round-trips volume, favourite, and recent", () => {
    const raw = serializePersistedPrefs({
      volume: 0.42,
      favouriteSoundId: "soft-rain",
      recentSoundId: "gentle-waves",
      selectedSoundId: "gentle-waves",
    });
    const parsed = parsePersistedPrefs(raw);
    assert.deepEqual(parsed, {
      volume: 0.42,
      favouriteSoundId: "soft-rain",
      recentSoundId: "gentle-waves",
      selectedSoundId: "gentle-waves",
    });
  });

  it("drops invalid sound ids and clamps volume", () => {
    const parsed = parsePersistedPrefs(
      JSON.stringify({
        volume: 9,
        favouriteSoundId: "nope",
        recentSoundId: "soft-rain",
        selectedSoundId: null,
      }),
    );
    assert.equal(parsed?.volume, 1);
    assert.equal(parsed?.favouriteSoundId, null);
    assert.equal(parsed?.recentSoundId, "soft-rain");
  });

  it("does not persist a sleep timer", () => {
    const raw = serializePersistedPrefs({
      volume: 0.7,
      favouriteSoundId: null,
      recentSoundId: null,
      selectedSoundId: null,
    });
    assert.equal(raw.includes("sleep"), false);
    assert.equal(raw.includes("timer"), false);
  });

  it("reads and writes through a storage-like object", () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
    };

    writePersistedPrefs(storage, {
      volume: 0.2,
      favouriteSoundId: "quiet-evening",
      recentSoundId: "quiet-evening",
      selectedSoundId: "quiet-evening",
    });

    assert.ok(store.has(CALM_PREFS_STORAGE_KEY));
    const prefs = readPersistedPrefs(storage);
    assert.equal(prefs?.favouriteSoundId, "quiet-evening");
    assert.equal(prefs?.volume, 0.2);
  });

  it("returns null for corrupt storage", () => {
    assert.equal(parsePersistedPrefs("{"), null);
    assert.equal(parsePersistedPrefs(null), null);
  });
});
