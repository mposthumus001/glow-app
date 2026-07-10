import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  REPORT_NOTE_MAX_LENGTH,
  canReportMessage,
  isReportReason,
  validateReportNote,
} from "./reportLogic.ts";

describe("isReportReason", () => {
  it("accepts supported reasons", () => {
    assert.equal(isReportReason("harmful"), true);
    assert.equal(isReportReason("other"), true);
  });

  it("rejects unknown reasons", () => {
    assert.equal(isReportReason("urgent"), false);
  });
});

describe("validateReportNote", () => {
  it("allows empty notes", () => {
    assert.deepEqual(validateReportNote("   "), { ok: true, note: null });
  });

  it("trims and keeps short notes", () => {
    assert.deepEqual(validateReportNote("  gentle note  "), {
      ok: true,
      note: "gentle note",
    });
  });

  it("rejects notes over the limit", () => {
    const long = "x".repeat(REPORT_NOTE_MAX_LENGTH + 1);
    assert.deepEqual(validateReportNote(long), {
      ok: false,
      reason: "too_long",
    });
  });
});

describe("canReportMessage", () => {
  it("allows active members to report confirmed messages from others", () => {
    assert.equal(
      canReportMessage({
        messageId: "m1",
        circleId: "circle-1",
        activeCircleId: "circle-1",
        status: "confirmed",
        isOwn: false,
      }),
      true,
    );
  });

  it("rejects cross-circle reports", () => {
    assert.equal(
      canReportMessage({
        messageId: "m1",
        circleId: "circle-2",
        activeCircleId: "circle-1",
        status: "confirmed",
        isOwn: false,
      }),
      false,
    );
  });

  it("rejects duplicate optimistic or own messages", () => {
    assert.equal(
      canReportMessage({
        messageId: "optimistic:abc",
        circleId: "circle-1",
        activeCircleId: "circle-1",
        status: "optimistic",
        isOwn: false,
      }),
      false,
    );
    assert.equal(
      canReportMessage({
        messageId: "m1",
        circleId: "circle-1",
        activeCircleId: "circle-1",
        status: "confirmed",
        isOwn: true,
      }),
      false,
    );
  });
});
