import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CALM_CATEGORIES,
  CALM_SOUNDS,
  PRODUCTION_SOUND_CATALOGUE,
  getActiveSounds,
  getSoundById,
  getSoundsByCategory,
  isCalmSoundId,
} from "./catalogue.ts";
import { CALM_AUDIO_ASSET_REGISTRY } from "./sounds/assetRegistry.ts";
import { resolveCalmSoundsMode } from "./sounds/flags.ts";
import { validateCalmSoundCatalogue } from "./sounds/validateCatalogue.ts";

describe("Calm catalogue", () => {
  it("keeps a small finite active library", () => {
    assert.equal(getActiveSounds("preview").length, 4);
    assert.equal(CALM_CATEGORIES.length, 4);
  });

  it("resolves sounds by id and category", () => {
    const rain = getSoundById("soft-rain", "preview");
    assert.ok(rain);
    assert.equal(rain?.category, "rain");
    assert.equal(getSoundsByCategory("ocean", "preview").length, 1);
    assert.equal(isCalmSoundId("soft-rain"), true);
    assert.equal(isCalmSoundId("not-a-sound"), false);
  });

  it("marks placeholder assets and continuous loops", () => {
    for (const sound of CALM_SOUNDS) {
      assert.equal(sound.previewOnly, true);
      assert.equal(sound.productionApproved, false);
      assert.equal(sound.loop, true);
      assert.ok(sound.source.src.startsWith("/calm/placeholders/"));
    }
  });

  it("does not autoplay by catalogue alone", () => {
    // Catalogue is data only — no playback side effects.
    assert.ok(getActiveSounds("preview").every((sound) => sound.enabled));
  });

  it("keeps preview and production catalogues strictly separate", () => {
    assert.equal(PRODUCTION_SOUND_CATALOGUE.length, 0);
    assert.equal(getActiveSounds("production").length, 0);
    assert.equal(getSoundById("soft-rain", "production"), null);
    assert.equal(
      resolveCalmSoundsMode({
        previewEnabled: true,
        productionEnabled: true,
      }),
      "production",
    );
    assert.equal(
      resolveCalmSoundsMode({
        previewEnabled: false,
        productionEnabled: false,
      }),
      "off",
    );
    assert.equal(
      resolveCalmSoundsMode({
        previewEnabled: true,
        productionEnabled: false,
      }),
      "preview",
    );
  });

  it("validates preview records against the asset registry", () => {
    assert.deepEqual(
      validateCalmSoundCatalogue(CALM_SOUNDS, CALM_AUDIO_ASSET_REGISTRY, {
        production: false,
      }),
      [],
    );
  });

  it("blocks preview or unlicensed records from production", () => {
    const errors = validateCalmSoundCatalogue(
      CALM_SOUNDS,
      CALM_AUDIO_ASSET_REGISTRY,
      { production: true },
    );
    assert.ok(errors.some((error) => error.includes("preview-only")));
    assert.ok(errors.some((error) => error.includes("approval is required")));

    const withoutRegistry = validateCalmSoundCatalogue(
      [CALM_SOUNDS[0]],
      [],
      { production: true },
    );
    assert.ok(
      withoutRegistry.some((error) =>
        error.includes("missing licence registry record"),
      ),
    );
  });
});
