import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import { buildNavEnv, getAppNavItems, resolveActiveNav } from "./nav.ts";

const here = dirname(fileURLToPath(import.meta.url));

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
    assert.equal(
      resolveActiveNav("/family/11111111-1111-1111-1111-111111111111"),
      "family",
    );
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
    assert.equal(ids.indexOf("calm"), ids.indexOf("family") + 1);
  });
});

describe("buildNavEnv", () => {
  it("uses server-resolved boolean when provided", () => {
    assert.equal(
      getAppNavItems(buildNavEnv(true)).some((item) => item.id === "family"),
      true,
    );
    assert.equal(
      getAppNavItems(buildNavEnv(false)).some((item) => item.id === "family"),
      false,
    );
  });
});

describe("shell nav consumers", () => {
  it("desktop and mobile nav use getAppNavItems, not stale APP_NAV_ITEMS", () => {
    const desktop = readFileSync(join(here, "DesktopSideNav.tsx"), "utf8");
    const mobile = readFileSync(join(here, "MobileBottomNav.tsx"), "utf8");
    const shell = readFileSync(join(here, "AppShell.tsx"), "utf8");
    const layout = readFileSync(
      join(here, "..", "..", "app", "(app)", "layout.tsx"),
      "utf8",
    );

    for (const src of [desktop, mobile]) {
      assert.match(src, /getAppNavItems\(buildNavEnv\(familyAlbumEnabled\)\)/);
      assert.doesNotMatch(src, /APP_NAV_ITEMS/);
    }

    assert.match(shell, /familyAlbumEnabled/);
    assert.match(layout, /isFamilyAlbumEnabled\(\)/);
    assert.match(layout, /familyAlbumEnabled=\{familyAlbumEnabled\}/);
  });
});
