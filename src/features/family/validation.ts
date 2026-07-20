import { FAMILY_NAME_MAX } from "./config.ts";

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

export type CreateSharedFamilyInput = {
  name: string;
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
