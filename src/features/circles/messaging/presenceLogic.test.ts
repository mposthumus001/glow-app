import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  TYPING_EXPIRE_MS,
  TYPING_PUBLISH_DELAY_MS,
  TYPING_REFRESH_MS,
  applyTypingEvent,
  applyTypingEventForCircle,
  clearExpiredTyping,
  countUniqueOnlineParents,
  formatOnlinePresenceCopy,
  formatTypingIndicatorCopy,
  reconnectBackoffMs,
  shouldIgnorePresenceForCircle,
  uniquePresenceByParentId,
  type CircleTypingPeer,
} from "./presenceLogic.ts";

describe("timing constants", () => {
  it("uses restrained typing intervals", () => {
    assert.ok(TYPING_PUBLISH_DELAY_MS >= 250 && TYPING_PUBLISH_DELAY_MS <= 400);
    assert.ok(TYPING_REFRESH_MS >= 1500 && TYPING_REFRESH_MS <= 3000);
    assert.ok(TYPING_EXPIRE_MS >= 2000 && TYPING_EXPIRE_MS <= 4000);
  });
});

describe("unique presence", () => {
  it("counts unique parents rather than raw sessions", () => {
    const peers = [
      { parentId: "a", displayName: "Mia Chen" },
      { parentId: "a", displayName: "Mia" },
      { parentId: "b", displayName: "Jordan" },
    ];
    const unique = uniquePresenceByParentId(peers);
    assert.equal(unique.length, 2);
    assert.equal(countUniqueOnlineParents(peers), 2);
    assert.equal(unique.find((p) => p.parentId === "a")?.displayName, "Mia");
  });
});

describe("online copy", () => {
  it("stays calm when alone", () => {
    const copy = formatOnlinePresenceCopy({
      onlineCount: 1,
      memberCount: 6,
    });
    assert.match(copy, /first one here/i);
  });

  it("can preview one other parent", () => {
    const copy = formatOnlinePresenceCopy({
      onlineCount: 2,
      memberCount: 6,
      previewNames: ["Mia"],
    });
    assert.match(copy, /Mia is here with you/);
  });
});

describe("typing indicators", () => {
  it("excludes the current user from typing display", () => {
    const peers: CircleTypingPeer[] = [
      {
        parentId: "me",
        displayName: "Me",
        expiresAt: Date.now() + 5000,
      },
      {
        parentId: "mia",
        displayName: "Mia",
        expiresAt: Date.now() + 5000,
      },
    ];
    const label = formatTypingIndicatorCopy(peers, "me");
    assert.equal(label, "Mia is typing…");
  });

  it("deduplicates repeated typing events", () => {
    let peers: CircleTypingPeer[] = [];
    peers = applyTypingEvent(
      peers,
      { parentId: "mia", displayName: "Mia", typing: true, at: 1 },
      "me",
      1000,
    );
    peers = applyTypingEvent(
      peers,
      { parentId: "mia", displayName: "Mia", typing: true, at: 2 },
      "me",
      1500,
    );
    assert.equal(peers.length, 1);
    assert.equal(peers[0].expiresAt, 1500 + TYPING_EXPIRE_MS);
  });

  it("clears stale typing users", () => {
    const peers: CircleTypingPeer[] = [
      { parentId: "mia", displayName: "Mia", expiresAt: 1000 },
      { parentId: "sam", displayName: "Sam", expiresAt: 5000 },
    ];
    const next = clearExpiredTyping(peers, 2000);
    assert.deepEqual(
      next.map((p) => p.parentId),
      ["sam"],
    );
  });

  it("stops typing when typing=false is received", () => {
    let peers = applyTypingEvent(
      [],
      { parentId: "mia", displayName: "Mia", typing: true, at: 1 },
      "me",
      1000,
    );
    peers = applyTypingEvent(
      peers,
      { parentId: "mia", displayName: "Mia", typing: false, at: 2 },
      "me",
      2000,
    );
    assert.equal(peers.length, 0);
  });

  it("ignores typing from another circle", () => {
    const peers = applyTypingEventForCircle(
      [],
      { parentId: "mia", displayName: "Mia", typing: true, at: 1 },
      "me",
      "circle-a",
      "circle-b",
      1000,
    );
    assert.equal(peers.length, 0);
  });

  it("collapses larger typing groups", () => {
    const peers: CircleTypingPeer[] = [
      { parentId: "1", displayName: "A", expiresAt: 9 },
      { parentId: "2", displayName: "B", expiresAt: 9 },
      { parentId: "3", displayName: "C", expiresAt: 9 },
      { parentId: "4", displayName: "D", expiresAt: 9 },
    ];
    assert.equal(
      formatTypingIndicatorCopy(peers, "me"),
      "A few parents are typing…",
    );
  });
});

describe("circle scoping", () => {
  it("ignores presence events for another circle", () => {
    assert.equal(shouldIgnorePresenceForCircle("a", "b"), true);
    assert.equal(shouldIgnorePresenceForCircle("a", "a"), false);
  });
});

describe("reconnect backoff", () => {
  it("grows then caps", () => {
    assert.equal(reconnectBackoffMs(0), 1000);
    assert.equal(reconnectBackoffMs(1), 2000);
    assert.ok(reconnectBackoffMs(10) <= 30_000);
  });
});
