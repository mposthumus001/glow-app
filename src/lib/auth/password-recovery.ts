import { calmAuthErrorMessage } from "../errors/calm-messages.ts";

/** Dedicated route where users choose a new password after recovery. */
export const PASSWORD_RESET_PATH = "/auth/reset-password";

/** Success banner on login after password update + sign-out. */
export const PASSWORD_RESET_SUCCESS_MESSAGE =
  "Your password has been updated. Sign in with your new password.";

/** Login query flag after a successful reset. */
export const PASSWORD_RESET_SUCCESS_QUERY = "reset=success";

export const MIN_PASSWORD_LENGTH = 6;

/**
 * PKCE-compatible redirectTo for resetPasswordForEmail.
 * Lands on the auth callback first, then continues to the dedicated reset page.
 */
export function buildPasswordResetRedirectTo(origin: string): string {
  const base = origin.replace(/\/$/, "");
  return `${base}/auth/callback?next=${PASSWORD_RESET_PATH}`;
}

export type RecoveryUiPhase =
  | "resolving"
  | "ready"
  | "invalid"
  | "success";

export type RecoveryUiEvent =
  | { type: "PASSWORD_RECOVERY" }
  | { type: "SIGNED_IN" }
  | { type: "SESSION_PRESENT" }
  | { type: "SESSION_ABSENT" }
  | { type: "RESOLVE_TIMEOUT" }
  | { type: "SUCCESS" };

/**
 * Recovery UI state machine.
 * PASSWORD_RECOVERY and an already-established session enable the form.
 * SIGNED_IN alone does not — that would confuse normal logins with recovery.
 */
export function reduceRecoveryUi(
  phase: RecoveryUiPhase,
  event: RecoveryUiEvent,
): RecoveryUiPhase {
  if (phase === "success") return phase;

  switch (event.type) {
    case "PASSWORD_RECOVERY":
    case "SESSION_PRESENT":
      return "ready";
    case "SIGNED_IN":
      // Do not treat a normal sign-in as password recovery.
      return phase;
    case "SESSION_ABSENT":
      // Stay resolving — cookies may still be hydrating after the PKCE callback.
      return phase;
    case "RESOLVE_TIMEOUT":
      return phase === "ready" ? phase : "invalid";
    case "SUCCESS":
      return "success";
    default:
      return phase;
  }
}

export type PasswordResetValidation =
  | { ok: true; password: string }
  | { ok: false; error: string };

export function validateNewPassword(
  password: string,
  confirmPassword: string,
): PasswordResetValidation {
  if (!password.trim() || !confirmPassword.trim()) {
    return { ok: false, error: "Enter and confirm your new password." };
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      error: `Password needs at least ${MIN_PASSWORD_LENGTH} characters.`,
    };
  }

  if (password !== confirmPassword) {
    return { ok: false, error: "Passwords do not match." };
  }

  return { ok: true, password };
}

export function mapPasswordUpdateError(raw: string | null | undefined): string {
  if (!raw?.trim()) {
    return calmAuthErrorMessage(raw);
  }

  const lower = raw.toLowerCase();

  if (
    lower.includes("rate limit") ||
    lower.includes("too many requests") ||
    lower.includes("email rate limit")
  ) {
    return "Too many attempts just now. Please wait a moment and try again.";
  }

  if (
    lower.includes("weak") ||
    lower.includes("at least") ||
    lower.includes("password should be") ||
    lower.includes("password is too short")
  ) {
    return `Choose a stronger password (at least ${MIN_PASSWORD_LENGTH} characters).`;
  }

  if (
    lower.includes("expired") ||
    lower.includes("invalid") ||
    lower.includes("otp") ||
    lower.includes("token")
  ) {
    return "This reset link is no longer valid. Request a new one from the sign-in page.";
  }

  return calmAuthErrorMessage(raw);
}

export type PasswordResetSubmitDeps = {
  hasRecoverySession: () => Promise<boolean>;
  updateUser: (args: {
    password: string;
  }) => Promise<{ error: { message: string } | null }>;
  signOut: () => Promise<{ error: { message: string } | null }>;
};

export type PasswordResetSubmitResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Updates the password only when a recovery session exists, then signs out.
 * Callers redirect to login with PASSWORD_RESET_SUCCESS_MESSAGE.
 */
export async function submitPasswordReset(
  deps: PasswordResetSubmitDeps,
  password: string,
  confirmPassword: string,
): Promise<PasswordResetSubmitResult> {
  const validated = validateNewPassword(password, confirmPassword);
  if (!validated.ok) {
    return { ok: false, error: validated.error };
  }

  const hasSession = await deps.hasRecoverySession();
  if (!hasSession) {
    return {
      ok: false,
      error:
        "This reset link is no longer valid. Request a new one from the sign-in page.",
    };
  }

  const { error: updateError } = await deps.updateUser({
    password: validated.password,
  });

  if (updateError) {
    return { ok: false, error: mapPasswordUpdateError(updateError.message) };
  }

  const { error: signOutError } = await deps.signOut();
  if (signOutError) {
    return { ok: false, error: mapPasswordUpdateError(signOutError.message) };
  }

  return { ok: true };
}
