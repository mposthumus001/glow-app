import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildMomentMediaPaths,
  isValidDisplayPath,
  isValidOriginalPath,
  pathsBelongToMedia,
} from "./processing/paths.ts";

const OWNER = "11111111-1111-4111-8111-111111111111";
const MOMENT = "22222222-2222-4222-8222-222222222222";
const MEDIA = "33333333-3333-4333-8333-333333333333";

describe("moment media paths (Sprint 9.2A)", () => {
  it("builds original, display, and thumbnail paths", () => {
    const paths = buildMomentMediaPaths({
      ownerParentId: OWNER,
      momentId: MOMENT,
      mediaId: MEDIA,
      mimeType: "image/jpeg",
    });
    assert.equal(
      paths.originalPath,
      `${OWNER}/${MOMENT}/${MEDIA}/original.jpg`,
    );
    assert.equal(
      paths.storagePath,
      `${OWNER}/${MOMENT}/${MEDIA}/display.webp`,
    );
    assert.equal(
      paths.thumbnailPath,
      `${OWNER}/${MOMENT}/${MEDIA}/thumb.webp`,
    );
  });

  it("validates original and display path shapes", () => {
    assert.equal(
      isValidOriginalPath(`${OWNER}/${MOMENT}/${MEDIA}/original.webp`),
      true,
    );
    assert.equal(
      isValidDisplayPath(`${OWNER}/${MOMENT}/${MEDIA}/display.webp`),
      true,
    );
    assert.equal(isValidOriginalPath("bad/path"), false);
  });

  it("rejects cross-parent path bundles", () => {
    const paths = buildMomentMediaPaths({
      ownerParentId: OWNER,
      momentId: MOMENT,
      mediaId: MEDIA,
      mimeType: "image/png",
    });
    assert.equal(
      pathsBelongToMedia(paths, OWNER, MOMENT, MEDIA),
      true,
    );
    assert.equal(
      pathsBelongToMedia(
        paths,
        "44444444-4444-4444-8444-444444444444",
        MOMENT,
        MEDIA,
      ),
      false,
    );
  });
});
