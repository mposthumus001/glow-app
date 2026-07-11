import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { circlePreviewFromLoad } from "./tonightCirclePreview.ts";

describe("circlePreviewFromLoad", () => {
  it("maps assigned circles to live preview fields", () => {
    const preview = circlePreviewFromLoad({
      status: "assigned",
      data: {
        circle: {
          id: "c1",
          name: "VIC · 0–6 months",
          description: null,
          status: "active",
          max_members: 12,
          circle_type: "peer",
          primary_state: "VIC",
        },
        memberCount: 4,
        onlineCount: 2,
        messages: [],
      },
    });

    assert.equal(preview.status, "assigned");
    assert.equal(preview.name, "VIC · 0–6 months");
    assert.equal(preview.memberCount, 4);
    assert.equal(preview.onlineCount, 2);
    assert.equal(preview.primaryState, "VIC");
  });

  it("maps unassigned state to calm matching copy", () => {
    const preview = circlePreviewFromLoad({ status: "unassigned" });
    assert.equal(preview.status, "unassigned");
    assert.match(preview.message ?? "", /matching/i);
  });
});
