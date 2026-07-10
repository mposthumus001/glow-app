import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

import { fetchCircleMessagesPage } from "./messaging/messageApi";
import type {
  AssignedCircleView,
  CircleLoadResult,
  CircleSummary,
} from "./types";

export type GlowSupabaseClient = SupabaseClient<Database>;

type MembershipRow = {
  circle_id: string;
  circles: CircleSummary | CircleSummary[] | null;
};

function asSingle<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

/**
 * Load the authenticated parent's active circle and member counts.
 * Message history is owned by the client messaging service (Sprint 4.2).
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

  const membersResult = await fetchActiveMemberIds(supabase, circleId);

  if (membersResult.error) {
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
    messages: [],
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

export { fetchCircleMessagesPage };
