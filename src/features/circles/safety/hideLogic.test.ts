import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { CircleFeedMessage } from "../messaging/messageLogic.ts";
import {
  filterVisibleMessages,
  isMessageHidden,
  mergeHiddenIds,
  removeHiddenId,
} from "./hideLogic.ts";

function msg(id: string): CircleFeedMessage {
  return {
    id,
    clientKey: id,
    circleId: "circle-1",
    parentId: "other",
    body: "hello",
    createdAt: "2026-07-11T10:00:00.000Z",
    authorName: "Alex",
    status: "confirmed",
    isOwn: false,
  };
}

describe("filterVisibleMessages", () => {
  const messages = [msg("m1"), msg("m2"), msg("m3")];

  it("returns all messages when nothing is hidden", () => {
    assert.deepEqual(filterVisibleMessages(messages, new Set()), messages);
  });

  it("hides only the selected message for the current user", () => {
    const hidden = mergeHiddenIds(new Set(), "m2");
    const visible = filterVisibleMessages(messages, hidden);
    assert.deepEqual(
      visible.map((message) => message.id),
      ["m1", "m3"],
    );
  });

  it("keeps hidden messages excluded after new realtime rows arrive", () => {
    const hidden = mergeHiddenIds(new Set(), "m2");
    const withRealtime = [...messages, msg("m4")];
    const visible = filterVisibleMessages(withRealtime, hidden);
    assert.deepEqual(
      visible.map((message) => message.id),
      ["m1", "m3", "m4"],
    );
    assert.equal(isMessageHidden("m2", hidden), true);
  });
});

describe("hidden id helpers", () => {
  it("supports unhide when implemented", () => {
    const hidden = mergeHiddenIds(new Set(), "m1");
    const restored = removeHiddenId(hidden, "m1");
    assert.equal(isMessageHidden("m1", restored), false);
  });
});
