import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  PROMPT_LIBRARY,
  australianPromptDateString,
  selectLibraryIndex,
  selectPromptFromLibrary,
  normalizeDailyPrompt,
} from "./promptLibrary.ts";

describe("selectLibraryIndex", () => {
  it("returns the same index for the same circle and date", () => {
    const a = selectLibraryIndex("circle-a", "2026-07-11", PROMPT_LIBRARY.length);
    const b = selectLibraryIndex("circle-a", "2026-07-11", PROMPT_LIBRARY.length);
    assert.equal(a, b);
  });

  it("can change when the calendar date changes", () => {
    const dayOne = selectLibraryIndex(
      "circle-a",
      "2026-07-11",
      PROMPT_LIBRARY.length,
    );
    const dayTwo = selectLibraryIndex(
      "circle-a",
      "2026-07-12",
      PROMPT_LIBRARY.length,
    );
    assert.notEqual(dayOne, dayTwo);
  });

  it("scopes selection per circle", () => {
    const circleA = selectLibraryIndex(
      "circle-a",
      "2026-07-11",
      PROMPT_LIBRARY.length,
    );
    const circleB = selectLibraryIndex(
      "circle-b",
      "2026-07-11",
      PROMPT_LIBRARY.length,
    );
    assert.notEqual(circleA, circleB);
  });
});

describe("selectPromptFromLibrary", () => {
  it("returns a stable prompt for a circle and date", () => {
    const first = selectPromptFromLibrary("circle-1", "2026-07-11");
    const second = selectPromptFromLibrary("circle-1", "2026-07-11");
    assert.deepEqual(first, second);
  });

  it("falls back when library is empty", () => {
    assert.equal(selectPromptFromLibrary("circle-1", "2026-07-11", []), null);
  });
});

describe("australianPromptDateString", () => {
  it("uses Australia/Sydney for afternoon local time", () => {
    const date = new Date("2026-07-11T04:00:00.000Z");
    assert.equal(australianPromptDateString(date), "2026-07-11");
  });

  it("rolls forward across Sydney midnight", () => {
    const date = new Date("2026-07-11T14:00:00.000Z");
    assert.equal(australianPromptDateString(date), "2026-07-12");
  });
});

describe("normalizeDailyPrompt", () => {
  it("returns null when inactive payload is missing text", () => {
    assert.equal(normalizeDailyPrompt(null, "2026-07-11"), null);
    assert.equal(
      normalizeDailyPrompt({ id: "p1", prompt_text: "" }, "2026-07-11"),
      null,
    );
  });

  it("normalizes active prompt rows", () => {
    const prompt = normalizeDailyPrompt(
      {
        id: "p1",
        title: "Tiny win",
        prompt_text: "What's one tiny win from today?",
        prompt_date: "2026-07-11",
      },
      "2026-07-11",
    );
    assert.deepEqual(prompt, {
      id: "p1",
      title: "Tiny win",
      promptText: "What's one tiny win from today?",
      promptDate: "2026-07-11",
    });
  });
});
