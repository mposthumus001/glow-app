"use server";

import { createClient } from "@/lib/supabase/server";
import {
  BETA_SIGNUP_DENIED_MESSAGE,
  normalizeBetaEmail,
} from "@/lib/auth/beta-access";
import { calmAuthErrorMessage } from "@/lib/errors/calm-messages";

export type BetaAccessCheckResult =
  | { ok: true; email: string }
  | { ok: false; error: string };

/**
 * Server-side UX gate before Auth signup.
 * Real enforcement is the before-user-created Auth hook — this prevents
 * unnecessary Auth calls and returns calm copy. Never returns allowlist rows.
 */
export async function checkBetaSignupAccess(
  rawEmail: string,
): Promise<BetaAccessCheckResult> {
  const email = normalizeBetaEmail(rawEmail);
  if (!email) {
    return { ok: false, error: "Enter a valid email address." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("is_beta_email_allowed", {
    p_email: email,
  });

  if (error) {
    return {
      ok: false,
      error: calmAuthErrorMessage(error.message),
    };
  }

  if (data !== true) {
    return { ok: false, error: BETA_SIGNUP_DENIED_MESSAGE };
  }

  return { ok: true, email };
}
