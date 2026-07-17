import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isMomentsEnabled } from "./config.ts";

describe("isMomentsEnabled", () => {
  it("is false by default", () => {
    assert.equal(isMomentsEnabled({}), false);
    assert.equal(isMomentsEnabled({ NEXT_PUBLIC_MOMENTS_ENABLED: "false" }), false);
  });

  it("is true only when env is exactly true", () => {
    assert.equal(isMomentsEnabled({ NEXT_PUBLIC_MOMENTS_ENABLED: "true" }), true);
    assert.equal(isMomentsEnabled({ NEXT_PUBLIC_MOMENTS_ENABLED: "TRUE" }), false);
  });
});
