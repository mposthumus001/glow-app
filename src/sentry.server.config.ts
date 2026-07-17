import * as Sentry from "@sentry/nextjs";

import { buildServerSentryOptions } from "@/lib/monitoring/sentry-options";

Sentry.init(buildServerSentryOptions());
