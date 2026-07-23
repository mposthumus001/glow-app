/**
 * Normalise a `next` search param (Next.js may supply string | string[]).
 */
export function coerceAuthNextParam(
  next: string | string[] | null | undefined,
): string | null {
  if (next == null) return null;
  const raw = Array.isArray(next) ? next[0] : next;
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Validates a post-auth `next` path so callback redirects cannot become open redirects.
 * Allows same-origin relative paths only (single leading `/`, no protocol-relative URLs).
 */
export function safeAuthNextPath(
  next: string | string[] | null | undefined,
  fallback = "/",
): string {
  const coerced = coerceAuthNextParam(next);
  if (!coerced) return fallback;

  const trimmed = coerced;
  if (!trimmed.startsWith("/")) return fallback;
  if (trimmed.startsWith("//")) return fallback;
  if (trimmed.includes("://")) return fallback;
  if (trimmed.includes("\\")) return fallback;
  if (/[\0\r\n]/.test(trimmed)) return fallback;

  return trimmed;
}
