import type { GlowSupabaseClient } from "../api";
import type { CircleMessagePreview } from "../types";
import {
  MESSAGE_PAGE_SIZE,
  type CircleFeedMessage,
  type MessageCursor,
  previewToFeedMessage,
} from "./messageLogic";
import {
  buildMessageInsertPayload,
  classifyMessageInsertError,
  formatMessageInsertDiagnostic,
  insertRowToFeedMessage,
  shouldRetryInsertWithoutPrompt,
  type MessageInsertErrorCode,
  type MessageInsertRow,
} from "./messageInsertLogic";

type MessageJoinRow = {
  id: string;
  circle_id: string;
  parent_id: string;
  body: string;
  created_at: string;
  prompt_id?: string | null;
  parents: { display_name: string } | { display_name: string }[] | null;
};

function asSingle<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function rowToPreview(row: MessageJoinRow): CircleMessagePreview & {
  parentId: string;
  circleId: string;
  promptId?: string | null;
} {
  const parent = asSingle(row.parents);
  return {
    id: row.id,
    body: row.body,
    createdAt: row.created_at,
    authorName: parent?.display_name?.trim() || "A parent",
    parentId: row.parent_id,
    circleId: row.circle_id,
    promptId: row.prompt_id ?? null,
  };
}

const MESSAGE_SELECT = `
  id,
  circle_id,
  parent_id,
  body,
  created_at,
  prompt_id,
  parents (
    display_name
  )
`;

/** Insert return — no embed; avoids parents RLS edge cases on RETURNING. */
const MESSAGE_INSERT_RETURN = `
  id,
  circle_id,
  parent_id,
  body,
  created_at,
  prompt_id
`;

export type MessageInsertResult = {
  message: CircleFeedMessage | null;
  error: string | null;
  errorCode?: MessageInsertErrorCode;
};

export type MessagePageResult = {
  messages: CircleFeedMessage[];
  hasMore: boolean;
  error: string | null;
};

/**
 * Newest-first page, returned oldest→newest for display.
 * Uses created_at + id as a stable cursor pair.
 */
export async function fetchCircleMessagesPage(
  supabase: GlowSupabaseClient,
  input: {
    circleId: string;
    viewerParentId: string;
    limit?: number;
    before?: MessageCursor;
  },
): Promise<MessagePageResult> {
  const limit = input.limit ?? MESSAGE_PAGE_SIZE;

  let query = supabase
    .from("circle_messages")
    .select(MESSAGE_SELECT)
    .eq("circle_id", input.circleId)
    .is("deleted_at", null)
    .neq("moderation_status", "removed")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);

  if (input.before) {
    // Inclusive upper bound; exact cursor applied client-side for id tie-break.
    query = query.lte("created_at", input.before.createdAt);
  }

  const { data, error } = await query;

  if (error) {
    return { messages: [], hasMore: false, error: error.message };
  }

  let rows = (data ?? []) as unknown as MessageJoinRow[];

  if (input.before) {
    const { createdAt, id } = input.before;
    rows = rows.filter(
      (row) =>
        row.created_at < createdAt ||
        (row.created_at === createdAt && row.id < id),
    );
  }

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  const messages = page
    .map((row) =>
      previewToFeedMessage(rowToPreview(row), input.viewerParentId),
    )
    .reverse();

  return { messages, hasMore, error: null };
}

export async function fetchCircleMessageById(
  supabase: GlowSupabaseClient,
  input: {
    messageId: string;
    circleId: string;
    viewerParentId: string;
  },
): Promise<{ message: CircleFeedMessage | null; error: string | null }> {
  const { data, error } = await supabase
    .from("circle_messages")
    .select(MESSAGE_SELECT)
    .eq("id", input.messageId)
    .eq("circle_id", input.circleId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    return { message: null, error: error.message };
  }

  if (!data) {
    return { message: null, error: null };
  }

  const row = data as unknown as MessageJoinRow;
  return {
    message: previewToFeedMessage(rowToPreview(row), input.viewerParentId),
    error: null,
  };
}

export async function insertCircleMessage(
  supabase: GlowSupabaseClient,
  input: {
    circleId: string;
    parentId: string;
    authorName: string;
    body: string;
    promptId?: string | null;
  },
): Promise<MessageInsertResult> {
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) {
    return {
      message: null,
      error: "Not signed in.",
      errorCode: "auth",
    };
  }

  const sessionParentId = authData.user.id;

  if (sessionParentId !== input.parentId) {
    return {
      message: null,
      error: "Session mismatch.",
      errorCode: "auth_mismatch",
    };
  }

  const runInsert = async (promptId: string | null) => {
    const payload = buildMessageInsertPayload({
      circleId: input.circleId,
      parentId: sessionParentId,
      body: input.body,
      promptId,
    });

    return supabase
      .from("circle_messages")
      .insert(payload)
      .select(MESSAGE_INSERT_RETURN)
      .single();
  };

  let promptId = input.promptId ?? null;
  let { data, error } = await runInsert(promptId);

  if (error && promptId && shouldRetryInsertWithoutPrompt(error)) {
    if (process.env.NODE_ENV === "development") {
      console.warn(formatMessageInsertDiagnostic(error));
    }
    promptId = null;
    ({ data, error } = await runInsert(null));
  }

  if (error || !data) {
    if (error && process.env.NODE_ENV === "development") {
      console.warn(formatMessageInsertDiagnostic(error));
    }

    return {
      message: null,
      error: error?.message ?? "We couldn't send that just now.",
      errorCode: error ? classifyMessageInsertError(error) : "unknown",
    };
  }

  const row = data as unknown as MessageInsertRow;

  return {
    message: insertRowToFeedMessage(row, {
      authorName: input.authorName,
      viewerParentId: sessionParentId,
    }),
    error: null,
  };
}
