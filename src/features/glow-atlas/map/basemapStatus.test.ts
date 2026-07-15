import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveBasemapStatus } from "./basemapStatus.ts";

describe("resolveBasemapStatus", () => {
  it("is ok when a PMTiles URL is configured and has not failed to load", () => {
    const result = resolveBasemapStatus({
      pmtilesUrl: "https://cdn.example.com/atlas/australia.pmtiles",
      loadFailed: false,
    });
    assert.deepEqual(result, { status: "ok", message: null });
  });

  it("falls back with a subtle message when no URL is configured", () => {
    const result = resolveBasemapStatus({
      pmtilesUrl: undefined,
      loadFailed: false,
    });
    assert.equal(result.status, "context-unavailable");
    assert.equal(result.message, "Showing simplified map");
  });

  it("treats a whitespace-only URL the same as unconfigured", () => {
    const result = resolveBasemapStatus({ pmtilesUrl: "   ", loadFailed: false });
    assert.equal(result.status, "context-unavailable");
  });

  it("falls back with the same subtle message when the configured URL fails to load", () => {
    const result = resolveBasemapStatus({
      pmtilesUrl: "https://cdn.example.com/atlas/australia.pmtiles",
      loadFailed: true,
    });
    assert.deepEqual(result, {
      status: "context-unavailable",
      message: "Showing simplified map",
    });
  });

  it("never returns a blank/empty message when context is unavailable", () => {
    for (const input of [
      { pmtilesUrl: null, loadFailed: false },
      { pmtilesUrl: "https://cdn.example.com/x.pmtiles", loadFailed: true },
    ]) {
      const result = resolveBasemapStatus(input);
      assert.ok(result.message && result.message.length > 0);
    }
  });
});
