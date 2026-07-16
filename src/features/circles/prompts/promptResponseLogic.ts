import { resolveAttachPromptId } from "../messaging/messageInsertLogic.ts";

export const PROMPT_RESPONSE_LABEL = "Replying to tonight's prompt";

export const PROMPT_RESPONSE_MESSAGE_LABEL = "Prompt response";

export const PROMPT_CONTEXT_STALE_COPY =
  "That prompt is no longer active — your message will send as a normal reply.";

export type PromptResponseContextState = {
  promptId: string;
  promptCircleId: string;
} | null;

export type PromptComposerContext = {
  promptId: string;
  promptText: string;
  label: string;
};

export function buildPromptResponseContext(input: {
  sendPromptId: string | null;
  sendPromptCircleId: string | null;
  activeCircleId: string | null;
}): PromptResponseContextState {
  if (!input.sendPromptId || !input.sendPromptCircleId || !input.activeCircleId) {
    return null;
  }

  const attached = resolveAttachPromptId({
    promptId: input.sendPromptId,
    promptCircleId: input.sendPromptCircleId,
    activeCircleId: input.activeCircleId,
  });

  if (!attached) return null;

  return {
    promptId: attached,
    promptCircleId: input.sendPromptCircleId,
  };
}

export function resolvePromptComposerContext(input: {
  promptContext: PromptResponseContextState;
  activeCircleId: string;
  dailyPrompt: { id: string; promptText: string } | null;
}): {
  active: PromptComposerContext | null;
  isStale: boolean;
} {
  if (!input.promptContext) {
    return { active: null, isStale: false };
  }

  const scoped = resolveAttachPromptId({
    promptId: input.promptContext.promptId,
    promptCircleId: input.promptContext.promptCircleId,
    activeCircleId: input.activeCircleId,
  });

  if (!scoped) {
    return { active: null, isStale: true };
  }

  if (
    !input.dailyPrompt?.id ||
    !input.dailyPrompt.promptText.trim() ||
    input.dailyPrompt.id !== scoped
  ) {
    return { active: null, isStale: true };
  }

  return {
    active: {
      promptId: scoped,
      promptText: input.dailyPrompt.promptText.trim(),
      label: PROMPT_RESPONSE_LABEL,
    },
    isStale: false,
  };
}

export function promptComposerAnnouncement(
  context: PromptComposerContext | null,
): string | null {
  if (!context) return null;
  return `${context.label}. ${context.promptText}`;
}

/** Share-something tap: set prompt mode only for a real daily prompt in this circle. */
export function sharePromptRequest(input: {
  dailyPromptId: string | undefined;
  circleId: string;
}): { promptId: string; circleId: string } | null {
  if (!input.dailyPromptId || input.dailyPromptId === "fallback") {
    return null;
  }

  return {
    promptId: input.dailyPromptId,
    circleId: input.circleId,
  };
}

export function isActivePromptContextStale(input: {
  promptContext: PromptResponseContextState;
  activeCircleId: string;
  dailyPromptId: string | null | undefined;
}): boolean {
  if (!input.promptContext) return false;

  const scoped = resolveAttachPromptId({
    promptId: input.promptContext.promptId,
    promptCircleId: input.promptContext.promptCircleId,
    activeCircleId: input.activeCircleId,
  });

  if (!scoped) return true;
  if (!input.dailyPromptId || input.dailyPromptId !== scoped) return true;
  return false;
}

export function shouldClearComposerDraftAfterSend(ok: boolean): boolean {
  return ok;
}

export function shouldClearPromptContextAfterSend(ok: boolean): boolean {
  return ok;
}
