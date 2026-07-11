const UUID_PATTERN =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i;

const TECHNICAL_PATTERNS = [
  /postgrest/i,
  /jwt/i,
  /pgrst/i,
  /sqlstate/i,
  /violates/i,
  /row-level security/i,
  /permission denied/i,
  /network/i,
  /fetch failed/i,
  /timeout/i,
  /ECONNREFUSED/i,
];

const AUTH_COPY: Record<string, string> = {
  "Invalid login credentials":
    "That email or password didn't match. Take a breath and try again.",
  "Email not confirmed":
    "Please confirm your email first, then sign in.",
  "User already registered":
    "An account with this email already exists. Try signing in instead.",
};

export function calmAuthErrorMessage(raw: string | null | undefined): string {
  if (!raw?.trim()) {
    return "Something didn't work just now. Please try again.";
  }

  const trimmed = raw.trim();
  if (AUTH_COPY[trimmed]) {
    return AUTH_COPY[trimmed];
  }

  return calmUserFacingError(trimmed, "auth");
}

export function calmUserFacingError(
  raw: string | null | undefined,
  context: "auth" | "profile" | "network" | "generic" = "generic",
): string {
  if (!raw?.trim()) {
    return defaultForContext(context);
  }

  const trimmed = raw.trim();

  if (UUID_PATTERN.test(trimmed)) {
    return defaultForContext(context);
  }

  if (TECHNICAL_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return defaultForContext(context);
  }

  if (trimmed.length > 160) {
    return defaultForContext(context);
  }

  return trimmed;
}

function defaultForContext(
  context: "auth" | "profile" | "network" | "generic",
): string {
  switch (context) {
    case "auth":
      return "Something didn't work just now. Please try again.";
    case "profile":
      return "We couldn't save that just now. Your details are still here — try again.";
    case "network":
      return "Glow lost connection for a moment. Please try again.";
    default:
      return "Something didn't work just now. Please try again.";
  }
}
