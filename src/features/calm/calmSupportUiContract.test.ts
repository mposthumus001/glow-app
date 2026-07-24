import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const here = dirname(fileURLToPath(import.meta.url));
const supportHome = readFileSync(
  join(here, "components", "CalmSupportHome.tsx"),
  "utf8",
);
const exerciseScreen = readFileSync(
  join(here, "components", "CalmExerciseScreen.tsx"),
  "utf8",
);

describe("Calm Support UI contracts", () => {
  it("keeps Support need-based, phone-safe, and linked to Sounds", () => {
    assert.match(supportHome, /What would help right now\?/);
    assert.match(supportHome, /CALM_SUPPORT_CATEGORIES\.map/);
    assert.match(supportHome, /className="grid gap-3 sm:grid-cols-2"/);
    assert.match(supportHome, /min-w-0/);
    assert.match(supportHome, /href="\/calm\/sounds"/);
    assert.match(supportHome, /href="\/profile\/safety"/);
  });

  it("keeps exercise navigation optional and keyboard-focus aware", () => {
    assert.match(exerciseScreen, /Finish early/);
    assert.match(exerciseScreen, /Previous/);
    assert.match(exerciseScreen, /Skip this step/);
    assert.match(exerciseScreen, /instructionRef\.current\?\.focus/);
    assert.match(exerciseScreen, /completionRef\.current\?\.focus/);
    assert.match(exerciseScreen, /tabIndex=\{-1\}/);
    assert.match(exerciseScreen, /aria-live="polite"/);
  });

  it("keeps controls touch-sized and breathing motion optional", () => {
    assert.match(exerciseScreen, /min-h-11/);
    assert.match(exerciseScreen, /useGlowReducedMotion\(\)/);
    assert.match(exerciseScreen, /!reducedMotion && timerRunning/);
    assert.match(exerciseScreen, /Start optional one-minute timer/);
    assert.match(exerciseScreen, /Pause timer/);
    assert.match(exerciseScreen, /Continue timer/);
  });

  it("contains no notification, vibration, audio, or sensitive logging hooks", () => {
    for (const forbidden of [
      "Notification",
      "navigator.vibrate",
      "new Audio",
      "<audio",
      "console.",
      "localStorage",
      "sessionStorage",
      "fetch(",
    ]) {
      assert.equal(supportHome.includes(forbidden), false, forbidden);
      assert.equal(exerciseScreen.includes(forbidden), false, forbidden);
    }
  });
});
