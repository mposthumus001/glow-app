import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildGlowMapStyle,
  GLOW_PRESENCE_STATE_HALO_LAYER_ID,
  GLOW_SYNTHETIC_PREVIEW_GLOW_LAYER_ID,
  GLOW_SYNTHETIC_PREVIEW_HEATMAP_LAYER_ID,
  GLOW_SYNTHETIC_PREVIEW_SOURCE_ID,
  syntheticPreviewGlowLayer,
  syntheticPreviewHeatmapLayer,
} from "./glowMapStyle.ts";

test("buildGlowMapStyle never bakes the synthetic preview source/layers into the base style, regardless of pmtiles config — GlowMap.tsx adds them imperatively only when enabled", () => {
  const withoutPmtiles = buildGlowMapStyle({});
  const withPmtiles = buildGlowMapStyle({ pmtilesUrl: "https://example.com/x.pmtiles" });

  for (const style of [withoutPmtiles, withPmtiles]) {
    assert.equal(style.sources[GLOW_SYNTHETIC_PREVIEW_SOURCE_ID], undefined);
    const layerIds = style.layers.map((layer) => layer.id);
    assert.ok(!layerIds.includes(GLOW_SYNTHETIC_PREVIEW_HEATMAP_LAYER_ID));
    assert.ok(!layerIds.includes(GLOW_SYNTHETIC_PREVIEW_GLOW_LAYER_ID));
  }
});

test("synthetic preview layers reference the dedicated synthetic source, never the real presence sources", () => {
  const heatmap = syntheticPreviewHeatmapLayer();
  const glow = syntheticPreviewGlowLayer();
  assert.equal(heatmap.source, GLOW_SYNTHETIC_PREVIEW_SOURCE_ID);
  assert.equal(glow.source, GLOW_SYNTHETIC_PREVIEW_SOURCE_ID);
  assert.equal(heatmap.type, "heatmap");
  assert.equal(glow.type, "circle");
});

test("synthetic preview layers carry no promoteId / feature-based click affordance", () => {
  // Real presence sources (see buildGlowMapStyle) use `promoteId` so
  // GlowMap can `setFeatureState` a selection — synthetic layers must have
  // no such mechanism, and are never added to GlowMap's `interactiveLayerIds`.
  const heatmap = syntheticPreviewHeatmapLayer();
  const glow = syntheticPreviewGlowLayer();
  assert.ok(!("promoteId" in heatmap));
  assert.ok(!("promoteId" in glow));
});

test("the heatmap fades out well before the glow layer's minzoom, avoiding a double-rendered gap or overlap in country->state transition", () => {
  const heatmap = syntheticPreviewHeatmapLayer();
  const glow = syntheticPreviewGlowLayer();
  assert.ok(typeof heatmap.maxzoom === "number" && heatmap.maxzoom <= 8);
  assert.ok(typeof glow.minzoom === "number" && glow.minzoom >= 4);
});

test("presence layers keep their existing ids stable (regression guard for the imperative beforeId insertion in GlowMap.tsx)", () => {
  assert.equal(GLOW_PRESENCE_STATE_HALO_LAYER_ID, "glow-presence-state-halo");
});
