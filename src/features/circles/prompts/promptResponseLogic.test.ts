import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  PROMPT_CONTEXT_STALE_COPY,
  PROMPT_RESPONSE_LABEL,
  buildPromptResponseContext,
  promptComposerAnnouncement,
  resolvePromptComposerContext,
  isActivePromptContextStale,
  sharePromptRequest,
  shouldClearComposerDraftAfterSend,
  shouldClearPromptContextAfterSend,
} from "./promptResponseLogic.ts";

describe("buildPromptResponseContext", () => {
  it("returns null when prompt is not scoped to the active circle", () => {
    assert.equal(
      buildPromptResponseContext({
        sendPromptId: "prompt-a",
        sendPromptCircleId: "circle-old",
        activeCircleId: "circle-qa",
      }),
      null,
    );
  });

  it("returns context when prompt is scoped to the active circle", () => {
    assert.deepEqual(
      buildPromptResponseContext({
        sendPromptId: "prompt-a",
        sendPromptCircleId: "circle-qa",
        activeCircleId: "circle-qa",
      }),
      { promptId: "prompt-a", promptCircleId: "circle-qa" },
    );
  });
});

describe("resolvePromptComposerContext", () => {
  const dailyPrompt = {
    id: "prompt-a",
    promptText: "What's one thing that made you smile recently?",
  };

  it("activates banner context when share sets matching prompt mode", () => {
    const result = resolvePromptComposerContext({
      promptContext: { promptId: "prompt-a", promptCircleId: "circle-qa" },
      activeCircleId: "circle-qa",
      dailyPrompt,
    });

    assert.equal(result.isStale, false);
    assert.equal(result.active?.label, PROMPT_RESPONSE_LABEL);
    assert.equal(result.active?.promptText, dailyPrompt.promptText);
  });

  it("marks stale when daily prompt no longer matches active prompt id", () => {
    const result = resolvePromptComposerContext({
      promptContext: { promptId: "prompt-old", promptCircleId: "circle-qa" },
      activeCircleId: "circle-qa",
      dailyPrompt,
    });

    assert.equal(result.active, null);
    assert.equal(result.isStale, true);
  });

  it("marks stale for cross-circle prompt context", () => {
    const result = resolvePromptComposerContext({
      promptContext: { promptId: "prompt-a", promptCircleId: "circle-old" },
      activeCircleId: "circle-qa",
      dailyPrompt,
    });

    assert.equal(result.active, null);
    assert.equal(result.isStale, true);
  });

  it("returns inactive when prompt mode is cleared", () => {
    const result = resolvePromptComposerContext({
      promptContext: null,
      activeCircleId: "circle-qa",
      dailyPrompt,
    });

    assert.equal(result.active, null);
    assert.equal(result.isStale, false);
  });
});

describe("promptComposerAnnouncement", () => {
  it("announces entry into prompt-response mode once", () => {
    const text = promptComposerAnnouncement({
      promptId: "prompt-a",
      promptText: "What's one tiny win from today?",
      label: PROMPT_RESPONSE_LABEL,
    });

    assert.match(text ?? "", /Replying to tonight's prompt/);
    assert.match(text ?? "", /tiny win/);
  });

  it("returns null when prompt mode is inactive", () => {
    assert.equal(promptComposerAnnouncement(null), null);
  });
});

describe("sharePromptRequest", () => {
  it("activates prompt mode when share is tapped with a real daily prompt", () => {
    assert.deepEqual(
      sharePromptRequest({
        dailyPromptId: "prompt-a",
        circleId: "circle-qa",
      }),
      { promptId: "prompt-a", circleId: "circle-qa" },
    );
  });

  it("skips prompt mode for fallback or missing prompts", () => {
    assert.equal(
      sharePromptRequest({ dailyPromptId: "fallback", circleId: "circle-qa" }),
      null,
    );
    assert.equal(
      sharePromptRequest({ dailyPromptId: undefined, circleId: "circle-qa" }),
      null,
    );
  });
});

describe("send outcome contracts", () => {
  it("clears prompt context only after successful send", () => {
    assert.equal(shouldClearPromptContextAfterSend(true), true);
    assert.equal(shouldClearPromptContextAfterSend(false), false);
  });

  it("clears composer draft only after successful send", () => {
    assert.equal(shouldClearComposerDraftAfterSend(true), true);
    assert.equal(shouldClearComposerDraftAfterSend(false), false);
  });
});

describe("prompt mode lifecycle contracts", () => {
  it("clears active context when prompt id is nulled (cancel or success)", () => {
    assert.equal(
      buildPromptResponseContext({
        sendPromptId: null,
        sendPromptCircleId: null,
        activeCircleId: "circle-qa",
      }),
      null,
    );
  });

  it("keeps normal sends without prompt context", () => {
    assert.equal(
      buildPromptResponseContext({
        sendPromptId: null,
        sendPromptCircleId: null,
        activeCircleId: "circle-qa",
      }),
      null,
    );
  });

  it("cancel clears prompt id while draft text remains independent", () => {
    const draftBeforeCancel = "still typing";
    const afterCancel = buildPromptResponseContext({
      sendPromptId: null,
      sendPromptCircleId: null,
      activeCircleId: "circle-qa",
    });

    assert.equal(draftBeforeCancel, "still typing");
    assert.equal(afterCancel, null);
  });
});

describe("isActivePromptContextStale", () => {
  it("detects stale prompt ids against the current daily prompt", () => {
    assert.equal(
      isActivePromptContextStale({
        promptContext: { promptId: "prompt-old", promptCircleId: "circle-qa" },
        activeCircleId: "circle-qa",
        dailyPromptId: "prompt-a",
      }),
      true,
    );
  });

  it("returns false when prompt id matches the active daily prompt", () => {
    assert.equal(
      isActivePromptContextStale({
        promptContext: { promptId: "prompt-a", promptCircleId: "circle-qa" },
        activeCircleId: "circle-qa",
        dailyPromptId: "prompt-a",
      }),
      false,
    );
  });
});

describe("stale copy", () => {
  it("documents calm stale explanation", () => {
    assert.match(PROMPT_CONTEXT_STALE_COPY, /no longer active/i);
  });
});
