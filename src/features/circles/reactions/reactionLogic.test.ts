import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  aggregateReactions,
  applyOptimisticReactionToggle,
  canReactToMessage,
  findViewerReactionRow,
  removeReactionRow,
  replaceReactionRowId,
  type ReactionRow,
  upsertReactionRow,
  viewerHasReaction,
} from "./reactionLogic.ts";
import { isSupportedReactionType, SUPPORTED_REACTION_TYPES } from "./reactionLogic.ts";

describe("supported reaction types", () => {
  it("allows only curated types", () => {
    assert.deepEqual(SUPPORTED_REACTION_TYPES, [
      "support",
      "with_you",
      "tiny_win",
      "sending_care",
    ]);
    assert.equal(isSupportedReactionType("support"), true);
    assert.equal(isSupportedReactionType("like"), false);
  });
});

describe("aggregateReactions", () => {
  const viewer = "parent-viewer";

  it("aggregates counts and viewer selection", () => {
    const rows: ReactionRow[] = [
      {
        id: "1",
        messageId: "m1",
        parentId: "a",
        reactionType: "support",
      },
      {
        id: "2",
        messageId: "m1",
        parentId: viewer,
        reactionType: "support",
      },
    ];
    const map = aggregateReactions(rows, viewer);
    const agg = map.get("m1")?.aggregates[0];
    assert.equal(agg?.count, 2);
    assert.equal(agg?.viewerSelected, true);
  });

  it("prevents duplicate identical reactions in aggregation input", () => {
    const rows: ReactionRow[] = [
      {
        id: "1",
        messageId: "m1",
        parentId: viewer,
        reactionType: "support",
      },
    ];
    const doubled = upsertReactionRow(rows, rows[0]);
    assert.equal(doubled.length, 1);
  });
});

describe("toggle optimistic reactions", () => {
  const viewer = "parent-viewer";
  const base = new Map(
    aggregateReactions(
      [
        {
          id: "1",
          messageId: "m1",
          parentId: viewer,
          reactionType: "support",
        },
      ],
      viewer,
    ),
  );

  it("adds and removes viewer reaction", () => {
    const added = applyOptimisticReactionToggle({
      current: new Map(),
      messageId: "m1",
      reactionType: "with_you",
      viewerParentId: viewer,
      adding: true,
    });
    assert.equal(viewerHasReaction(added, "m1", "with_you"), true);

    const removed = applyOptimisticReactionToggle({
      current: added,
      messageId: "m1",
      reactionType: "with_you",
      viewerParentId: viewer,
      adding: false,
    });
    assert.equal(viewerHasReaction(removed, "m1", "with_you"), false);
  });

  it("rolls back by restoring prior map", () => {
    const failed = applyOptimisticReactionToggle({
      current: base,
      messageId: "m1",
      reactionType: "support",
      viewerParentId: viewer,
      adding: false,
    });
    assert.equal(viewerHasReaction(failed, "m1", "support"), false);

    const restored = applyOptimisticReactionToggle({
      current: failed,
      messageId: "m1",
      reactionType: "support",
      viewerParentId: viewer,
      adding: true,
    });
    assert.equal(viewerHasReaction(restored, "m1", "support"), true);
  });
});

describe("reaction row helpers", () => {
  it("replaces optimistic row id with confirmed row", () => {
    const rows: ReactionRow[] = [
      {
        id: "optimistic:temp",
        messageId: "m1",
        parentId: "p1",
        reactionType: "support",
      },
    ];
    const next = replaceReactionRowId(rows, "optimistic:temp", {
      id: "real-id",
      messageId: "m1",
      parentId: "p1",
      reactionType: "support",
    });
    assert.equal(next[0]?.id, "real-id");
  });

  it("finds viewer reaction row", () => {
    const rows: ReactionRow[] = [
      {
        id: "1",
        messageId: "m1",
        parentId: "p1",
        reactionType: "support",
      },
    ];
    assert.ok(
      findViewerReactionRow(rows, {
        messageId: "m1",
        parentId: "p1",
        reactionType: "support",
      }),
    );
    assert.equal(
      removeReactionRow(rows, (row) => row.id === "1").length,
      0,
    );
  });
});

describe("canReactToMessage", () => {
  it("rejects cross-circle and non-confirmed messages", () => {
    assert.equal(
      canReactToMessage({
        messageId: "m1",
        circleId: "c2",
        activeCircleId: "c1",
        status: "confirmed",
      }),
      false,
    );
    assert.equal(
      canReactToMessage({
        messageId: "optimistic:x",
        circleId: "c1",
        activeCircleId: "c1",
        status: "optimistic",
      }),
      false,
    );
    assert.equal(
      canReactToMessage({
        messageId: "m1",
        circleId: "c1",
        activeCircleId: "c1",
        status: "confirmed",
      }),
      true,
    );
  });
});

describe("realtime dedupe", () => {
  it("does not double-count identical row ids", () => {
    const rows: ReactionRow[] = [];
    const row: ReactionRow = {
      id: "row-1",
      messageId: "m1",
      parentId: "p2",
      reactionType: "support",
    };
    const first = upsertReactionRow(rows, row);
    const second = upsertReactionRow(first, row);
    assert.equal(second.length, 1);
  });
});
