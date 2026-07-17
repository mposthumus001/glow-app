import type { ErrorEvent } from "@sentry/nextjs";

const EMAIL_PATTERN = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
const JWT_PATTERN = /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g;
const BEARER_PATTERN = /bearer\s+[a-z0-9._~+/=-]+/gi;

const SENSITIVE_KEY_PATTERN =
  /(password|passwd|token|secret|authorization|cookie|session|email|message|body|note|content|photo|image|latitude|longitude|lat|lng|feeding|health|baby_name|display_name|suburb|address)/i;

const BLOCKED_BREADCRUMB_CATEGORIES = new Set([
  "console",
  "fetch",
  "xhr",
  "navigation",
]);

export function scrubString(value: string): string {
  return value
    .replace(EMAIL_PATTERN, "[redacted-email]")
    .replace(JWT_PATTERN, "[redacted-token]")
    .replace(BEARER_PATTERN, "[redacted-auth]");
}

export function isSensitiveFieldName(name: string): boolean {
  return SENSITIVE_KEY_PATTERN.test(name);
}

export function scrubUnknown(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[truncated]";
  if (typeof value === "string") return scrubString(value);
  if (Array.isArray(value)) {
    return value.map((entry) => scrubUnknown(entry, depth + 1));
  }
  if (value && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      if (isSensitiveFieldName(key)) {
        result[key] = "[redacted]";
      } else {
        result[key] = scrubUnknown(entry, depth + 1);
      }
    }
    return result;
  }
  return value;
}

export function scrubSentryEvent(event: ErrorEvent): ErrorEvent | null {
  if (event.message) {
    event.message = scrubString(event.message);
  }

  if (event.request) {
    delete event.request.cookies;
    delete event.request.headers;
    delete event.request.data;
    delete event.request.query_string;
  }

  if (event.user) {
    const id = event.user.id;
    event.user = id ? { id } : {};
  }

  if (event.extra) {
    event.extra = scrubUnknown(event.extra) as Record<string, unknown>;
  }

  if (event.contexts) {
    for (const key of Object.keys(event.contexts)) {
      if (isSensitiveFieldName(key)) {
        delete event.contexts[key];
      }
    }
  }

  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.filter(
      (crumb) => !BLOCKED_BREADCRUMB_CATEGORIES.has(crumb.category ?? ""),
    );
    event.breadcrumbs = event.breadcrumbs.map((crumb) => ({
      ...crumb,
      message: crumb.message ? scrubString(crumb.message) : crumb.message,
      data: crumb.data
        ? (scrubUnknown(crumb.data) as Record<string, unknown>)
        : undefined,
    }));
  }

  return event;
}
