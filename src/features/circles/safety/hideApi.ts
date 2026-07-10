import type { GlowSupabaseClient } from "../api";

export async function fetchHiddenMessageIds(
  supabase: GlowSupabaseClient,
  parentId: string,
): Promise<Set<string>> {
  const { data } = await supabase
    .from("hidden_messages")
    .select("message_id")
    .eq("parent_id", parentId);

  return new Set(
    ((data ?? []) as Array<{ message_id: string }>).map((row) => row.message_id),
  );
}

export async function hideMessageForParent(
  supabase: GlowSupabaseClient,
  input: { parentId: string; messageId: string },
): Promise<{ ok: boolean; error: string | null }> {
  const { error } = await supabase.from("hidden_messages").insert({
    parent_id: input.parentId,
    message_id: input.messageId,
  });

  if (error && error.code !== "23505") {
    return { ok: false, error: error.message };
  }

  return { ok: true, error: null };
}

export async function unhideMessageForParent(
  supabase: GlowSupabaseClient,
  input: { parentId: string; messageId: string },
): Promise<{ ok: boolean; error: string | null }> {
  const { error } = await supabase
    .from("hidden_messages")
    .delete()
    .eq("parent_id", input.parentId)
    .eq("message_id", input.messageId);

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, error: null };
}
