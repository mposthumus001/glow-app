import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  formatOccurredOnLong,
  formatOccurredOnShort,
} from "./formatOccurredOn.ts";

describe("formatOccurredOn hydration-safe labels", () => {
  it("formats short dates without locale APIs", () => {
    assert.equal(formatOccurredOnShort("2024-04-20"), "20 Apr 2024");
  });

  it("formats long dates with weekday without locale APIs", () => {
    assert.equal(
      formatOccurredOnLong("2024-04-20"),
      "Saturday, 20 April 2024",
    );
  });

  it("returns the raw value for invalid dates", () => {
    assert.equal(formatOccurredOnShort("not-a-date"), "not-a-date");
  });
});
