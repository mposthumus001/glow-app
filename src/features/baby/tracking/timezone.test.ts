import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  australianDateString,
  australianDayBounds,
  formatActivityTime,
} from "./eventLogic.ts";

describe("timezone boundary behaviour", () => {
  it("does not use UTC date for Sydney evening", () => {
    // 2026-07-11 13:00 UTC = 2026-07-11 23:00 AEST — still 11th in Sydney
    assert.equal(
      australianDateString(new Date("2026-07-11T13:00:00.000Z")),
      "2026-07-11",
    );
    // 2026-07-11 14:00 UTC = 2026-07-12 00:00 AEST
    assert.equal(
      australianDateString(new Date("2026-07-11T14:00:00.000Z")),
      "2026-07-12",
    );
  });

  it("day bounds exclude the next midnight", () => {
    const bounds = australianDayBounds(
      new Date("2026-07-11T04:00:00.000Z"),
    );
    const end = new Date(bounds.endIso).getTime();
    const justBefore = new Date(end - 1);
    const atEnd = new Date(end);
    assert.equal(australianDateString(justBefore), "2026-07-11");
    assert.equal(australianDateString(atEnd), "2026-07-12");
  });

  it("formats same-day times without a date prefix", () => {
    const now = new Date("2026-07-11T05:00:00.000Z");
    const label = formatActivityTime("2026-07-11T04:30:00.000Z", now);
    assert.ok(label.length > 0);
    assert.equal(label.includes("·"), false);
  });
});
