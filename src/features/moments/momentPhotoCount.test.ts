import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  countDistinctMomentsWithReadyMedia,
  filterMomentIdsWithReadyMedia,
  formatMomentPhotoCount,
} from "./momentPhotoCount.ts";

describe("momentPhotoCount", () => {
  it("formats singular, plural, and empty labels", () => {
    assert.equal(formatMomentPhotoCount(0), "No photos yet");
    assert.equal(formatMomentPhotoCount(1), "1 photo");
    assert.equal(formatMomentPhotoCount(2), "2 photos");
    assert.equal(formatMomentPhotoCount(6), "6 photos");
  });

  it("counts one ready Moment when five failed media attempts exist on other rows", () => {
    const mediaMap = new Map([
      ["ready-moment", [{ processing_status: "ready" }]],
      ["failed-1", [{ processing_status: "failed" }]],
      ["failed-2", [{ processing_status: "failed" }]],
      ["failed-3", [{ processing_status: "failed" }]],
      ["failed-4", [{ processing_status: "failed" }]],
      ["failed-5", [{ processing_status: "failed" }]],
    ]);

    const momentIds = [
      "ready-moment",
      "failed-1",
      "failed-2",
      "failed-3",
      "failed-4",
      "failed-5",
    ];

    assert.equal(
      countDistinctMomentsWithReadyMedia(momentIds, mediaMap),
      1,
    );
    assert.equal(formatMomentPhotoCount(1), "1 photo");
  });

  it("counts each Moment once when duplicate media joins would inflate totals", () => {
    const mediaMap = new Map([
      [
        "moment-a",
        [
          { processing_status: "ready" },
          { processing_status: "failed" },
        ],
      ],
      ["moment-b", [{ processing_status: "processing" }]],
      ["moment-c", [{ processing_status: "pending" }]],
    ]);

    assert.deepEqual(
      filterMomentIdsWithReadyMedia(
        ["moment-a", "moment-b", "moment-c"],
        mediaMap,
      ),
      ["moment-a"],
    );
  });

  it("excludes deleted or non-ready statuses", () => {
    const mediaMap = new Map([
      ["m1", [{ processing_status: "failed" }]],
      ["m2", [{ processing_status: "processing" }]],
      ["m3", [{ processing_status: "pending" }]],
    ]);
    assert.equal(
      countDistinctMomentsWithReadyMedia(["m1", "m2", "m3"], mediaMap),
      0,
    );
  });
});
