import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const here = dirname(fileURLToPath(import.meta.url));

describe("moments queries — ready photo count", () => {
  const queries = readFileSync(join(here, "queries.ts"), "utf8");

  it("filters album and preview loads to Moments with ready media", () => {
    assert.match(queries, /filterMomentIdsWithReadyMedia/);
    assert.match(queries, /countDistinctMomentsWithReadyMedia/);
    assert.match(queries, /countReadyMomentsForBaby/);
  });

  it("prefers ready media for primary thumbnails", () => {
    assert.match(queries, /row\.processing_status === "ready"/);
  });
});

describe("moments UI — photo count labels", () => {
  it("shows formatted ready photo counts in album and preview", () => {
    const album = readFileSync(
      join(here, "components", "MomentsAlbumScreen.tsx"),
      "utf8",
    );
    const preview = readFileSync(
      join(here, "components", "MomentsPreviewCard.tsx"),
      "utf8",
    );
    assert.match(album, /formatMomentPhotoCount\(photoCount\)/);
    assert.match(preview, /formatMomentPhotoCount\(photoCount\)/);
    assert.match(preview, /result\.data\.photoCount/);
  });

  it("uses empty state when ready photo count is zero", () => {
    const album = readFileSync(
      join(here, "components", "MomentsAlbumScreen.tsx"),
      "utf8",
    );
    const preview = readFileSync(
      join(here, "components", "MomentsPreviewCard.tsx"),
      "utf8",
    );
    assert.match(album, /photoCount === 0/);
    assert.match(preview, /photoCount === 0/);
    assert.match(preview, /PreviewEmptyBody/);
  });
});

describe("moments retry idempotency", () => {
  it("reuses existing media id for retry processing", () => {
    const actions = readFileSync(join(here, "actions.ts"), "utf8");
    const retryIdx = actions.indexOf("export async function retryMomentMediaProcessing");
    assert.ok(retryIdx >= 0);
    const retryBlock = actions.slice(retryIdx, retryIdx + 2000);
    assert.match(retryBlock, /retry_moment_media_processing/);
    assert.match(retryBlock, /processMomentMedia\(trimmed\)/);
    assert.doesNotMatch(retryBlock, /create_private_moment/);
    assert.doesNotMatch(retryBlock, /create_moment_media_upload_slot/);
  });

  it("blocks duplicate create submissions in NewMomentScreen", () => {
    const src = readFileSync(
      join(here, "components", "NewMomentScreen.tsx"),
      "utf8",
    );
    assert.match(src, /submittingRef\.current/);
    assert.match(src, /disabled=\{busy\}/);
  });
});
