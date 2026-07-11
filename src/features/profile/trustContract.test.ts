import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { LEGAL_DRAFT_BANNER } from "./legal.ts";
import { validateAtlasPrivacy } from "./validation.ts";

describe("profile trust contracts", () => {
  it("rejects unsupported Atlas privacy levels like neighbourhood", () => {
    const result = validateAtlasPrivacy({
      mapVisibility: "neighbourhood",
      suburbArea: "Somewhere",
    });
    assert.equal(result.ok, false);
  });

  it("marks legal copy as beta draft", () => {
    assert.match(LEGAL_DRAFT_BANNER, /Beta draft/i);
    assert.match(LEGAL_DRAFT_BANNER, /not final legal advice/i);
  });
});
