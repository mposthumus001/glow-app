import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatBabyAgeAtDate } from "./ageAtDate.ts";

describe("formatBabyAgeAtDate", () => {
  it("calculates exact age from DOB at occurred_on", () => {
    const result = formatBabyAgeAtDate({
      dateOfBirth: "2026-01-15",
      dueDate: null,
      occurredOn: "2026-07-15",
    });
    assert.equal(result.kind, "exact");
    assert.equal(result.months, 6);
    assert.equal(result.label, "6 months");
  });

  it("handles occurred date before birth", () => {
    const result = formatBabyAgeAtDate({
      dateOfBirth: "2026-06-01",
      dueDate: null,
      occurredOn: "2026-05-01",
    });
    assert.equal(result.kind, "before_birth");
    assert.equal(result.label, "Before birth");
  });

  it("uses due date approximately when DOB missing", () => {
    const result = formatBabyAgeAtDate({
      dateOfBirth: null,
      dueDate: "2026-03-01",
      occurredOn: "2026-06-01",
    });
    assert.equal(result.kind, "approximate");
    assert.match(result.label ?? "", /about/i);
  });

  it("returns unknown without dates", () => {
    const result = formatBabyAgeAtDate({
      dateOfBirth: null,
      dueDate: null,
      occurredOn: "2026-06-01",
    });
    assert.equal(result.kind, "unknown");
    assert.equal(result.label, null);
  });

  it("handles leap-year boundaries", () => {
    const result = formatBabyAgeAtDate({
      dateOfBirth: "2024-02-29",
      dueDate: null,
      occurredOn: "2025-02-28",
    });
    assert.equal(result.months, 11);
  });
});
