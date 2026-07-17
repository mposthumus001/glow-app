"use client";

import { useState } from "react";
import * as Sentry from "@sentry/nextjs";

import { GlowButton } from "@/components/ui";
import {
  captureControlledVerificationError,
  type ControlledCaptureDiagnostics,
} from "@/lib/monitoring/sentry-client";
import { isClientSentryEnabled } from "@/lib/monitoring/sentry-options";

export function SentryVerificationTrigger() {
  const [shouldThrow, setShouldThrow] = useState(false);
  const [pending, setPending] = useState(false);
  const [diagnostics, setDiagnostics] =
    useState<ControlledCaptureDiagnostics | null>(null);

  if (shouldThrow) {
    throw new Error("Glow controlled Sentry verification error");
  }

  const handleClick = async () => {
    setPending(true);

    const result = await captureControlledVerificationError({
      isEnabled: isClientSentryEnabled,
      captureException: (error) => Sentry.captureException(error),
      flush: (timeout) => Sentry.flush(timeout),
    });

    setDiagnostics(result);
    setPending(false);

    requestAnimationFrame(() => {
      setShouldThrow(true);
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <GlowButton
        type="button"
        variant="ghost"
        onClick={() => void handleClick()}
        isLoading={pending}
        disabled={pending}
      >
        Trigger Sentry test error
      </GlowButton>

      {diagnostics ? (
        <div
          className="rounded-glow-input border border-glow-card-border bg-glow-background-elevated p-4 text-sm text-glow-text-secondary"
          role="status"
          aria-live="polite"
        >
          <p className="font-medium text-glow-text">Sentry diagnostic</p>
          <ul className="mt-2 space-y-1">
            <li>
              DSN configured: {diagnostics.dsnConfigured ? "yes" : "no"}
            </li>
            <li>
              Event ID returned: {diagnostics.eventIdReturned ? "yes" : "no"}
            </li>
            <li>
              Flush completed: {diagnostics.flushCompleted ? "yes" : "no"}
            </li>
          </ul>
          <p className="mt-3 text-xs text-glow-text-tertiary">
            Intentional test error — the calm error boundary will appear next.
          </p>
        </div>
      ) : null}
    </div>
  );
}
