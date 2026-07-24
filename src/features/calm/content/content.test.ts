import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CALM_SUPPORT_CATEGORIES } from "./categories.ts";
import { CALM_EXERCISES, getCalmExercise } from "./exercises.ts";
import { validateCalmContent } from "./validateContent.ts";

describe("Calm Support content", () => {
  it("has six need categories and three valid enabled exercises", () => {
    assert.equal(CALM_SUPPORT_CATEGORIES.length, 6);
    assert.equal(CALM_EXERCISES.length, 3);
    assert.ok(CALM_EXERCISES.every((exercise) => exercise.enabled));
    assert.deepEqual(validateCalmContent(), []);
  });

  it("keeps the reviewed exercise slugs and metadata", () => {
    assert.deepEqual(
      CALM_EXERCISES.map((exercise) => exercise.slug),
      [
        "one-minute-breathing-reset",
        "five-senses-grounding",
        "tonight-is-hard-reassurance",
      ],
    );
    assert.deepEqual(
      CALM_EXERCISES.map((exercise) => exercise.exerciseType),
      ["breathing", "grounding", "reassurance"],
    );
    assert.ok(CALM_EXERCISES.every((exercise) => exercise.steps.length === 6));
  });

  it("preserves reviewed safety and completion wording", () => {
    const breathing = getCalmExercise("one-minute-breathing-reset");
    const reassurance = getCalmExercise("tonight-is-hard-reassurance");

    assert.equal(
      breathing?.safetyNote,
      "If focusing on your breath feels uncomfortable, stop and choose another support option.",
    );
    assert.equal(
      reassurance?.completion,
      "There is nothing to complete here. Glow will still be here when you return.",
    );
    assert.equal(getCalmExercise("unknown"), null);
  });
});
