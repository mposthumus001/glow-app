import assert from "node:assert/strict";
import { test } from "node:test";

import { MIN_SUBURB_PRESENCE_COUNT } from "./privacyConstants.ts";
import { MIN_SUBURB_PRESENCE_COUNT as reExportedFromPresenceGeoJson } from "../map/presenceGeoJson.ts";

test("MIN_SUBURB_PRESENCE_COUNT matches the documented k-anonymity floor", () => {
  assert.equal(MIN_SUBURB_PRESENCE_COUNT, 5);
});

test("presenceGeoJson re-exports the same constant instance (single source of truth)", () => {
  assert.equal(reExportedFromPresenceGeoJson, MIN_SUBURB_PRESENCE_COUNT);
});
