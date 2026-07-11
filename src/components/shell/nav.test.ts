import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveActiveNav } from "./nav.ts";

describe("resolveActiveNav", () => {
  it("marks Tonight active on home", () => {
    assert.equal(resolveActiveNav("/"), "tonight");
    assert.equal(resolveActiveNav(""), "tonight");
  });

  it("marks Circle active for /circle and nested paths", () => {
    assert.equal(resolveActiveNav("/circle"), "circle");
    assert.equal(resolveActiveNav("/circle/"), "circle");
    assert.equal(resolveActiveNav("/circle/settings"), "circle");
  });

  it("marks Baby, Calm, and Profile from their roots", () => {
    assert.equal(resolveActiveNav("/baby"), "baby");
    assert.equal(resolveActiveNav("/baby/growth"), "baby");
    assert.equal(resolveActiveNav("/calm"), "calm");
    assert.equal(resolveActiveNav("/calm/rain"), "calm");
    assert.equal(resolveActiveNav("/profile"), "profile");
    assert.equal(resolveActiveNav("/profile/privacy"), "profile");
  });

  it("ignores query strings", () => {
    assert.equal(resolveActiveNav("/circle?tab=messages"), "circle");
  });

  it("falls back to Tonight for unknown authenticated paths", () => {
    assert.equal(resolveActiveNav("/unknown"), "tonight");
  });
});
