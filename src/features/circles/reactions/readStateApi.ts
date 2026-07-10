import type { GlowSupabaseClient } from "../api";

import type { ReadMarker } from "./readStateLogic";

export type CircleReadMembership = {
  membershipId: string;
  lastReadMessageId: string | null;
  lastReadAt: string | null;
};

export async function fetchCircleReadMembership(
  supabase: GlowSupabaseClient,
  input: { circleId: string; parentId: string },
): Promise<CircleReadMembership | null> {
  const { data, error } = await supabase
    .from("circle_members")
    .select("id, last_read_message_id, last_read_at")
    .eq("circle_id", input.circleId)
    .eq("parent_id", input.parentId)
    .eq("status", "active")
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as {
    id: string;
    last_read_message_id: string | null;
    last_read_at: string | null;
  };

  return {
    membershipId: row.id,
    lastReadMessageId: row.last_read_message_id,
    lastReadAt: row.last_read_at,
  };
}

export async function advanceCircleReadState(
  supabase: GlowSupabaseClient,
  input: { circleId: string; messageId: string },
): Promise<{ marker: ReadMarker | null; advanced: boolean; error: string | null }> {
  const { data, error } = await supabase.rpc("advance_circle_read_state", {
    p_circle_id: input.circleId,
    p_message_id: input.messageId,
  });

  if (error) {
    return { marker: null, advanced: false, error: error.message };
  }

  const payload = data as {
    advanced?: boolean;
    last_read_message_id?: string;
  } | null;

  if (!payload?.last_read_message_id) {
    return { marker: null, advanced: false, error: null };
  }

  return {
    advanced: Boolean(payload.advanced),
    marker: {
      messageId: payload.last_read_message_id,
      createdAt: new Date().toISOString(),
    },
    error: null,
  };
}

/** Server-friendly unread count using marker message metadata when available. */
export async function fetchUnreadCountForCircle(
  supabase: GlowSupabaseClient,
  input: {
    circleId: string;
    parentId: string;
    lastReadMessageId: string | null;
    lastReadAt: string | null;
  },
): Promise<number> {
  if (!input.lastReadMessageId && !input.lastReadAt) {
    return 0;
  }

  if (input.lastReadMessageId) {
    const { data: marker } = await supabase
      .from("circle_messages")
      .select("created_at, id")
      .eq("id", input.lastReadMessageId)
      .eq("circle_id", input.circleId)
      .maybeSingle();

    if (marker) {
      const row = marker as { created_at: string; id: string };
      const [afterCount, tieCount] = await Promise.all([
        supabase
          .from("circle_messages")
          .select("id", { count: "exact", head: true })
          .eq("circle_id", input.circleId)
          .is("deleted_at", null)
          .neq("moderation_status", "removed")
          .gt("created_at", row.created_at),
        supabase
          .from("circle_messages")
          .select("id", { count: "exact", head: true })
          .eq("circle_id", input.circleId)
          .is("deleted_at", null)
          .neq("moderation_status", "removed")
          .eq("created_at", row.created_at)
          .gt("id", row.id),
      ]);

      const total = (afterCount.count ?? 0) + (tieCount.count ?? 0);
      return total;
    }
  }

  if (input.lastReadAt) {
    const { count, error } = await supabase
      .from("circle_messages")
      .select("id", { count: "exact", head: true })
      .eq("circle_id", input.circleId)
      .is("deleted_at", null)
      .neq("moderation_status", "removed")
      .gt("created_at", input.lastReadAt);

    if (!error && count != null) return count;
  }

  return 0;
}

export async function fetchCircleUnreadSummary(
  supabase: GlowSupabaseClient,
  parentId: string,
): Promise<{ circleId: string | null; unreadCount: number }> {
  const { data: membership } = await supabase
    .from("circle_members")
    .select("circle_id, last_read_message_id, last_read_at")
    .eq("parent_id", parentId)
    .eq("status", "active")
    .is("deleted_at", null)
    .order("joined_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!membership) {
    return { circleId: null, unreadCount: 0 };
  }

  const row = membership as {
    circle_id: string;
    last_read_message_id: string | null;
    last_read_at: string | null;
  };

  const unreadCount = await fetchUnreadCountForCircle(supabase, {
    circleId: row.circle_id,
    parentId,
    lastReadMessageId: row.last_read_message_id,
    lastReadAt: row.last_read_at,
  });

  return { circleId: row.circle_id, unreadCount };
}
