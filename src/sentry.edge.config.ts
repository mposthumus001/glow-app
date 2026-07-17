import * as Sentry from "@sentry/nextjs";

import { buildEdgeSentryOptions } from "@/lib/monitoring/sentry-options";

Sentry.init(buildEdgeSentryOptions());
