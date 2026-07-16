import { createClient } from "@/lib/supabase/server";
import { CIRCLE_NO_MATCH_HOLDING_MESSAGE } from "@/features/circles/assignment/assignmentLogic";

import { fetchAssignedCircle } from "../api";
import type { CircleLoadResult } from "../types";

import { assignParentToBestCircle } from "./CircleAssignmentRepository";

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
 * no_match returns a calm holding state (never invents a Circle).
 */
export async function loadAssignedCircleWithAssignment(
  parentId: string,
): Promise<CircleLoadResult> {
  const supabase = await createClient();
  let result = await fetchAssignedCircle(supabase, parentId);

  if (result.status !== "unassigned") {
    return result;
  }

  const assignment = await assignParentToBestCircle(supabase, parentId);

  if (!assignment.ok) {
    return { status: "error", message: assignment.message };
  }

  if (assignment.outcome === "no_match") {
    return {
      status: "unassigned",
      message: assignment.holdingMessage,
    };
  }

  result = await fetchAssignedCircle(supabase, parentId);

  if (result.status === "unassigned") {
    return {
      status: "unassigned",
      message: CIRCLE_NO_MATCH_HOLDING_MESSAGE,
    };
  }

  return result;
}
