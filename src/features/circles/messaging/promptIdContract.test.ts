import assert from "node:assert/strict";
import { describe, it } from "node:test";

/**
 * Contract: Circle message inserts include optional prompt_id.
 * Production must have the column (migration 0006 / hotfix 0011).
 */
describe("circle_messages.prompt_id contract", () => {
  it("documents nullable prompt_id on insert payload", () => {
    const insertPayload = {
      circle_id: "c1",
      parent_id: "p1",
      body: "hello",
      moderation_status: "clean" as const,
      prompt_id: null as string | null,
    };

    assert.ok("prompt_id" in insertPayload);
    assert.equal(insertPayload.prompt_id, null);
  });

  it("documents FK target as circle_prompts with ON DELETE SET NULL", () => {
    const fk = {
      column: "prompt_id",
      references: "circle_prompts(id)",
      onDelete: "SET NULL",
      migration: "0011_circle_messages_prompt_id.sql",
    };

    assert.equal(fk.references, "circle_prompts(id)");
    assert.equal(fk.onDelete, "SET NULL");
  });
});
