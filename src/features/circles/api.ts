import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

import type {
  AssignedCircleView,
  CircleLoadResult,
  CircleMessagePreview,
  CircleSummary,
} from "./types";

export type GlowSupabaseClient = SupabaseClient<Database>;

type MembershipRow = {
  circle_id: string;
  circles: CircleSummary | CircleSummary[] | null;
};

type MessageJoinRow = {
  id: string;
  body: string;
  created_at: string;
  parents: { display_name: string } | { display_name: string }[] | null;
};

function asSingle<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function toMessagePreview(row: MessageJoinRow): CircleMessagePreview {
  const parent = asSingle(row.parents);
  return {
    id: row.id,
    body: row.body,
    createdAt: row.created_at,
    authorName: parent?.display_name?.trim() || "A parent",
  };
}

/**
 * Load the authenticated parent's active circle, member counts, and a
 * one-shot message snapshot. No realtime subscriptions.
 */
export async function fetchAssignedCircle(
  supabase: GlowSupabaseClient,
  parentId: string,
): Promise<CircleLoadResult> {
  const { data: membership, error: membershipError } = await supabase
    .from("circle_members")
    .select(
      `
      circle_id,
      circles (
        id,
        name,
        description,
        status,
        max_members
      )
    `,
    )
    .eq("parent_id", parentId)
    .eq("status", "active")
    .is("deleted_at", null)
    .order("joined_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    return {
      status: "error",
      message: "We couldn't reach your Circle just now. Please try again.",
    };
  }

  if (!membership) {
    return { status: "unassigned" };
  }

  const row = membership as unknown as MembershipRow;
  const circle = asSingle(row.circles);

  if (!circle?.id) {
    return { status: "unassigned" };
  }

  const circleId = circle.id;

  const [membersResult, messagesResult] = await Promise.all([
    fetchActiveMemberIds(supabase, circleId),
    fetchRecentMessages(supabase, circleId),
  ]);

  if (membersResult.error || messagesResult.error) {
    return {
      status: "error",
      message: "We couldn't load your Circle just now. Please try again.",
    };
  }

  const onlineCount = await countOnlineAmongParents(
    supabase,
    membersResult.parentIds,
  );

  const view: AssignedCircleView = {
    circle: {
      id: circle.id,
      name: circle.name,
      description: circle.description,
      status: circle.status,
      max_members: circle.max_members,
    },
    memberCount: membersResult.parentIds.length,
    onlineCount,
    messages: messagesResult.messages,
  };

  return { status: "assigned", data: view };
}

async function fetchActiveMemberIds(
  supabase: GlowSupabaseClient,
  circleId: string,
): Promise<{ parentIds: string[]; error: string | null }> {
  const { data, error } = await supabase
    .from("circle_members")
    .select("parent_id")
    .eq("circle_id", circleId)
    .eq("status", "active")
    .is("deleted_at", null);

  if (error) {
    return { parentIds: [], error: error.message };
  }

  return {
    parentIds: (data ?? []).map((row) => row.parent_id),
    error: null,
  };
}

async function fetchRecentMessages(
  supabase: GlowSupabaseClient,
  circleId: string,
): Promise<{ messages: CircleMessagePreview[]; error: string | null }> {
  const { data, error } = await supabase
    .from("circle_messages")
    .select(
      `
      id,
      body,
      created_at,
      parents (
        display_name
      )
    `,
    )
    .eq("circle_id", circleId)
    .is("deleted_at", null)
    .neq("moderation_status", "removed")
    .order("created_at", { ascending: true })
    .limit(40);

  if (error) {
    return { messages: [], error: error.message };
  }

  const messages = ((data ?? []) as unknown as MessageJoinRow[]).map(
    toMessagePreview,
  );
  return { messages, error: null };
}

/**
 * Best-effort online count via privacy-safe map_presence.
 * Returns null when the count cannot be resolved.
 */
async function countOnlineAmongParents(
  supabase: GlowSupabaseClient,
  parentIds: string[],
): Promise<number | null> {
  if (parentIds.length === 0) {
    return 0;
  }

  const { data: onlineRows, error: onlineError } = await supabase
    .from("map_presence")
    .select("parent_id")
    .in("parent_id", parentIds);

  if (onlineError) {
    return null;
  }

  const unique = new Set((onlineRows ?? []).map((row) => row.parent_id));
  return unique.size;
}
