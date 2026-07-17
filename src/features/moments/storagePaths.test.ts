import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildMomentStoragePaths,
  isStoragePathOwnedBy,
  isValidMomentStoragePath,
  parseStoragePathOwnerId,
} from "./storagePaths.ts";

const OWNER = "11111111-1111-4111-8111-111111111111";
const MOMENT = "22222222-2222-4222-8222-222222222222";
const MEDIA = "33333333-3333-4333-8333-333333333333";

describe("moment storage paths", () => {
  it("builds canonical original and thumbnail paths", () => {
    const paths = buildMomentStoragePaths({
      ownerParentId: OWNER,
      momentId: MOMENT,
      mediaId: MEDIA,
      mimeType: "image/jpeg",
    });
    assert.equal(
      paths.storagePath,
      `${OWNER}/${MOMENT}/${MEDIA}/original.jpg`,
    );
    assert.equal(
      paths.thumbnailPath,
      `${OWNER}/${MOMENT}/${MEDIA}/thumb.webp`,
    );
  });

  it("parses owner from path prefix", () => {
    const path = `${OWNER}/${MOMENT}/${MEDIA}/original.jpg`;
    assert.equal(parseStoragePathOwnerId(path), OWNER);
    assert.equal(isStoragePathOwnedBy(path, OWNER), true);
    assert.equal(
      isStoragePathOwnedBy(path, "44444444-4444-4444-8444-444444444444"),
      false,
    );
  });

  it("validates path shape", () => {
    assert.equal(
      isValidMomentStoragePath(`${OWNER}/${MOMENT}/${MEDIA}/original.webp`),
      true,
    );
    assert.equal(isValidMomentStoragePath("bad/path"), false);
  });
});
