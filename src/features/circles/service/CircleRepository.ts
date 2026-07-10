import { createClient } from "@/lib/supabase/server";

import { fetchAssignedCircle } from "../api";
import type { CircleLoadResult } from "../types";

/**
 * Server-side repository for Circle reads.
 * Presentation components must not call Supabase directly.
 * Import this module only from Server Components / server loaders.
 */
export async function loadAssignedCircleForParent(
  parentId: string,
): Promise<CircleLoadResult> {
  const supabase = await createClient();
  return fetchAssignedCircle(supabase, parentId);
}
