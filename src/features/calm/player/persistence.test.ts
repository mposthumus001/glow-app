import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CALM_PREFS_STORAGE_KEY,
  parsePersistedPrefs,
  serializePersistedPrefs,
  writePersistedPrefs,
  readPersistedPrefs,
  readPersistedPrefsV2,
} from "./persistence.ts";

describe("Calm persistence", () => {
  it("round-trips volume, favourite, and recent", () => {
    const raw = serializePersistedPrefs({
      version: 2,
      volume: 0.42,
      favouriteSoundIds: ["soft-rain"],
      favouriteSoundId: "soft-rain",
      recentSoundId: "gentle-waves",
      selectedSoundId: "gentle-waves",
    });
    const parsed = parsePersistedPrefs(raw);
    assert.deepEqual(parsed, {
      version: 2,
      volume: 0.42,
      favouriteSoundIds: ["soft-rain"],
      favouriteSoundId: "soft-rain",
      recentSoundId: "gentle-waves",
      selectedSoundId: "gentle-waves",
    });
  });

  it("drops invalid sound ids and clamps volume", () => {
    const parsed = parsePersistedPrefs(
      JSON.stringify({
        volume: 9,
        favouriteSoundIds: ["nope", "soft-rain", "soft-rain"],
        recentSoundId: "soft-rain",
        selectedSoundId: null,
      }),
    );
    assert.equal(parsed?.volume, 1);
    assert.deepEqual(parsed?.favouriteSoundIds, ["soft-rain"]);
    assert.equal(parsed?.recentSoundId, "soft-rain");
  });

  it("does not persist a sleep timer", () => {
    const raw = serializePersistedPrefs({
      version: 2,
      volume: 0.7,
      favouriteSoundIds: [],
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
      version: 2,
      volume: 0.2,
      favouriteSoundIds: ["quiet-evening"],
      recentSoundId: "quiet-evening",
      selectedSoundId: "quiet-evening",
    });

    assert.ok(store.has(CALM_PREFS_STORAGE_KEY));
    const prefs = readPersistedPrefsV2(storage);
    assert.deepEqual(prefs?.favouriteSoundIds, ["quiet-evening"]);
    assert.equal(prefs?.volume, 0.2);
    assert.equal(readPersistedPrefs(storage)?.favouriteSoundId, "quiet-evening");
  });

  it("returns null for corrupt storage", () => {
    assert.equal(parsePersistedPrefs("{"), null);
    assert.equal(parsePersistedPrefs(null), null);
  });

  it("safely migrates the v1 single favourite shape", () => {
    const parsed = parsePersistedPrefs(
      JSON.stringify({
        volume: "invalid",
        favouriteSoundId: "soft-rain",
        selectedSoundId: "unknown",
      }),
    );
    assert.equal(parsed?.version, 2);
    assert.equal(parsed?.volume, 0.7);
    assert.deepEqual(parsed?.favouriteSoundIds, ["soft-rain"]);
    assert.equal(parsed?.selectedSoundId, null);
  });
});
