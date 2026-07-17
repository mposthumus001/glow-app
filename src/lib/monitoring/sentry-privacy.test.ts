import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isSensitiveFieldName,
  scrubSentryEvent,
  scrubString,
} from "./sentry-privacy.ts";
import { SENTRY_VERIFICATION_ERROR_MESSAGE } from "./sentry-client.ts";

describe("sentry privacy scrubbing", () => {
  it("redacts emails and bearer tokens from strings", () => {
    const input = "user@test.com failed with Bearer abc.def.ghi";
    const output = scrubString(input);
    assert.match(output, /\[redacted-email\]/);
    assert.match(output, /\[redacted-auth\]/i);
    assert.doesNotMatch(output, /user@test\.com/);
  });

  it("flags sensitive field names", () => {
    assert.equal(isSensitiveFieldName("message_body"), true);
    assert.equal(isSensitiveFieldName("feature_area"), false);
  });

  it("scrubs request data and keeps only opaque user id", () => {
    const event = scrubSentryEvent({
      message: "Contact parent@test.com",
      request: {
        cookies: "session=secret",
        headers: { Authorization: "Bearer token" },
        data: { message: "private circle text" },
      },
      user: {
        id: "11111111-1111-4111-8111-111111111111",
        email: "parent@test.com",
      },
      extra: {
        supabase_code: "42501",
        baby_note: "should redact",
      },
    });

    assert.ok(event);
    assert.equal(event?.user?.id, "11111111-1111-4111-8111-111111111111");
    assert.equal(event?.user?.email, undefined);
    assert.equal(event?.request?.cookies, undefined);
    assert.equal(event?.request?.headers, undefined);
    assert.equal(event?.request?.data, undefined);
    assert.equal((event?.extra as Record<string, unknown>).baby_note, "[redacted]");
    assert.match(event?.message ?? "", /\[redacted-email\]/);
  });

  it("does not discard the controlled Sentry verification error", () => {
    const event = scrubSentryEvent({
      message: SENTRY_VERIFICATION_ERROR_MESSAGE,
      exception: {
        values: [{ type: "Error", value: SENTRY_VERIFICATION_ERROR_MESSAGE }],
      },
    });

    assert.ok(event);
    assert.equal(event?.message, SENTRY_VERIFICATION_ERROR_MESSAGE);
  });

  it("scrubs moment and photo related fields", () => {
    const event = scrubSentryEvent({
      message: "upload failed",
      extra: {
        storage_path: "uuid/moment/media/original.jpg",
        caption: "First smile at the park",
        original_filename: "IMG_0001.jpg",
        signed_url: "https://example.com/signed",
        processing_status: "pending",
        file_size_category: "medium",
      },
    });

    assert.ok(event);
    const extra = event?.extra as Record<string, unknown>;
    assert.equal(extra.storage_path, "[redacted]");
    assert.equal(extra.caption, "[redacted]");
    assert.equal(extra.original_filename, "[redacted]");
    assert.equal(extra.signed_url, "[redacted]");
    assert.equal(extra.processing_status, "pending");
    assert.equal(extra.file_size_category, "medium");
  });

  it("redacts storage paths and URLs in free text", () => {
    const path =
      "11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222/33333333-3333-4333-8333-333333333333/display.webp";
    const output = scrubString(`failed ${path} https://cdn.example.com/x`);
    assert.match(output, /\[redacted-storage-path\]/);
    assert.match(output, /\[redacted-url\]/);
    assert.doesNotMatch(output, /display\.webp/);
  });
});
