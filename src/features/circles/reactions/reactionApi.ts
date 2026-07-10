import type { GlowSupabaseClient } from "../api";
import type { CircleReactionType } from "@/lib/supabase/database.types";

import {
  type ReactionRow,
  aggregateReactions,
  type MessageReactions,
} from "./reactionLogic";

type ReactionDbRow = {
  id: string;
  message_id: string;
  parent_id: string;
  reaction_type: CircleReactionType;
};

function toReactionRow(row: ReactionDbRow): ReactionRow {
  return {
    id: row.id,
    messageId: row.message_id,
    parentId: row.parent_id,
    reactionType: row.reaction_type,
  };
}

export async function fetchReactionsForMessages(
  supabase: GlowSupabaseClient,
  input: {
    messageIds: string[];
    viewerParentId: string;
  },
): Promise<{ reactions: Map<string, MessageReactions>; rowIds: Set<string> }> {
  if (input.messageIds.length === 0) {
    return { reactions: new Map(), rowIds: new Set() };
  }

  const { data, error } = await supabase
    .from("circle_message_reactions")
    .select("id, message_id, parent_id, reaction_type")
    .in("message_id", input.messageIds);

  if (error || !data) {
    return { reactions: new Map(), rowIds: new Set() };
  }

  const rows = (data as ReactionDbRow[]).map(toReactionRow);
  const rowIds = new Set(rows.map((row) => row.id));
  const reactions = aggregateReactions(rows, input.viewerParentId);

  return { reactions, rowIds };
}

export async function insertReaction(
  supabase: GlowSupabaseClient,
  input: {
    messageId: string;
    parentId: string;
    reactionType: CircleReactionType;
  },
): Promise<{ row: ReactionRow | null; error: string | null }> {
  const { data, error } = await supabase
    .from("circle_message_reactions")
    .insert({
      message_id: input.messageId,
      parent_id: input.parentId,
      reaction_type: input.reactionType,
    })
    .select("id, message_id, parent_id, reaction_type")
    .single();

  if (error || !data) {
    return { row: null, error: error?.message ?? "Could not add reaction." };
  }

  return { row: toReactionRow(data as ReactionDbRow), error: null };
}

export async function deleteReaction(
  supabase: GlowSupabaseClient,
  input: {
    messageId: string;
    parentId: string;
    reactionType: CircleReactionType;
  },
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("circle_message_reactions")
    .delete()
    .eq("message_id", input.messageId)
    .eq("parent_id", input.parentId)
    .eq("reaction_type", input.reactionType);

  return { error: error?.message ?? null };
}

export async function fetchReactionRowId(
  supabase: GlowSupabaseClient,
  input: {
    messageId: string;
    parentId: string;
    reactionType: CircleReactionType;
  },
): Promise<string | null> {
  const { data } = await supabase
    .from("circle_message_reactions")
    .select("id")
    .eq("message_id", input.messageId)
    .eq("parent_id", input.parentId)
    .eq("reaction_type", input.reactionType)
    .maybeSingle();

  return (data as { id: string } | null)?.id ?? null;
}
