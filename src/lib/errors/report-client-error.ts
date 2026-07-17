/**
 * Privacy-conscious client error reporting.
 * Delegates to Sentry when configured; dev-only console otherwise.
 */
import { reportUnexpectedException } from "@/lib/monitoring/report-error";

export function reportClientError(error: Error & { digest?: string }): void {
  reportUnexpectedException(error, {
    featureArea: "global",
    route:
      typeof window !== "undefined" ? window.location.pathname : undefined,
  });
}
