import * as Sentry from "@sentry/nextjs";

import { buildClientSentryOptions } from "@/lib/monitoring/sentry-options";

const clientOptions = buildClientSentryOptions();

Sentry.init({
  ...clientOptions,
  dsn: clientOptions.dsn || undefined,
  enabled: Boolean(clientOptions.dsn),
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
