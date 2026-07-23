import { safeAuthNextPath } from "./safe-auth-next.ts";

export function resolvePostAuthDestination(
  nextPath: string | null | undefined,
  fallback = "/",
): string {
  return safeAuthNextPath(nextPath, fallback);
}

/**
 * Full document navigation so server-rendered routes (e.g. invite accept)
 * receive fresh Supabase auth cookies after client sign-in.
 */
export function navigateAfterAuth(nextPath: string | null | undefined): void {
  window.location.assign(resolvePostAuthDestination(nextPath));
}

export function buildLoginHrefWithNext(nextPath: string): string {
  return `/login?next=${encodeURIComponent(resolvePostAuthDestination(nextPath))}`;
}

export function buildAuthCallbackFailureLoginHref(nextPath: string): string {
  const safeNext = resolvePostAuthDestination(nextPath, "/");
  if (safeNext === "/") {
    return "/login";
  }
  return buildLoginHrefWithNext(safeNext);
}
