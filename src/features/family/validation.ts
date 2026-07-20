import { FAMILY_NAME_MAX } from "./config.ts";
import { isValidInviteEmail, normalizeInviteEmail } from "./inviteUtils.ts";
import type { InviteAcceptCategory } from "./types.ts";

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

export type CreateSharedFamilyInput = {
  name: string;
};

export type CreateSharedFamilyInviteInput = {
  sharedFamilyId: string;
  email: string;
  /** Normalised auth email — used to reject self-invites without exposing RPC detail. */
  authEmail?: string | null;
};

export function validateCreateSharedFamilyInput(
  input: CreateSharedFamilyInput,
): ValidationResult<{ name: string }> {
  const name = input.name.trim();

  if (!name) {
    return { ok: false, error: "Please enter a family name." };
  }

  if (name.length > FAMILY_NAME_MAX) {
    return {
      ok: false,
      error: `Family name can be up to ${FAMILY_NAME_MAX} characters.`,
    };
  }

  return { ok: true, value: { name } };
}

export function validateCreateSharedFamilyInviteInput(
  input: CreateSharedFamilyInviteInput,
): ValidationResult<{ sharedFamilyId: string; email: string }> {
  const sharedFamilyId = input.sharedFamilyId.trim();
  const email = normalizeInviteEmail(input.email);

  if (!sharedFamilyId) {
    return { ok: false, error: "That family could not be found." };
  }

  if (!email) {
    return { ok: false, error: "Please enter an email address." };
  }

  if (!isValidInviteEmail(email)) {
    return { ok: false, error: "Please enter a valid email address." };
  }

  const authEmail = input.authEmail ? normalizeInviteEmail(input.authEmail) : null;
  if (authEmail && email === authEmail) {
    return {
      ok: false,
      error: "You can't invite your own email address.",
    };
  }

  return { ok: true, value: { sharedFamilyId, email } };
}

export function mapFamilyRpcError(code: string | undefined): string {
  switch (code) {
    case "not_authenticated":
      return "Please sign in again.";
    case "invalid_name":
      return "Please enter a family name.";
    case "forbidden":
    case "not_found":
      return "That family could not be found.";
    case "transaction_failed":
      return "Something didn't work just now. Please try again.";
    default:
      return "Something didn't work just now. Please try again.";
  }
}

export function mapInviteRpcError(code: string | undefined): string {
  switch (code) {
    case "not_authenticated":
      return "Please sign in again.";
    case "invalid_email":
      return "Please enter a valid email address.";
    case "already_member":
      return "That person is already in this family.";
    case "invite_pending":
      return "An invitation is already pending for that email.";
    case "forbidden":
    case "not_found":
      return "That family could not be found.";
    case "cannot_remove_self":
      return "You can't remove yourself from the family here.";
    case "transaction_failed":
      return "Something didn't work just now. Please try again.";
    default:
      return "Something didn't work just now. Please try again.";
  }
}

export function mapInviteAcceptCategory(
  code: string | undefined,
  authenticated: boolean,
): InviteAcceptCategory {
  if (code === "not_authenticated") return "needs_auth";
  if (code === "invalid_invite") {
    return authenticated ? "email_mismatch" : "invalid";
  }
  return "unavailable";
}

export function mapInviteAcceptMessage(
  category: InviteAcceptCategory,
): string {
  switch (category) {
    case "accepted":
      return "You've joined the family.";
    case "email_mismatch":
      return "This invitation was sent to a different email address.";
    case "expired":
      return "This invitation has expired. Ask the family owner for a new one.";
    case "revoked":
      return "This invitation is no longer available.";
    case "invalid":
      return "This invitation is no longer available.";
    case "unavailable":
      return "This invitation is no longer available.";
    case "needs_auth":
      return "Sign in to accept this invitation.";
    default:
      return "This invitation is no longer available.";
  }
}
