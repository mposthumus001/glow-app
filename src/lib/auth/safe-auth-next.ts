/**
 * Validates a post-auth `next` path so callback redirects cannot become open redirects.
 * Allows same-origin relative paths only (single leading `/`, no protocol-relative URLs).
 */
export function safeAuthNextPath(
  next: string | null | undefined,
  fallback = "/",
): string {
  if (!next) return fallback;

  const trimmed = next.trim();
  if (!trimmed.startsWith("/")) return fallback;
  if (trimmed.startsWith("//")) return fallback;
  if (trimmed.includes("://")) return fallback;
  if (trimmed.includes("\\")) return fallback;
  if (/[\0\r\n]/.test(trimmed)) return fallback;

  return trimmed;
}
