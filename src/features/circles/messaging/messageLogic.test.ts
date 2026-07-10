import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createOptimisticMessage,
  markMessageFailed,
  prepareMessageBody,
  prependOlderMessages,
  replaceOptimisticWithConfirmed,
  sortMessagesAscending,
  upsertConfirmedMessage,
  type CircleFeedMessage,
} from "./messageLogic.ts";

function msg(
  partial: Partial<CircleFeedMessage> &
    Pick<CircleFeedMessage, "id" | "clientKey" | "body" | "createdAt">,
): CircleFeedMessage {
  return {
    circleId: "circle-a",
    parentId: "parent-1",
    authorName: "Alex",
    status: "confirmed",
    isOwn: false,
    ...partial,
  };
}

describe("prepareMessageBody", () => {
  it("rejects empty and whitespace-only input", () => {
    assert.equal(prepareMessageBody("").ok, false);
    assert.equal(prepareMessageBody("   \n\t  ").ok, false);
  });

  it("trims whitespace", () => {
    const result = prepareMessageBody("  hello there  ");
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.body, "hello there");
  });

  it("rejects oversized messages", () => {
    const result = prepareMessageBody("x".repeat(2001));
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "too_long");
  });
});

describe("ordering", () => {
  it("orders by createdAt then id", () => {
    const sorted = sortMessagesAscending([
      msg({
        id: "b",
        clientKey: "b",
        body: "second",
        createdAt: "2026-07-10T10:00:00.000Z",
      }),
      msg({
        id: "a",
        clientKey: "a",
        body: "first",
        createdAt: "2026-07-10T09:00:00.000Z",
      }),
      msg({
        id: "c",
        clientKey: "c",
        body: "tie-break",
        createdAt: "2026-07-10T10:00:00.000Z",
      }),
    ]);

    assert.deepEqual(
      sorted.map((m) => m.id),
      ["a", "b", "c"],
    );
  });
});

describe("optimistic reconciliation", () => {
  it("reconciles optimistic message without duplication", () => {
    const optimistic = createOptimisticMessage({
      clientKey: "local-1",
      circleId: "circle-a",
      parentId: "parent-1",
      body: "Tiny win",
      authorName: "You",
      createdAt: "2026-07-10T12:00:00.000Z",
    });

    const confirmed = msg({
      id: "server-1",
      clientKey: "server-1",
      parentId: "parent-1",
      body: "Tiny win",
      createdAt: "2026-07-10T12:00:01.000Z",
      isOwn: true,
      authorName: "You",
    });

    const merged = replaceOptimisticWithConfirmed(
      [optimistic],
      "local-1",
      confirmed,
      "circle-a",
    );

    assert.equal(merged.length, 1);
    assert.equal(merged[0].id, "server-1");
    assert.equal(merged[0].clientKey, "local-1");
    assert.equal(merged[0].status, "confirmed");
  });

  it("reconciles realtime payload onto matching optimistic row", () => {
    const optimistic = createOptimisticMessage({
      clientKey: "local-3",
      circleId: "circle-a",
      parentId: "parent-1",
      body: "Realtime path",
      authorName: "You",
    });

    const confirmed = msg({
      id: "server-3",
      clientKey: "server-3",
      parentId: "parent-1",
      body: "Realtime path",
      createdAt: "2026-07-10T12:05:00.000Z",
      isOwn: true,
      authorName: "You",
    });

    const merged = upsertConfirmedMessage([optimistic], confirmed, "circle-a");
    assert.equal(merged.length, 1);
    assert.equal(merged[0].id, "server-3");
    assert.equal(merged[0].clientKey, "local-3");
  });

  it("dedupes realtime insert against existing confirmed id", () => {
    const existing = msg({
      id: "server-1",
      clientKey: "server-1",
      body: "Hello",
      createdAt: "2026-07-10T12:00:00.000Z",
    });

    const incoming = msg({
      id: "server-1",
      clientKey: "server-1",
      body: "Hello",
      createdAt: "2026-07-10T12:00:00.000Z",
    });

    const merged = upsertConfirmedMessage([existing], incoming, "circle-a");
    assert.equal(merged.length, 1);
  });

  it("rejects messages from another circle", () => {
    const existing = msg({
      id: "a",
      clientKey: "a",
      body: "mine",
      createdAt: "2026-07-10T12:00:00.000Z",
    });

    const foreign = msg({
      id: "b",
      clientKey: "b",
      body: "other circle",
      createdAt: "2026-07-10T12:01:00.000Z",
      circleId: "circle-b",
    });

    const merged = upsertConfirmedMessage([existing], foreign, "circle-a");
    assert.equal(merged.length, 1);
    assert.equal(merged[0].id, "a");
  });
});

describe("failed retry state", () => {
  it("marks a message failed and keeps the body", () => {
    const optimistic = createOptimisticMessage({
      clientKey: "local-2",
      circleId: "circle-a",
      parentId: "parent-1",
      body: "Still here",
      authorName: "You",
    });

    const failed = markMessageFailed([optimistic], "local-2");
    assert.equal(failed[0].status, "failed");
    assert.equal(failed[0].body, "Still here");
  });
});

describe("pagination merge", () => {
  it("prepends older messages without duplicates", () => {
    const current = [
      msg({
        id: "2",
        clientKey: "2",
        body: "newer",
        createdAt: "2026-07-10T11:00:00.000Z",
      }),
    ];
    const older = [
      msg({
        id: "1",
        clientKey: "1",
        body: "older",
        createdAt: "2026-07-10T10:00:00.000Z",
      }),
      msg({
        id: "2",
        clientKey: "2",
        body: "newer",
        createdAt: "2026-07-10T11:00:00.000Z",
      }),
    ];

    const merged = prependOlderMessages(current, older, "circle-a");
    assert.deepEqual(
      merged.map((m) => m.id),
      ["1", "2"],
    );
  });
});

describe("subscription lifecycle helpers", () => {
  it("cleans up active circle on stop", async () => {
    const { createSubscriptionSession } = await import(
      "./subscriptionLifecycle.ts"
    );
    const session = createSubscriptionSession();
    session.start("circle-a");
    assert.equal(session.isActive(), true);
    assert.equal(session.getCircleId(), "circle-a");
    session.stop();
    assert.equal(session.isActive(), false);
    assert.equal(session.getCircleId(), null);
  });

  it("filters another circle and duplicate ids", async () => {
    const { shouldAcceptRealtimeMessage } = await import(
      "./subscriptionLifecycle.ts"
    );
    assert.equal(
      shouldAcceptRealtimeMessage({
        activeCircleId: "circle-a",
        incomingCircleId: "circle-b",
        existingIds: new Set(),
        incomingId: "1",
      }),
      false,
    );
    assert.equal(
      shouldAcceptRealtimeMessage({
        activeCircleId: "circle-a",
        incomingCircleId: "circle-a",
        existingIds: new Set(["1"]),
        incomingId: "1",
      }),
      false,
    );
    assert.equal(
      shouldAcceptRealtimeMessage({
        activeCircleId: "circle-a",
        incomingCircleId: "circle-a",
        existingIds: new Set(),
        incomingId: "2",
      }),
      true,
    );
  });
});
