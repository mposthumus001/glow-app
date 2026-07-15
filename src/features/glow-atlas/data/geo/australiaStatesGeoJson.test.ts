import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { AUSTRALIA_STATES_GEOJSON } from "./australiaStatesGeoJson.ts";

const GEOJSON_PATH = fileURLToPath(
  new URL("./australia-states.geojson", import.meta.url),
);

const EXPECTED_CODES = [
  "NSW",
  "VIC",
  "QLD",
  "WA",
  "SA",
  "TAS",
  "NT",
  "ACT",
] as const;

describe("AUSTRALIA_STATES_GEOJSON", () => {
  it("stays byte-identical (as parsed JSON) to the checked-in .geojson source", () => {
    const raw = JSON.parse(readFileSync(GEOJSON_PATH, "utf8"));
    assert.deepEqual(AUSTRALIA_STATES_GEOJSON, raw);
  });

  it("has exactly one feature per AuStateCode, all MultiPolygons", () => {
    const codes = AUSTRALIA_STATES_GEOJSON.features.map((f) => f.properties.code);
    assert.equal(codes.length, 8);
    for (const code of EXPECTED_CODES) {
      assert.ok(codes.includes(code), `missing ${code}`);
    }
    for (const feature of AUSTRALIA_STATES_GEOJSON.features) {
      assert.equal(feature.type, "Feature");
      assert.equal(feature.geometry.type, "MultiPolygon");
      assert.ok(feature.geometry.coordinates.length > 0);
    }
  });

  it("keeps every coordinate within plausible Australian lng/lat bounds", () => {
    for (const feature of AUSTRALIA_STATES_GEOJSON.features) {
      const walk = (coords: unknown): void => {
        if (typeof coords[0 as never] === "number") {
          const [lng, lat] = coords as unknown as [number, number];
          assert.ok(lng > 110 && lng < 155, `lng out of range: ${lng}`);
          assert.ok(lat > -45 && lat < -9, `lat out of range: ${lat}`);
        } else {
          for (const sub of coords as unknown[]) walk(sub);
        }
      };
      walk(feature.geometry.coordinates);
    }
  });
});
