import { createClient } from "@/lib/supabase/server";

import type { GlowSupabaseClient } from "../api";

export type CircleAssignmentOutcome = "existing" | "assigned" | "created";

export type CircleAssignmentResult =
  | {
      ok: true;
      outcome: CircleAssignmentOutcome;
      circleId: string;
      membershipId: string;
    }
  | { ok: false; message: string };

type AssignRpcPayload = {
  outcome: CircleAssignmentOutcome;
  circle_id: string;
  membership_id: string;
};

function calmAssignErrorMessage(raw: string): string {
  if (raw.includes("Not authenticated")) {
    return "Please sign in to continue.";
  }
  if (raw.includes("not completed onboarding")) {
    return "Finish onboarding before we can match your Circle.";
  }
  return "We couldn't match your Circle just now. Please try again soon.";
}

/**
 * Trusted server-side circle assignment via SECURITY DEFINER RPC.
 * Never accepts a client-provided circle id.
 */
export async function assignParentToCircle(
  supabase: GlowSupabaseClient,
  parentId: string,
): Promise<CircleAssignmentResult> {
  const { data, error } = await supabase.rpc("assign_parent_to_circle", {
    p_parent_id: parentId,
  });

  if (error) {
    return { ok: false, message: calmAssignErrorMessage(error.message) };
  }

  const payload = data as AssignRpcPayload | null;
  if (
    !payload?.outcome ||
    !payload.circle_id ||
    !payload.membership_id
  ) {
    return {
      ok: false,
      message: "We couldn't match your Circle just now. Please try again soon.",
    };
  }

  return {
    ok: true,
    outcome: payload.outcome,
    circleId: payload.circle_id,
    membershipId: payload.membership_id,
  };
}

/** Convenience wrapper using the server Supabase client. */
export async function requestCircleAssignmentForParent(
  parentId: string,
): Promise<CircleAssignmentResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== parentId) {
    return { ok: false, message: "Please sign in to continue." };
  }

  return assignParentToCircle(supabase, parentId);
}
