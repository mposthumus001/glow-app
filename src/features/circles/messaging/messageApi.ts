import type { GlowSupabaseClient } from "../api";
import type { CircleMessagePreview } from "../types";
import {
  MESSAGE_PAGE_SIZE,
  type CircleFeedMessage,
  type MessageCursor,
  previewToFeedMessage,
} from "./messageLogic";

type MessageJoinRow = {
  id: string;
  circle_id: string;
  parent_id: string;
  body: string;
  created_at: string;
  parents: { display_name: string } | { display_name: string }[] | null;
};

function asSingle<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function rowToPreview(row: MessageJoinRow): CircleMessagePreview & {
  parentId: string;
  circleId: string;
} {
  const parent = asSingle(row.parents);
  return {
    id: row.id,
    body: row.body,
    createdAt: row.created_at,
    authorName: parent?.display_name?.trim() || "A parent",
    parentId: row.parent_id,
    circleId: row.circle_id,
  };
}

const MESSAGE_SELECT = `
  id,
  circle_id,
  parent_id,
  body,
  created_at,
  parents (
    display_name
  )
`;

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
    body: string;
  },
): Promise<{ message: CircleFeedMessage | null; error: string | null }> {
  const { data, error } = await supabase
    .from("circle_messages")
    .insert({
      circle_id: input.circleId,
      parent_id: input.parentId,
      body: input.body,
      moderation_status: "clean",
    })
    .select(MESSAGE_SELECT)
    .single();

  if (error || !data) {
    return {
      message: null,
      error: error?.message ?? "We couldn't send that just now.",
    };
  }

  const row = data as unknown as MessageJoinRow;
  return {
    message: previewToFeedMessage(rowToPreview(row), input.parentId),
    error: null,
  };
}
