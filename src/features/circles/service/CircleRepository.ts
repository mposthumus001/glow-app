import { createClient } from "@/lib/supabase/server";

import { fetchAssignedCircle } from "../api";
import type { CircleLoadResult } from "../types";

import { assignParentToCircle } from "./CircleAssignmentRepository";

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

/**
 * Load circle membership, attempting one trusted assignment when unassigned.
 * Idempotent — safe on every /circle navigation for backfill parents.
 */
export async function loadAssignedCircleWithAssignment(
  parentId: string,
): Promise<CircleLoadResult> {
  const supabase = await createClient();
  let result = await fetchAssignedCircle(supabase, parentId);

  if (result.status !== "unassigned") {
    return result;
  }

  const assignment = await assignParentToCircle(supabase, parentId);

  if (!assignment.ok) {
    return { status: "error", message: assignment.message };
  }

  result = await fetchAssignedCircle(supabase, parentId);

  if (result.status === "unassigned") {
    return {
      status: "unassigned",
      message:
        "We're still gathering your Circle. Check back soon — no action needed.",
    };
  }

  return result;
}
