import { createClient } from "@/lib/supabase/server";
import {
  canRequestAssignmentForParent,
  CIRCLE_NO_MATCH_HOLDING_MESSAGE,
} from "@/features/circles/assignment/assignmentLogic";

import type { GlowSupabaseClient } from "../api";

export type CircleAssignmentOutcome = "existing" | "assigned" | "no_match";

export type CircleAssignmentResult =
  | {
      ok: true;
      outcome: "existing" | "assigned";
      circleId: string;
      membershipId: string;
    }
  | {
      ok: true;
      outcome: "no_match";
      reason: string;
      holdingMessage: string;
    }
  | { ok: false; message: string };

type AssignRpcPayload = {
  outcome: CircleAssignmentOutcome;
  circle_id?: string;
  membership_id?: string;
  reason?: string;
  parent_id?: string;
  parent_state?: string;
  feeding_method?: string;
  first_child?: boolean;
  baby_age_months?: number | null;
};

function calmAssignErrorMessage(raw: string): string {
  if (raw.includes("Not authenticated")) {
    return "Please sign in to continue.";
  }
  if (raw.includes("Cannot assign circle for another parent")) {
    return "Please sign in to continue.";
  }
  if (raw.includes("not completed onboarding")) {
    return "Finish onboarding before we can match your Circle.";
  }
  return "We couldn't match your Circle just now. Please try again soon.";
}

function parseAssignmentPayload(
  data: unknown,
): CircleAssignmentResult {
  const payload = data as AssignRpcPayload | null;
  if (!payload?.outcome) {
    return {
      ok: false,
      message: "We couldn't match your Circle just now. Please try again soon.",
    };
  }

  if (payload.outcome === "no_match") {
    return {
      ok: true,
      outcome: "no_match",
      reason: payload.reason ?? "no_eligible_active_circle",
      holdingMessage: CIRCLE_NO_MATCH_HOLDING_MESSAGE,
    };
  }

  if (
    (payload.outcome === "existing" || payload.outcome === "assigned") &&
    payload.circle_id &&
    payload.membership_id
  ) {
    return {
      ok: true,
      outcome: payload.outcome,
      circleId: payload.circle_id,
      membershipId: payload.membership_id,
    };
  }

  return {
    ok: false,
    message: "We couldn't match your Circle just now. Please try again soon.",
  };
}

/**
 * Trusted server-side Circle assignment via SECURITY DEFINER RPC.
 * Never accepts a client-provided circle id.
 * Prefer this name in new call sites.
 */
export async function assignParentToBestCircle(
  supabase: GlowSupabaseClient,
  parentId: string,
): Promise<CircleAssignmentResult> {
  const { data, error } = await supabase.rpc("assign_parent_to_circle", {
    p_parent_id: parentId,
  });

  if (error) {
    return { ok: false, message: calmAssignErrorMessage(error.message) };
  }

  return parseAssignmentPayload(data);
}

/** @deprecated Prefer {@link assignParentToBestCircle}. */
export async function assignParentToCircle(
  supabase: GlowSupabaseClient,
  parentId: string,
): Promise<CircleAssignmentResult> {
  return assignParentToBestCircle(supabase, parentId);
}

/**
 * Convenience wrapper using the server Supabase client.
 * Rejects unauthenticated or mismatched parent IDs before calling the RPC.
 */
export async function requestCircleAssignmentForParent(
  parentId: string,
): Promise<CircleAssignmentResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!canRequestAssignmentForParent(user?.id, parentId)) {
    return { ok: false, message: "Please sign in to continue." };
  }

  return assignParentToBestCircle(supabase, parentId);
}

export { CIRCLE_NO_MATCH_HOLDING_MESSAGE };
