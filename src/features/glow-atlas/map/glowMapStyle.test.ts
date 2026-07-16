import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildGlowMapStyle,
  GLOW_PRESENCE_STATE_HALO_LAYER_ID,
  GLOW_SYNTHETIC_PREVIEW_CORE_LAYER_ID,
  GLOW_SYNTHETIC_PREVIEW_HALO_LAYER_ID,
  GLOW_SYNTHETIC_PREVIEW_HEATMAP_LAYER_ID,
  GLOW_SYNTHETIC_PREVIEW_LAYER_IDS,
  GLOW_SYNTHETIC_PREVIEW_SOURCE_ID,
  syntheticPreviewCoreLayer,
  syntheticPreviewHaloLayer,
  syntheticPreviewHeatmapLayer,
} from "./glowMapStyle.ts";

const SYNTHETIC_LAYER_BUILDERS = [
  syntheticPreviewHeatmapLayer,
  syntheticPreviewHaloLayer,
  syntheticPreviewCoreLayer,
] as const;

test("buildGlowMapStyle never bakes the synthetic preview source/layers into the base style", () => {
  const withoutPmtiles = buildGlowMapStyle({});
  const withPmtiles = buildGlowMapStyle({ pmtilesUrl: "https://example.com/x.pmtiles" });

  for (const style of [withoutPmtiles, withPmtiles]) {
    assert.equal(style.sources[GLOW_SYNTHETIC_PREVIEW_SOURCE_ID], undefined);
    const layerIds = style.layers.map((layer) => layer.id);
    for (const id of GLOW_SYNTHETIC_PREVIEW_LAYER_IDS) {
      assert.ok(!layerIds.includes(id), `base style must not include ${id}`);
    }
  }
});

test("heatmap, halo and core all reference the same synthetic source — never real presence sources", () => {
  for (const build of SYNTHETIC_LAYER_BUILDERS) {
    const layer = build();
    assert.equal(layer.source, GLOW_SYNTHETIC_PREVIEW_SOURCE_ID);
  }
  assert.equal(syntheticPreviewHeatmapLayer().type, "heatmap");
  assert.equal(syntheticPreviewHaloLayer().type, "circle");
  assert.equal(syntheticPreviewCoreLayer().type, "circle");
});

test("synthetic layers carry no promoteId and no cluster options — one Point stays one light", () => {
  for (const build of SYNTHETIC_LAYER_BUILDERS) {
    const layer = build();
    assert.ok(!("promoteId" in layer));
    assert.ok(!("cluster" in layer));
    assert.ok(!("clusterMaxZoom" in layer));
    // No filter that would drop features — every Point stays in the render path.
    assert.equal((layer as { filter?: unknown }).filter, undefined);
  }
});

test("heatmap fades by zoom 8–9 while individual cores remain visible from country zoom (no minzoom gate that would hide points)", () => {
  const heatmap = syntheticPreviewHeatmapLayer();
  const halo = syntheticPreviewHaloLayer();
  const core = syntheticPreviewCoreLayer();
  assert.ok(typeof heatmap.maxzoom === "number" && heatmap.maxzoom <= 9);
  assert.equal(halo.minzoom, undefined, "halo must render at country zoom");
  assert.equal(core.minzoom, undefined, "core must render at country zoom");
});

test("synthetic layer id paint order is heatmap → halo → core (GlowMap inserts before real presence)", () => {
  assert.deepEqual([...GLOW_SYNTHETIC_PREVIEW_LAYER_IDS], [
    GLOW_SYNTHETIC_PREVIEW_HEATMAP_LAYER_ID,
    GLOW_SYNTHETIC_PREVIEW_HALO_LAYER_ID,
    GLOW_SYNTHETIC_PREVIEW_CORE_LAYER_ID,
  ]);
});

test("presence layers keep their existing ids stable (regression guard for beforeId insertion)", () => {
  assert.equal(GLOW_PRESENCE_STATE_HALO_LAYER_ID, "glow-presence-state-halo");
});

test("disabled mode: when layers are not added to the style, neither heatmap nor point layers exist — style alone has none", () => {
  // GlowMap only calls addLayer when enabled; the style builder is the
  // disabled-mode baseline. Covered above; this documents the contract.
  const style = buildGlowMapStyle({});
  assert.equal(style.sources[GLOW_SYNTHETIC_PREVIEW_SOURCE_ID], undefined);
  assert.equal(GLOW_SYNTHETIC_PREVIEW_LAYER_IDS.length, 3);
});
