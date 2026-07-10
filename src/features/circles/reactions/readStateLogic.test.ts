import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { CircleFeedMessage } from "../messaging/messageLogic.ts";
import {
  countUnreadMessages,
  findFirstUnreadIndex,
  formatNavUnreadHint,
  formatUnreadHint,
  mergeReadMarkerMonotonic,
  scrollTargetForFirstUnread,
  shouldAdvanceReadMarker,
  type ReadMarker,
} from "./readStateLogic.ts";

function msg(
  partial: Partial<CircleFeedMessage> &
    Pick<CircleFeedMessage, "id" | "createdAt">,
): CircleFeedMessage {
  return {
    clientKey: partial.id,
    circleId: "circle-1",
    parentId: "other",
    body: "hello",
    authorName: "Alex",
    status: "confirmed",
    isOwn: false,
    ...partial,
  };
}

const marker: ReadMarker = {
  messageId: "m2",
  createdAt: "2026-07-10T10:00:00.000Z",
};

describe("unread derivation", () => {
  const messages = [
    msg({ id: "m1", createdAt: "2026-07-10T09:00:00.000Z" }),
    msg({ id: "m2", createdAt: "2026-07-10T10:00:00.000Z" }),
    msg({ id: "m3", createdAt: "2026-07-10T11:00:00.000Z" }),
  ];

  it("counts messages after marker", () => {
    assert.equal(countUnreadMessages(messages, marker), 1);
    assert.equal(findFirstUnreadIndex(messages, marker), 2);
  });

  it("returns zero when no marker", () => {
    assert.equal(countUnreadMessages(messages, null), 0);
  });

  it("formats calm unread hints", () => {
    assert.equal(formatUnreadHint(2), "2 new messages");
    assert.equal(formatNavUnreadHint(2), "2 new");
    assert.equal(formatUnreadHint(0), null);
  });
});

describe("shouldAdvanceReadMarker", () => {
  const candidate = msg({
    id: "m3",
    createdAt: "2026-07-10T11:00:00.000Z",
  });

  it("does not advance on page load alone", () => {
    assert.equal(
      shouldAdvanceReadMarker({
        candidate,
        currentMarker: marker,
        isNearBottom: false,
        isPageVisible: true,
        observedNewestUnread: false,
      }),
      false,
    );
  });

  it("advances near bottom when visible", () => {
    assert.equal(
      shouldAdvanceReadMarker({
        candidate,
        currentMarker: marker,
        isNearBottom: true,
        isPageVisible: true,
        observedNewestUnread: false,
      }),
      true,
    );
  });

  it("does not advance in hidden tab", () => {
    assert.equal(
      shouldAdvanceReadMarker({
        candidate,
        currentMarker: marker,
        isNearBottom: true,
        isPageVisible: false,
        observedNewestUnread: false,
      }),
      false,
    );
  });

  it("never moves marker backwards", () => {
    const older = msg({
      id: "m1",
      createdAt: "2026-07-10T09:00:00.000Z",
    });
    assert.equal(
      shouldAdvanceReadMarker({
        candidate: older,
        currentMarker: marker,
        isNearBottom: true,
        isPageVisible: true,
        observedNewestUnread: true,
      }),
      false,
    );
  });
});

describe("monotonic multi-device merge", () => {
  it("keeps the furthest read marker", () => {
    const local: ReadMarker = {
      messageId: "m2",
      createdAt: "2026-07-10T10:00:00.000Z",
    };
    const incoming: ReadMarker = {
      messageId: "m3",
      createdAt: "2026-07-10T11:00:00.000Z",
    };
    assert.deepEqual(mergeReadMarkerMonotonic(local, incoming), incoming);
    assert.deepEqual(mergeReadMarkerMonotonic(incoming, local), incoming);
  });
});

describe("first unread positioning", () => {
  it("scrolls to first unread when present", () => {
    assert.equal(scrollTargetForFirstUnread(2, 5), "first-unread");
    assert.equal(scrollTargetForFirstUnread(null, 5), "bottom");
    assert.equal(scrollTargetForFirstUnread(null, 0), "none");
  });
});

describe("missing marker fallback", () => {
  it("does not count all historical messages when marker missing", () => {
    const messages = [
      msg({ id: "m1", createdAt: "2026-07-10T09:00:00.000Z" }),
      msg({ id: "m2", createdAt: "2026-07-10T10:00:00.000Z" }),
    ];
    assert.equal(countUnreadMessages(messages, null), 0);
  });
});

describe("circle scoping via marker usage", () => {
  it("only counts provided message list", () => {
    const circleMessages = [
      msg({ id: "m1", createdAt: "2026-07-10T09:00:00.000Z", circleId: "c1" }),
    ];
    const otherCircleMarker: ReadMarker = {
      messageId: "x1",
      createdAt: "2026-07-10T08:00:00.000Z",
    };
    assert.equal(countUnreadMessages(circleMessages, otherCircleMarker), 1);
  });
});
