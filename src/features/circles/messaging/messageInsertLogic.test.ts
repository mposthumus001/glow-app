import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildMessageInsertPayload,
  classifyMessageInsertError,
  resolveAttachPromptId,
  shouldRetryInsertWithoutPrompt,
} from "./messageInsertLogic.ts";

describe("buildMessageInsertPayload", () => {
  it("omits prompt_id when unset for schema compatibility", () => {
    const payload = buildMessageInsertPayload({
      circleId: "circle-1",
      parentId: "parent-1",
      body: "hello",
    });
    assert.equal("prompt_id" in payload, false);
    assert.equal(payload.moderation_status, "clean");
  });

  it("includes prompt_id only when provided", () => {
    const payload = buildMessageInsertPayload({
      circleId: "circle-1",
      parentId: "parent-1",
      body: "hello",
      promptId: "prompt-1",
    });
    assert.equal(payload.prompt_id, "prompt-1");
  });
});

describe("resolveAttachPromptId", () => {
  it("returns null when prompt circle does not match active circle", () => {
    assert.equal(
      resolveAttachPromptId({
        promptId: "prompt-a",
        promptCircleId: "circle-old",
        activeCircleId: "circle-qa",
      }),
      null,
    );
  });

  it("returns prompt id when scoped to the active circle", () => {
    assert.equal(
      resolveAttachPromptId({
        promptId: "prompt-a",
        promptCircleId: "circle-qa",
        activeCircleId: "circle-qa",
      }),
      "prompt-a",
    );
  });
});

describe("insert error classification", () => {
  it("detects prompt foreign key failures", () => {
    assert.equal(
      classifyMessageInsertError({
        code: "23503",
        message: 'violates foreign key constraint "circle_messages_prompt_id_fkey"',
      }),
      "prompt_fk",
    );
  });

  it("detects missing prompt_id schema cache errors", () => {
    assert.equal(
      classifyMessageInsertError({
        code: "PGRST204",
        message:
          "Could not find the 'prompt_id' column of 'circle_messages' in the schema cache",
      }),
      "schema",
    );
  });

  it("retries without prompt for prompt-related failures", () => {
    assert.equal(
      shouldRetryInsertWithoutPrompt({
        code: "23503",
        message: "prompt_id",
      }),
      true,
    );
  });
});
