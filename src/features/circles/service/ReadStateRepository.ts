import { createClient } from "@/lib/supabase/server";

import { fetchCircleUnreadSummary } from "../reactions/readStateApi";
import { formatNavUnreadHint } from "../reactions/readStateLogic";

export async function loadCircleNavUnreadHint(
  parentId: string,
): Promise<string | null> {
  const supabase = await createClient();
  const summary = await fetchCircleUnreadSummary(supabase, parentId);
  return formatNavUnreadHint(summary.unreadCount);
}
