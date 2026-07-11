import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CALM_CATEGORIES,
  CALM_SOUNDS,
  getActiveSounds,
  getSoundById,
  getSoundsByCategory,
  isCalmSoundId,
} from "./catalogue.ts";

describe("Calm catalogue", () => {
  it("keeps a small finite active library", () => {
    assert.equal(getActiveSounds().length, 4);
    assert.equal(CALM_CATEGORIES.length, 4);
  });

  it("resolves sounds by id and category", () => {
    const rain = getSoundById("soft-rain");
    assert.ok(rain);
    assert.equal(rain?.categoryId, "rain");
    assert.equal(getSoundsByCategory("ocean").length, 1);
    assert.equal(isCalmSoundId("soft-rain"), true);
    assert.equal(isCalmSoundId("not-a-sound"), false);
  });

  it("marks placeholder assets and continuous loops", () => {
    for (const sound of CALM_SOUNDS) {
      assert.equal(sound.isPlaceholderAsset, true);
      assert.equal(sound.continuous, true);
      assert.ok(sound.src.startsWith("/calm/placeholders/"));
    }
  });

  it("does not autoplay by catalogue alone", () => {
    // Catalogue is data only — no playback side effects.
    assert.ok(getActiveSounds().every((s) => s.active));
  });
});
