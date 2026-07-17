import * as Sentry from "@sentry/nextjs";

import type { GlowFeatureArea } from "@/lib/monitoring/feature-areas";
import {
  getDeploymentEnvironment,
  getSentryRelease,
  isClientSentryEnabled,
  isSentryEnabled,
} from "@/lib/monitoring/sentry-options";
import { scrubString } from "@/lib/monitoring/sentry-privacy";

export type OperationalFailureContext = {
  featureArea: GlowFeatureArea;
  operation: string;
  supabaseCode?: string | null;
  route?: string;
  userId?: string | null;
  circleAssignmentOutcome?: string | null;
};

export type UnexpectedExceptionContext = {
  featureArea: GlowFeatureArea;
  route?: string;
  userId?: string | null;
};

function isRuntimeSentryEnabled(): boolean {
  if (typeof window !== "undefined") {
    return isClientSentryEnabled();
  }
  return isSentryEnabled();
}

function applyGlowContext(
  scope: Sentry.Scope,
  context: {
    featureArea: GlowFeatureArea;
    route?: string;
    userId?: string | null;
    supabaseCode?: string | null;
    circleAssignmentOutcome?: string | null;
  },
): void {
  scope.setTag("feature_area", context.featureArea);
  scope.setTag("app_version", getSentryRelease() ?? "unknown");
  scope.setTag("deployment_environment", getDeploymentEnvironment());

  if (context.route) {
    scope.setTag("route", context.route.slice(0, 120));
  }
  if (context.userId) {
    scope.setUser({ id: context.userId });
  }
  if (context.supabaseCode) {
    scope.setExtra("supabase_code", context.supabaseCode);
  }
  if (context.circleAssignmentOutcome) {
    scope.setExtra(
      "circle_assignment_outcome",
      context.circleAssignmentOutcome,
    );
  }
}

/**
 * Expected operational failures (RLS, validation, network hiccups).
 * Captured at info/warning level without raw user content.
 */
export function reportOperationalFailure(
  message: string,
  context: OperationalFailureContext,
): void {
  const safeMessage = scrubString(message).slice(0, 200);

  if (!isRuntimeSentryEnabled()) {
    if (process.env.NODE_ENV !== "production") {
      console.info("[glow.operational]", {
        message: safeMessage,
        ...context,
      });
    }
    return;
  }

  Sentry.withScope((scope) => {
    applyGlowContext(scope, context);
    scope.setLevel("warning");
    scope.setExtra("operation", context.operation);
    Sentry.captureMessage(safeMessage, "warning");
  });
}

/**
 * Unexpected exceptions and route error boundaries.
 */
export function reportUnexpectedException(
  error: unknown,
  context: UnexpectedExceptionContext,
): void {
  void reportUnexpectedExceptionAsync(error, context);
}

async function reportUnexpectedExceptionAsync(
  error: unknown,
  context: UnexpectedExceptionContext,
): Promise<void> {
  const normalized =
    error instanceof Error
      ? error
      : new Error(typeof error === "string" ? error : "Unknown error");

  if (!isRuntimeSentryEnabled()) {
    if (process.env.NODE_ENV !== "production") {
      console.info("[glow.exception]", {
        name: normalized.name,
        messageLength: normalized.message.length,
        digest:
          "digest" in normalized
            ? (normalized as Error & { digest?: string }).digest
            : null,
        ...context,
      });
    }
    return;
  }

  Sentry.withScope((scope) => {
    applyGlowContext(scope, context);
    scope.setLevel("error");
    Sentry.captureException(normalized);
  });

  if (typeof window !== "undefined") {
    await Sentry.flush(2000);
  }
}

export function captureSupabaseError(
  error: { code?: string | null; message?: string | null },
  context: OperationalFailureContext,
): void {
  reportOperationalFailure(error.message ?? "Supabase operation failed", {
    ...context,
    supabaseCode: error.code ?? null,
  });
}
