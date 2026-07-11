import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { BabyActivityItem } from "../types.ts";
import {
  ACTIVITY_PAGE_SIZE,
  activityDetail,
  activityTitle,
  australianDateString,
  australianDayBounds,
  computeTodaySummary,
  feedingKindToEventType,
  formatDuration,
  paginateActivity,
  sleepDurationMs,
  sortActivityNewestFirst,
  validateFeedingInput,
  validateNappyInput,
  validateSleepInput,
} from "./eventLogic.ts";

function item(
  partial: Partial<BabyActivityItem> &
    Pick<BabyActivityItem, "id" | "kind" | "startedAt">,
): BabyActivityItem {
  return {
    babyId: "baby-1",
    parentId: "parent-1",
    eventType:
      partial.kind === "sleep"
        ? "sleep"
        : partial.kind === "nappy"
          ? "nappy"
          : "breastfeed",
    endedAt: null,
    amountMl: null,
    side: null,
    notes: null,
    nappyType: null,
    feedingKind: partial.kind === "feeding" ? "breast" : null,
    status: "confirmed",
    clientKey: partial.id,
    ...partial,
  };
}

describe("validateFeedingInput", () => {
  it("requires a feeding type", () => {
    const result = validateFeedingInput({
      kind: null,
      startedAt: "2026-07-11T10:00",
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.field, "kind");
  });

  it("accepts breast with optional side and maps event type", () => {
    const result = validateFeedingInput({
      kind: "breast",
      startedAt: "2026-07-11T10:00:00",
      side: "left",
      notes: "Calm feed",
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.eventType, "breastfeed");
      assert.equal(result.side, "left");
      assert.equal(result.amountMl, null);
      assert.equal(result.notes, "Calm feed");
    }
  });

  it("rejects non-positive amount for bottle", () => {
    const result = validateFeedingInput({
      kind: "bottle",
      startedAt: "2026-07-11T10:00:00",
      amountMl: 0,
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.field, "amountMl");
  });

  it("maps other feeds to note with metadata", () => {
    const result = validateFeedingInput({
      kind: "other",
      startedAt: "2026-07-11T10:00:00",
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.eventType, "note");
      assert.deepEqual(result.metadata, { tracking: "feeding_other" });
    }
  });

  it("rejects notes that are too long", () => {
    const result = validateFeedingInput({
      kind: "solids",
      startedAt: "2026-07-11T10:00:00",
      notes: "x".repeat(281),
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.field, "notes");
  });
});

describe("validateSleepInput", () => {
  it("rejects end before start", () => {
    const result = validateSleepInput({
      startedAt: "2026-07-11T12:00:00",
      endedAt: "2026-07-11T11:00:00",
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.field, "endedAt");
  });

  it("rejects zero duration", () => {
    const result = validateSleepInput({
      startedAt: "2026-07-11T12:00:00.000Z",
      endedAt: "2026-07-11T12:00:00.000Z",
    });
    assert.equal(result.ok, false);
  });

  it("accepts a completed sleep and derives duration", () => {
    const result = validateSleepInput({
      startedAt: "2026-07-11T01:00:00.000Z",
      endedAt: "2026-07-11T02:30:00.000Z",
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.durationMs, 90 * 60 * 1000);
    }
  });

  it("rejects sleeps longer than 24 hours", () => {
    const result = validateSleepInput({
      startedAt: "2026-07-10T00:00:00.000Z",
      endedAt: "2026-07-11T01:00:00.000Z",
    });
    assert.equal(result.ok, false);
  });
});

describe("validateNappyInput", () => {
  it("requires nappy type", () => {
    const result = validateNappyInput({
      nappyType: null,
      startedAt: "2026-07-11T10:00:00",
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.field, "nappyType");
  });

  it("stores nappy_type in metadata", () => {
    const result = validateNappyInput({
      nappyType: "both",
      startedAt: "2026-07-11T10:00:00",
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.deepEqual(result.metadata, { nappy_type: "both" });
    }
  });
});

describe("sleepDurationMs and formatDuration", () => {
  it("returns null for impossible ranges", () => {
    assert.equal(
      sleepDurationMs("2026-07-11T12:00:00.000Z", "2026-07-11T11:00:00.000Z"),
      null,
    );
  });

  it("formats hours and minutes calmly", () => {
    assert.equal(formatDuration(90 * 60 * 1000), "1 hr 30 min");
    assert.equal(formatDuration(45 * 60 * 1000), "45 min");
  });
});

describe("feedingKindToEventType", () => {
  it("maps product kinds to schema types", () => {
    assert.equal(feedingKindToEventType("breast"), "breastfeed");
    assert.equal(feedingKindToEventType("bottle"), "bottle_feed");
    assert.equal(feedingKindToEventType("formula"), "formula");
    assert.equal(feedingKindToEventType("expressed_milk"), "expressed_milk");
    assert.equal(feedingKindToEventType("solids"), "solids");
    assert.equal(feedingKindToEventType("other"), "note");
  });
});

describe("australian timezone day bounds", () => {
  it("uses Australia/Sydney calendar date", () => {
    // 2026-07-10 14:30 UTC = 2026-07-11 00:30 AEST (UTC+10)
    const at = new Date("2026-07-10T14:30:00.000Z");
    assert.equal(australianDateString(at), "2026-07-11");
  });

  it("keeps late evening on the previous Sydney day", () => {
    // 2026-07-10 13:30 UTC = 2026-07-10 23:30 AEST
    const at = new Date("2026-07-10T13:30:00.000Z");
    assert.equal(australianDateString(at), "2026-07-10");
  });

  it("produces half-open day bounds that contain local midnight", () => {
    const at = new Date("2026-07-11T04:00:00.000Z");
    const bounds = australianDayBounds(at);
    assert.equal(bounds.date, "2026-07-11");
    assert.equal(australianDateString(new Date(bounds.startIso)), "2026-07-11");
    assert.equal(australianDateString(new Date(bounds.endIso)), "2026-07-12");
    assert.ok(new Date(bounds.endIso).getTime() > new Date(bounds.startIso).getTime());
  });
});

describe("computeTodaySummary", () => {
  it("counts feeds and nappies that started today in Sydney", () => {
    // Sydney 2026-07-11 afternoon
    const now = new Date("2026-07-11T04:00:00.000Z");
    const items = [
      item({
        id: "f1",
        kind: "feeding",
        startedAt: "2026-07-11T01:00:00.000Z",
      }),
      item({
        id: "f2",
        kind: "feeding",
        startedAt: "2026-07-10T01:00:00.000Z",
      }),
      item({
        id: "n1",
        kind: "nappy",
        startedAt: "2026-07-11T02:00:00.000Z",
        nappyType: "wet",
      }),
    ];

    const summary = computeTodaySummary(items, now);
    assert.equal(summary.date, "2026-07-11");
    assert.equal(summary.feedCount, 1);
    assert.equal(summary.nappyCount, 1);
    assert.equal(summary.mostRecent?.id, "n1");
  });

  it("clips sleep duration to the Australian day", () => {
    const now = new Date("2026-07-11T04:00:00.000Z");
    const bounds = australianDayBounds(now);
    // Sleep from 1h before midnight to 1h after
    const start = new Date(
      new Date(bounds.startIso).getTime() - 60 * 60 * 1000,
    ).toISOString();
    const end = new Date(
      new Date(bounds.startIso).getTime() + 60 * 60 * 1000,
    ).toISOString();

    const summary = computeTodaySummary(
      [
        item({
          id: "s1",
          kind: "sleep",
          startedAt: start,
          endedAt: end,
        }),
      ],
      now,
    );

    assert.equal(summary.sleepMs, 60 * 60 * 1000);
  });

  it("ignores incomplete sleep for totals", () => {
    const now = new Date("2026-07-11T04:00:00.000Z");
    const summary = computeTodaySummary(
      [
        item({
          id: "s1",
          kind: "sleep",
          startedAt: "2026-07-11T01:00:00.000Z",
          endedAt: null,
        }),
      ],
      now,
    );
    assert.equal(summary.sleepMs, 0);
  });
});

describe("recent activity ordering and pagination", () => {
  it("orders newest first", () => {
    const sorted = sortActivityNewestFirst([
      item({ id: "a", kind: "feeding", startedAt: "2026-07-11T01:00:00.000Z" }),
      item({ id: "b", kind: "feeding", startedAt: "2026-07-11T03:00:00.000Z" }),
      item({ id: "c", kind: "feeding", startedAt: "2026-07-11T02:00:00.000Z" }),
    ]);
    assert.deepEqual(
      sorted.map((i) => i.id),
      ["b", "c", "a"],
    );
  });

  it("paginates with a finite earlier cursor", () => {
    const items = Array.from({ length: ACTIVITY_PAGE_SIZE + 5 }, (_, i) =>
      item({
        id: `id-${String(i).padStart(2, "0")}`,
        kind: "feeding",
        startedAt: new Date(
          Date.UTC(2026, 6, 11, 12, 0, 0) - i * 60_000,
        ).toISOString(),
      }),
    );

    const first = paginateActivity(items, ACTIVITY_PAGE_SIZE);
    assert.equal(first.page.length, ACTIVITY_PAGE_SIZE);
    assert.equal(first.hasMore, true);

    const last = first.page[first.page.length - 1]!;
    const second = paginateActivity(items, ACTIVITY_PAGE_SIZE, {
      startedAt: last.startedAt,
      id: last.id,
    });
    assert.equal(second.page.length, 5);
    assert.equal(second.hasMore, false);
  });
});

describe("activity labels", () => {
  it("builds calm titles and details", () => {
    assert.equal(
      activityTitle(
        item({
          id: "1",
          kind: "feeding",
          startedAt: "2026-07-11T01:00:00.000Z",
          feedingKind: "formula",
          amountMl: 120,
        }),
      ),
      "Formula",
    );
    assert.equal(
      activityDetail(
        item({
          id: "1",
          kind: "feeding",
          startedAt: "2026-07-11T01:00:00.000Z",
          feedingKind: "formula",
          amountMl: 120,
          notes: "Dream feed",
        }),
      ),
      "120 ml · Dream feed",
    );
  });
});

describe("empty summary", () => {
  it("returns zeros with no entries", () => {
    const now = new Date("2026-07-11T04:00:00.000Z");
    const summary = computeTodaySummary([], now);
    assert.equal(summary.feedCount, 0);
    assert.equal(summary.sleepMs, 0);
    assert.equal(summary.nappyCount, 0);
    assert.equal(summary.mostRecent, null);
  });
});
