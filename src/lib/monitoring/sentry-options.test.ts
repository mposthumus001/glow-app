import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { APP_VERSION } from "../app-version.ts";
import {
  getSentryRelease,
  resolveClientSentryEnabled,
} from "./sentry-options.ts";

describe("monitoring release metadata", () => {
  it("attaches the Glow app version to Sentry releases", () => {
    const release = getSentryRelease();
    assert.match(release, new RegExp(APP_VERSION.replace(/\./g, "\\.")));
    assert.match(release, /^glow-app@/);
  });
});

describe("client DSN resolution", () => {
  it("treats trimmed public DSN values as configured", () => {
    assert.equal(
      resolveClientSentryEnabled("  https://example.ingest.sentry.io/1  "),
      true,
    );
  });

  it("treats empty public DSN values as not configured", () => {
    assert.equal(resolveClientSentryEnabled(null), false);
    assert.equal(resolveClientSentryEnabled(""), false);
  });
});
