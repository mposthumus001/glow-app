import type { BrowserOptions, EdgeOptions, NodeOptions } from "@sentry/nextjs";

import { APP_VERSION } from "../app-version.ts";
import { scrubSentryEvent } from "./sentry-privacy.ts";

const IGNORED_ERRORS = [
  "ResizeObserver loop limit exceeded",
  "ResizeObserver loop completed with undelivered notifications",
];

export function getClientSentryDsn(): string | undefined {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim();
  return dsn || undefined;
}

/** Browser SDK — only `NEXT_PUBLIC_SENTRY_DSN` is available in client bundles. */
export function isClientSentryEnabled(): boolean {
  return Boolean(getClientSentryDsn());
}

export function resolveClientSentryEnabled(
  dsn: string | undefined | null,
): boolean {
  return Boolean(dsn?.trim());
}

export function isSentryEnabled(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SENTRY_DSN?.trim() ||
      process.env.SENTRY_DSN?.trim(),
  );
}

export function getDeploymentEnvironment(): string {
  return process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development";
}

export function getSentryRelease(): string {
  const explicit = process.env.SENTRY_RELEASE?.trim();
  if (explicit) return explicit;
  return `glow-app@${APP_VERSION}`;
}

function serverBaseOptions(): NodeOptions | EdgeOptions {
  const dsn =
    process.env.SENTRY_DSN?.trim() ||
    process.env.NEXT_PUBLIC_SENTRY_DSN?.trim() ||
    undefined;

  return {
    dsn,
    enabled: Boolean(dsn),
    environment: getDeploymentEnvironment(),
    release: getSentryRelease(),
    sendDefaultPii: false,
    tracesSampleRate:
      getDeploymentEnvironment() === "production" ? 0.1 : 1.0,
    beforeSend(event) {
      return scrubSentryEvent(event);
    },
    ignoreErrors: IGNORED_ERRORS,
  };
}

export function buildClientSentryOptions(): BrowserOptions {
  const dsn = getClientSentryDsn();

  return {
    dsn,
    enabled: Boolean(dsn),
    environment: getDeploymentEnvironment(),
    release: getSentryRelease(),
    sendDefaultPii: false,
    tracesSampleRate:
      getDeploymentEnvironment() === "production" ? 0.1 : 1.0,
    beforeSend(event) {
      return scrubSentryEvent(event);
    },
    ignoreErrors: IGNORED_ERRORS,
    integrations: (defaults) => defaults,
  };
}

export function buildServerSentryOptions(): NodeOptions {
  return serverBaseOptions();
}

export function buildEdgeSentryOptions(): EdgeOptions {
  return serverBaseOptions();
}
