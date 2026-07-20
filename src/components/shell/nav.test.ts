import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveActiveNav } from "./nav.ts";
import { getAppNavItems } from "./nav.ts";

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

  it("marks Family from /family roots", () => {
    assert.equal(resolveActiveNav("/family"), "family");
    assert.equal(resolveActiveNav("/family/new"), "family");
  });

  it("ignores query strings", () => {
    assert.equal(resolveActiveNav("/circle?tab=messages"), "circle");
  });

  it("falls back to Tonight for unknown authenticated paths", () => {
    assert.equal(resolveActiveNav("/unknown"), "tonight");
  });
});

describe("getAppNavItems", () => {
  it("omits Family when flag is off", () => {
    const items = getAppNavItems({});
    assert.equal(items.some((i) => i.id === "family"), false);
    assert.equal(items.length, 5);
  });

  it("includes Family after Baby when flag is on", () => {
    const items = getAppNavItems({
      NEXT_PUBLIC_FAMILY_ALBUM_ENABLED: "true",
    });
    const ids = items.map((i) => i.id);
    assert.ok(ids.includes("family"));
    assert.equal(ids.indexOf("family"), ids.indexOf("baby") + 1);
  });
});
