import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatBabyAgeLine } from "./baby-age.ts";

describe("formatBabyAgeLine", () => {
  const now = new Date("2026-07-11T00:00:00.000Z");

  it("formats newborn and months from DOB", () => {
    assert.equal(
      formatBabyAgeLine({
        name: "Ava",
        dateOfBirth: "2026-07-01",
        dueDate: null,
        now,
      }),
      "Ava · newborn",
    );
    assert.equal(
      formatBabyAgeLine({
        name: "Ava",
        dateOfBirth: "2026-01-11",
        dueDate: null,
        now,
      }),
      "Ava · 6 months",
    );
  });

  it("uses due date when DOB is missing", () => {
    assert.equal(
      formatBabyAgeLine({
        name: "Baby",
        dateOfBirth: null,
        dueDate: "2026-08-01",
        now,
      }),
      "Baby · arriving soon",
    );
  });

  it("returns null without inventing data", () => {
    assert.equal(
      formatBabyAgeLine({
        name: "Ava",
        dateOfBirth: null,
        dueDate: null,
        now,
      }),
      null,
    );
  });
});
