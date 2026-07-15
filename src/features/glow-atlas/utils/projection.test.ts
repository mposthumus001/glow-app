import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  AU_GEO_BOUNDS,
  clamp,
  latLngToPercent,
  resolveDisplayAnchor,
  svgToPercent,
} from "./projection.ts";

describe("clamp", () => {
  it("keeps values inside the range unchanged", () => {
    assert.equal(clamp(50, 0, 100), 50);
  });

  it("clamps below the minimum", () => {
    assert.equal(clamp(-5, 0, 100), 0);
  });

  it("clamps above the maximum", () => {
    assert.equal(clamp(150, 0, 100), 100);
  });
});

describe("latLngToPercent", () => {
  it("maps the west/north corner to 0%,0%", () => {
    const p = latLngToPercent(AU_GEO_BOUNDS.north, AU_GEO_BOUNDS.west);
    assert.equal(p.x, 0);
    assert.equal(p.y, 0);
  });

  it("maps the east/south corner to 100%,100%", () => {
    const p = latLngToPercent(AU_GEO_BOUNDS.south, AU_GEO_BOUNDS.east);
    assert.equal(p.x, 100);
    assert.equal(p.y, 100);
  });

  it("clamps coordinates outside AU_GEO_BOUNDS instead of overflowing", () => {
    const p = latLngToPercent(-50, 100);
    assert.equal(p.x, 0);
    assert.equal(p.y, 100);
  });

  it("places known state capitals in a geographically plausible relative order", () => {
    // Perth (far west) must project west of Sydney (far east).
    const perth = latLngToPercent(-31.9505, 115.8605);
    const sydney = latLngToPercent(-33.8688, 151.2093);
    assert.ok(perth.x < sydney.x);

    // Darwin (far north) must project north of Hobart (far south).
    const darwin = latLngToPercent(-12.4634, 130.8456);
    const hobart = latLngToPercent(-42.8821, 147.3272);
    assert.ok(darwin.y < hobart.y);

    // Townsville is south (greater y) of Cairns in real geography.
    const cairns = latLngToPercent(-16.9186, 145.7781);
    const townsville = latLngToPercent(-19.259, 146.8169);
    assert.ok(townsville.y > cairns.y);
  });
});

describe("resolveDisplayAnchor", () => {
  it("returns the raw geographic projection when no offset is given", () => {
    const geo = { lat: -33.8688, lng: 151.2093 };
    assert.deepEqual(resolveDisplayAnchor(geo), latLngToPercent(geo.lat, geo.lng));
  });

  it("applies a documented display offset on top of the geographic anchor", () => {
    const geo = { lat: -35.2809, lng: 149.13 };
    const base = latLngToPercent(geo.lat, geo.lng);
    const offset = { dx: -0.5, dy: -2.5, reason: "test" };
    const result = resolveDisplayAnchor(geo, offset);
    assert.equal(result.x, base.x - 0.5);
    assert.equal(result.y, base.y - 2.5);
  });

  it("clamps the offset result to stay within the viewBox", () => {
    const geo = { lat: AU_GEO_BOUNDS.north, lng: AU_GEO_BOUNDS.west };
    const result = resolveDisplayAnchor(geo, {
      dx: -10,
      dy: -10,
      reason: "test overflow",
    });
    assert.equal(result.x, 0);
    assert.equal(result.y, 0);
  });
});

describe("svgToPercent", () => {
  it("round-trips with the viewBox origin at 0%,0%", () => {
    const p = svgToPercent(6.5, 4.8);
    assert.equal(p.x, 0);
    assert.equal(p.y, 0);
  });
});
