import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { atlasCities, getCitiesForState } from "../data/cities.ts";
import { atlasSuburbs, getSuburbsForCity } from "../data/suburbs.ts";
import type { AtlasBadge, AuStateCode } from "../types.ts";
import {
  applyViewportCollision,
  BADGE_COLLISION,
  clusterNearbyBadges,
  deriveFeaturedIds,
  discloseCityBadges,
  discloseStateBadges,
  discloseSuburbBadges,
  pickPreferredThenTop,
} from "./disclosure.ts";

function badge(overrides: Partial<AtlasBadge> & { id: string }): AtlasBadge {
  return {
    label: overrides.id,
    count: 1,
    x: 0,
    y: 0,
    ...overrides,
  };
}

function badgesFromCities(state: AuStateCode): AtlasBadge[] {
  return getCitiesForState(state).map((c) =>
    badge({
      id: c.id,
      label: c.name,
      count: c.awakeCount,
      x: c.x,
      y: c.y,
      featured: c.featured,
      featuredPriority: c.featuredPriority,
    }),
  );
}

describe("deriveFeaturedIds", () => {
  it("orders VIC's featured cities the same way the old hardcoded allowlist did", () => {
    const badges = badgesFromCities("VIC");
    assert.deepEqual(deriveFeaturedIds(badges), [
      "melbourne",
      "geelong",
      "bendigo",
      "ballarat",
      "mildura",
    ]);
  });

  it("works for any state with featured data, not just VIC (generalised disclosure)", () => {
    const badges = badgesFromCities("QLD");
    const featured = deriveFeaturedIds(badges);
    assert.deepEqual(featured, [
      "brisbane",
      "gold-coast",
      "sunshine-coast",
    ]);
  });

  it("returns an empty list when no badge is featured", () => {
    assert.deepEqual(deriveFeaturedIds([badge({ id: "x" })]), []);
  });
});

describe("discloseCityBadges (regression: matches prior VIC/Melbourne behaviour)", () => {
  it("prefers Melbourne's featured cities before falling back to top-by-count", () => {
    const badges = badgesFromCities("VIC");
    const result = discloseCityBadges(badges, { max: 5, clusterDistance: 0 });
    assert.deepEqual(
      result.badges.map((b) => b.id),
      ["melbourne", "geelong", "ballarat", "bendigo", "mildura"],
    );
  });

  it("falls back to count ordering for a state with no featured data", () => {
    const badges = [
      badge({ id: "a", count: 10, x: 10, y: 10 }),
      badge({ id: "b", count: 50, x: 50, y: 50 }),
      badge({ id: "c", count: 5, x: 90, y: 90 }),
    ];
    const result = discloseCityBadges(badges, { max: 2 });
    assert.deepEqual(result.badges.map((b) => b.id), ["b", "a"]);
    assert.deepEqual(result.lightOnly.map((b) => b.id), ["c"]);
  });
});

describe("discloseSuburbBadges (regression: matches prior Melbourne behaviour)", () => {
  it("prefers Melbourne's featured suburbs before falling back to top-by-count", () => {
    const badges = getSuburbsForCity("melbourne").map((s) =>
      badge({
        id: s.id,
        count: s.awakeCount,
        featured: s.featured,
        featuredPriority: s.featuredPriority,
      }),
    );
    const result = discloseSuburbBadges(badges, { max: 4 });
    assert.deepEqual(
      result.badges.map((b) => b.id),
      ["mel-box-hill", "mel-preston", "mel-st-kilda", "mel-frankston"],
    );
  });
});

describe("discloseStateBadges", () => {
  it("passes every state badge through untouched — never drops an active state", () => {
    const badges = [badge({ id: "NSW" }), badge({ id: "VIC" })];
    const result = discloseStateBadges(badges);
    assert.deepEqual(result.badges, badges);
    assert.deepEqual(result.lightOnly, []);
  });
});

describe("pickPreferredThenTop", () => {
  it("keeps preferred order first, then fills by count", () => {
    const badges = [
      badge({ id: "a", count: 1 }),
      badge({ id: "b", count: 100 }),
      badge({ id: "c", count: 50 }),
    ];
    const result = pickPreferredThenTop(badges, ["a"], 2);
    assert.deepEqual(result.badges.map((b) => b.id), ["a", "b"]);
    assert.deepEqual(result.lightOnly.map((b) => b.id), ["c"]);
  });
});

describe("clusterNearbyBadges", () => {
  it("merges badges within the cluster distance into one area badge", () => {
    const badges = [
      badge({ id: "seed", count: 10, x: 50, y: 50 }),
      badge({ id: "near", count: 5, x: 51, y: 50.5 }),
      badge({ id: "far", count: 8, x: 90, y: 90 }),
    ];
    const { badges: clustered, absorbed } = clusterNearbyBadges(badges, 2.8);
    assert.equal(clustered.length, 2);
    const merged = clustered.find((b) => b.id === "cluster-seed");
    assert.ok(merged);
    assert.equal(merged?.count, 15);
    assert.deepEqual(absorbed.map((b) => b.id), ["near"]);
  });
});

describe("applyViewportCollision", () => {
  it("keeps the higher-count badge and rejects an overlapping lower-count one", () => {
    const badges = [
      badge({ id: "big", count: 100, x: 50, y: 50 }),
      badge({ id: "small", count: 10, x: 51, y: 50 }),
    ];
    const result = applyViewportCollision(badges, (b) => ({ x: b.x, y: b.y }), {
      footprint: BADGE_COLLISION.city,
    });
    assert.deepEqual(result.badges.map((b) => b.id), ["big"]);
    assert.deepEqual(result.lightOnly.map((b) => b.id), ["small"]);
  });

  it("keeps both badges when they are far enough apart", () => {
    const badges = [
      badge({ id: "left", count: 10, x: 10, y: 50 }),
      badge({ id: "right", count: 10, x: 90, y: 50 }),
    ];
    const result = applyViewportCollision(badges, (b) => ({ x: b.x, y: b.y }), {
      footprint: BADGE_COLLISION.city,
    });
    assert.equal(result.badges.length, 2);
    assert.equal(result.lightOnly.length, 0);
  });

  it("derives thresholds from the real pill footprint rather than independent magic numbers", () => {
    const { halfWidth } = BADGE_COLLISION.city;
    const nonOverlapDx = halfWidth * 2 * 1.1 + 0.01;
    const badges = [
      badge({ id: "a", count: 10, x: 50, y: 50 }),
      badge({ id: "b", count: 10, x: 50 + nonOverlapDx, y: 50 }),
    ];
    const result = applyViewportCollision(badges, (b) => ({ x: b.x, y: b.y }), {
      footprint: BADGE_COLLISION.city,
    });
    assert.equal(result.badges.length, 2, "badges just past the true footprint gap must both survive");
  });
});

describe("data integrity", () => {
  it("every atlas city sits within 0-100% of the viewBox", () => {
    for (const city of atlasCities) {
      assert.ok(city.x >= 0 && city.x <= 100, `${city.id} x out of range`);
      assert.ok(city.y >= 0 && city.y <= 100, `${city.id} y out of range`);
    }
  });

  it("every atlas suburb sits within 0-100% of the viewBox", () => {
    for (const suburb of atlasSuburbs) {
      assert.ok(suburb.x >= 0 && suburb.x <= 100, `${suburb.id} x out of range`);
      assert.ok(suburb.y >= 0 && suburb.y <= 100, `${suburb.id} y out of range`);
    }
  });
});
