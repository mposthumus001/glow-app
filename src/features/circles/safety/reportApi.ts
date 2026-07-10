import type { GlowSupabaseClient } from "../api";
import type { ReportReason } from "@/lib/supabase/database.types";

export async function submitMessageReport(
  supabase: GlowSupabaseClient,
  input: {
    reporterParentId: string;
    messageId: string;
    circleId: string;
    reportedParentId: string;
    reasonCode: ReportReason;
    notes: string | null;
  },
): Promise<{ ok: boolean; error: string | null; duplicate?: boolean }> {
  const { error } = await supabase.from("reports").insert({
    reporter_parent_id: input.reporterParentId,
    reported_parent_id: input.reportedParentId,
    circle_id: input.circleId,
    message_id: input.messageId,
    reason: input.reasonCode,
    reason_code: input.reasonCode,
    notes: input.notes,
    status: "open",
  });

  if (!error) {
    return { ok: true, error: null };
  }

  if (error.code === "23505") {
    return { ok: false, error: null, duplicate: true };
  }

  return { ok: false, error: error.message };
}
