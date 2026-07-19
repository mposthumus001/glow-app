import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { MOMENTS_SIGNED_URL_TTL_SECONDS } from "./constants.ts";
import {
  categorizeSignedUrlFailure,
  isSignedUrlFresh,
  signedUrlExpiresAt,
} from "./mediaUrl.ts";

describe("moments signed URL freshness", () => {
  it("treats URLs inside TTL minus skew as fresh", () => {
    const now = 1_000_000;
    const expiresAt = signedUrlExpiresAt(now, MOMENTS_SIGNED_URL_TTL_SECONDS);
    assert.equal(isSignedUrlFresh(expiresAt, now), true);
  });

  it("treats URLs past skew window as stale", () => {
    const now = 1_000_000;
    const expiresAt = now + 10_000;
    assert.equal(isSignedUrlFresh(expiresAt, now), false);
  });

  it("never treats a missing expiry as fresh", () => {
    assert.equal(isSignedUrlFresh(null), false);
    assert.equal(isSignedUrlFresh(undefined), false);
  });

  it("does not allow cache lifetime beyond TTL", () => {
    const now = Date.now();
    const expiresAt = signedUrlExpiresAt(now);
    assert.ok(expiresAt - now <= MOMENTS_SIGNED_URL_TTL_SECONDS * 1000);
  });
});

describe("moments signed URL failure categories", () => {
  it("maps expired token bodies to expired_token", () => {
    assert.equal(
      categorizeSignedUrlFailure({
        status: 400,
        bodyText: "The provided token has expired.",
      }),
      "expired_token",
    );
  });

  it("maps 404 to not_found and 401/403 to auth", () => {
    assert.equal(categorizeSignedUrlFailure({ status: 404 }), "not_found");
    assert.equal(categorizeSignedUrlFailure({ status: 401 }), "auth");
    assert.equal(categorizeSignedUrlFailure({ status: 403 }), "auth");
  });
});
