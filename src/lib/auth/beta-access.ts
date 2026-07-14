/**
 * Private-beta allowlist helpers (client-safe pure logic).
 * Enforcement boundary: Supabase Auth before-user-created hook + is_beta_email_allowed RPC.
 */

export const BETA_SIGNUP_DENIED_MESSAGE =
  "Glow is currently in a small private beta. This email is not on the tester list yet.";

export type BetaTesterStatus = "invited" | "active" | "revoked";

export function normalizeBetaEmail(email: string | null | undefined): string | null {
  if (email == null) return null;
  const normalised = email.trim().toLowerCase();
  return normalised.length > 0 ? normalised : null;
}

export function isAllowlistStatusEligible(
  status: BetaTesterStatus | null | undefined,
): boolean {
  return status === "invited" || status === "active";
}

/** Map Auth / RPC rejection copy into calm beta messaging. */
export function isBetaSignupDeniedMessage(raw: string | null | undefined): boolean {
  if (!raw?.trim()) return false;
  const lower = raw.toLowerCase();
  return (
    lower.includes("private beta") ||
    lower.includes("tester list") ||
    lower.includes("not on the tester") ||
    lower.includes("not invited")
  );
}
