import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  captureControlledVerificationError,
  isVerificationErrorIgnored,
  SENTRY_VERIFICATION_ERROR_MESSAGE,
} from "./sentry-client.ts";
import { resolveClientSentryEnabled } from "./sentry-options.ts";

describe("client Sentry enablement", () => {
  it("enables client Sentry when a public DSN is present", () => {
    assert.equal(
      resolveClientSentryEnabled("https://example.ingest.sentry.io/1"),
      true,
    );
  });

  it("disables client Sentry safely when DSN is missing", () => {
    assert.equal(resolveClientSentryEnabled(undefined), false);
    assert.equal(resolveClientSentryEnabled(""), false);
    assert.equal(resolveClientSentryEnabled("   "), false);
  });
});

describe("controlled verification capture", () => {
  it("does not call capture or flush when DSN is missing", async () => {
    let captureCalls = 0;
    let flushCalls = 0;

    const result = await captureControlledVerificationError({
      isEnabled: () => false,
      captureException: () => {
        captureCalls += 1;
        return "event-id";
      },
      flush: async () => {
        flushCalls += 1;
        return true;
      },
    });

    assert.equal(result.dsnConfigured, false);
    assert.equal(result.eventIdReturned, false);
    assert.equal(result.flushCompleted, false);
    assert.equal(captureCalls, 0);
    assert.equal(flushCalls, 0);
  });

  it("calls captureException and flush for a controlled verification error", async () => {
    let capturedMessage = "";
    let flushTimeout: number | undefined;

    const result = await captureControlledVerificationError({
      isEnabled: () => true,
      captureException: (error) => {
        capturedMessage = error.message;
        return "event-id-123";
      },
      flush: async (timeout) => {
        flushTimeout = timeout;
        return true;
      },
    });

    assert.equal(capturedMessage, SENTRY_VERIFICATION_ERROR_MESSAGE);
    assert.equal(result.dsnConfigured, true);
    assert.equal(result.eventIdReturned, true);
    assert.equal(result.flushCompleted, true);
    assert.equal(flushTimeout, 5000);
  });

  it("does not filter the controlled verification error message", () => {
    assert.equal(
      isVerificationErrorIgnored(SENTRY_VERIFICATION_ERROR_MESSAGE, [
        "ResizeObserver loop limit exceeded",
      ]),
      false,
    );
  });
});
