export const SENTRY_VERIFICATION_ERROR_MESSAGE =
  "Glow controlled Sentry verification error";

export type ControlledCaptureDiagnostics = {
  dsnConfigured: boolean;
  eventIdReturned: boolean;
  flushCompleted: boolean;
};

export type ControlledCaptureDeps = {
  isEnabled: () => boolean;
  captureException: (error: Error) => string | undefined;
  flush: (timeout?: number) => Promise<boolean>;
};

export async function captureControlledVerificationError(
  deps: ControlledCaptureDeps,
): Promise<ControlledCaptureDiagnostics> {
  const dsnConfigured = deps.isEnabled();

  if (!dsnConfigured) {
    return {
      dsnConfigured: false,
      eventIdReturned: false,
      flushCompleted: false,
    };
  }

  const error = new Error(SENTRY_VERIFICATION_ERROR_MESSAGE);
  const eventId = deps.captureException(error);
  const flushCompleted = await deps.flush(5000);

  return {
    dsnConfigured: true,
    eventIdReturned: Boolean(eventId),
    flushCompleted,
  };
}

export function isVerificationErrorIgnored(
  message: string,
  ignoreErrors: readonly string[],
): boolean {
  return ignoreErrors.some((pattern) => message.includes(pattern));
}
