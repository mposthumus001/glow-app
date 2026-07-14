/** PostgREST / Postgres codes we handle without logging message content. */
export type MessageInsertErrorCode =
  | "auth"
  | "auth_mismatch"
  | "rls"
  | "prompt_fk"
  | "schema"
  | "unknown";

export type MessageInsertRow = {
  id: string;
  circle_id: string;
  parent_id: string;
  body: string;
  created_at: string;
  prompt_id?: string | null;
};

export type MessageInsertPayload = {
  circle_id: string;
  parent_id: string;
  body: string;
  moderation_status: "clean";
  prompt_id?: string;
};

export function buildMessageInsertPayload(input: {
  circleId: string;
  parentId: string;
  body: string;
  promptId?: string | null;
}): MessageInsertPayload {
  const payload: MessageInsertPayload = {
    circle_id: input.circleId,
    parent_id: input.parentId,
    body: input.body,
    moderation_status: "clean",
  };

  if (input.promptId) {
    payload.prompt_id = input.promptId;
  }

  return payload;
}

export function resolveAttachPromptId(input: {
  promptId: string | null;
  promptCircleId: string | null;
  activeCircleId: string;
}): string | null {
  if (!input.promptId) return null;
  if (!input.promptCircleId || input.promptCircleId !== input.activeCircleId) {
    return null;
  }
  return input.promptId;
}

export function classifyMessageInsertError(error: {
  code?: string;
  message?: string;
}): MessageInsertErrorCode {
  const code = error.code ?? "";
  const message = (error.message ?? "").toLowerCase();

  if (code === "42501" || message.includes("row-level security")) {
    return "rls";
  }

  if (
    code === "23503" &&
    (message.includes("prompt_id") || message.includes("circle_prompts"))
  ) {
    return "prompt_fk";
  }

  if (
    code === "PGRST204" ||
    (message.includes("prompt_id") && message.includes("schema cache"))
  ) {
    return "schema";
  }

  return "unknown";
}

export function shouldRetryInsertWithoutPrompt(error: {
  code?: string;
  message?: string;
}): boolean {
  const kind = classifyMessageInsertError(error);
  return kind === "prompt_fk" || kind === "schema";
}

export function insertRowToFeedMessage(
  row: MessageInsertRow,
  input: {
    authorName: string;
    viewerParentId: string;
  },
) {
  return {
    id: row.id,
    clientKey: row.id,
    circleId: row.circle_id,
    parentId: row.parent_id,
    body: row.body,
    createdAt: row.created_at,
    authorName: input.authorName.trim() || "You",
    status: "confirmed" as const,
    isOwn: row.parent_id === input.viewerParentId,
    promptId: row.prompt_id ?? null,
  };
}

/** Privacy-safe diagnostic string — no body, email, or tokens. */
export function formatMessageInsertDiagnostic(error: {
  code?: string;
  message?: string;
}): string {
  const kind = classifyMessageInsertError(error);
  const code = error.code ?? "none";
  return `circle_message_insert_failed kind=${kind} code=${code}`;
}
