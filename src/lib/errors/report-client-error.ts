/**
 * Privacy-conscious client error reporting for beta.
 * Logs only digest + route — never message content or profile data.
 * Wire to Sentry or similar when approved for production.
 */
export function reportClientError(error: Error & { digest?: string }): void {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  const payload = {
    digest: error.digest ?? null,
    name: error.name,
    messageLength: error.message?.length ?? 0,
    route:
      typeof window !== "undefined" ? window.location.pathname : "unknown",
  };

  // Structured dev-only signal — replace with approved monitoring SDK later.
  console.info("[glow.client-error]", payload);
}
