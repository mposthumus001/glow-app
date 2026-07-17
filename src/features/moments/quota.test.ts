import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { MOMENTS_QUOTA_BYTES } from "./constants.ts";
import { buildQuotaStatus, checkQuotaForUpload } from "./quota.ts";

describe("moments quota", () => {
  it("marks quota exceeded at 1 GB", () => {
    const status = buildQuotaStatus(MOMENTS_QUOTA_BYTES);
    assert.equal(status.isExceeded, true);
    assert.equal(status.remainingBytes, 0);
  });

  it("rejects upload that would exceed quota", () => {
    const result = checkQuotaForUpload(MOMENTS_QUOTA_BYTES - 1000, 2000);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /storage is full/i);
    }
  });

  it("allows upload within quota", () => {
    const result = checkQuotaForUpload(1000, 5000);
    assert.equal(result.ok, true);
  });

  it("flags near-limit state", () => {
    const near = buildQuotaStatus(Math.floor(MOMENTS_QUOTA_BYTES * 0.91));
    assert.equal(near.isNearLimit, true);
    assert.equal(near.isExceeded, false);
  });
});
