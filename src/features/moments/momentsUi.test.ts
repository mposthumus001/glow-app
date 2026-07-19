import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import { isMomentsEnabled } from "./config.ts";
import { formatBabyAgeAtDate } from "./ageAtDate.ts";
import { validateClientUploadFile, shouldExposeSignedUrlInMarkup } from "./uploadClient.ts";

const here = dirname(fileURLToPath(import.meta.url));

describe("Baby Moments UI — feature flag", () => {
  it("hides Moments when NEXT_PUBLIC_MOMENTS_ENABLED is not true", () => {
    assert.equal(isMomentsEnabled({}), false);
    assert.equal(isMomentsEnabled({ NEXT_PUBLIC_MOMENTS_ENABLED: "false" }), false);
  });

  it("MomentsPreviewCard returns null when flag is off", () => {
    const src = readFileSync(
      join(here, "components", "MomentsPreviewCard.tsx"),
      "utf8",
    );
    assert.match(src, /if \(!momentsEnabled \|\| !babyId\)/);
    assert.match(src, /return null;/);
  });
});

describe("Baby Moments UI — Baby page placement", () => {
  it("places Moments card between child summary and Today", () => {
    const src = readFileSync(
      join(here, "..", "baby", "components", "BabyScreen.tsx"),
      "utf8",
    );
    const profileIdx = src.indexOf("<BabyProfileCard");
    const momentsIdx = src.indexOf("<MomentsPreviewCard");
    const todayIdx = src.indexOf("<TodaySummaryCard");
    assert.ok(profileIdx >= 0);
    assert.ok(momentsIdx >= 0);
    assert.ok(todayIdx >= 0);
    assert.ok(profileIdx < momentsIdx && momentsIdx < todayIdx);
  });
});

describe("Baby Moments UI — routes", () => {
  it("uses child-scoped moments routes under /baby/[babyId]/moments", () => {
    const album = readFileSync(
      join(here, "..", "..", "app", "(app)", "baby", "[babyId]", "moments", "page.tsx"),
      "utf8",
    );
    assert.match(album, /renderMomentsAlbumPage/);

    const preview = readFileSync(join(here, "components", "MomentsPreviewCard.tsx"), "utf8");
    assert.match(preview, /\/baby\/\$\{babyId\}\/moments/);
    assert.match(preview, /\/baby\/\$\{babyId\}\/moments\/new/);
  });

  it("redirects to /baby when feature flag is off on server pages", () => {
    const pages = readFileSync(join(here, "server", "pages.tsx"), "utf8");
    assert.match(pages, /if \(!isMomentsEnabled\(\)\)/);
    assert.match(pages, /redirect\("\/baby"\)/);
  });
});

describe("Baby Moments UI — upload validation", () => {
  it("rejects unsupported mime types client-side", () => {
    const file = { type: "image/gif", size: 1024 } as File;
    const result = validateClientUploadFile(file);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.outcome, "unsupported_image");
    }
  });

  it("rejects files over 8 MB client-side", () => {
    const file = { type: "image/jpeg", size: 9 * 1024 * 1024 } as File;
    const result = validateClientUploadFile(file);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.outcome, "image_too_large");
    }
  });

  it("accepts allowed image types within size limit", () => {
    const file = { type: "image/png", size: 1024 } as File;
    const result = validateClientUploadFile(file);
    assert.equal(result.ok, true);
  });
});

describe("Baby Moments UI — duplicate submit prevention", () => {
  it("guards create flow with submittingRef", () => {
    const src = readFileSync(join(here, "components", "NewMomentScreen.tsx"), "utf8");
    assert.match(src, /submittingRef\.current/);
    assert.match(src, /if \(submittingRef\.current\) return/);
  });

  it("guards delete confirmation against duplicate clicks", () => {
    const src = readFileSync(
      join(here, "components", "MomentDetailScreen.tsx"),
      "utf8",
    );
    assert.match(src, /deleteLock\.current/);
    assert.match(src, /if \(deleteLock\.current \|\| deleting\) return/);
    assert.match(src, /Delete moment/);
    assert.match(src, /Cancel/);
    assert.match(src, /setDeleteError/);
  });

  it("stacks delete actions on narrow screens and uses flex-1 from sm", () => {
    const src = readFileSync(
      join(here, "components", "MomentDetailScreen.tsx"),
      "utf8",
    );
    assert.match(src, /flex w-full min-w-0 flex-col gap-3 sm:flex-row/);
    assert.match(
      src,
      /box-border min-w-0 w-full max-w-full justify-center sm:w-auto sm:flex-1/,
    );
    assert.doesNotMatch(src, /fullWidth/);
    assert.match(src, /w-full max-w-sm min-w-0 overflow-x-hidden/);
    assert.match(src, /Delete moment/);
  });
});

describe("Baby Moments UI — delete behaviour", () => {
  it("requires confirmation before invoking deletePrivateMoment", () => {
    const src = readFileSync(
      join(here, "components", "MomentDetailScreen.tsx"),
      "utf8",
    );
    assert.match(src, /Delete moment/);
    assert.match(src, /Delete this moment\?/);
    assert.match(src, /deletePrivateMoment/);
    assert.match(src, /setDeleteOpen\(true\)/);
  });

  it("redirects to the child album on successful delete", () => {
    const src = readFileSync(
      join(here, "components", "MomentDetailScreen.tsx"),
      "utf8",
    );
    assert.match(src, /router\.push\(`\/baby\/\$\{babyId\}\/moments`\)/);
    assert.match(src, /router\.refresh\(\)/);
  });

  it("surfaces calm mapped errors and never raw supabase text", () => {
    const src = readFileSync(
      join(here, "components", "MomentDetailScreen.tsx"),
      "utf8",
    );
    assert.match(src, /deleteError/);
    assert.match(src, /role="alert"/);
    assert.doesNotMatch(src, /error\.message/);
    assert.doesNotMatch(src, /Postgrest/);
  });

  it("revalidates baby and album paths from the delete action", () => {
    const actions = readFileSync(join(here, "actions.ts"), "utf8");
    assert.match(actions, /soft_delete_private_moment/);
    assert.match(actions, /revalidateBabyMomentsPaths/);
    assert.match(actions, /revalidatePath\("\/baby"\)/);
    assert.match(actions, /revalidatePath\(`\/baby\/\$\{babyId\}\/moments`\)/);
  });
});

describe("Baby Moments UI — processing and retry", () => {
  it("polls media status on a modest interval until settled", () => {
    const src = readFileSync(join(here, "hooks", "useMomentProcessingPoll.ts"), "utf8");
    assert.match(src, /POLL_INTERVAL_MS = 3000/);
    assert.match(src, /getMomentMediaStatus/);
  });

  it("shows retry action on detail screen for failed media", () => {
    const src = readFileSync(join(here, "components", "MomentDetailScreen.tsx"), "utf8");
    assert.match(src, /retryMomentMediaProcessing/);
    assert.match(src, /Try again/);
  });

  it("renders calm processing tile instead of broken images", () => {
    const src = readFileSync(join(here, "components", "MomentMediaTile.tsx"), "utf8");
    assert.match(src, /processing/);
    assert.match(src, /Preparing your photo/);
    assert.doesNotMatch(src, /processing_error_code/);
  });

  it("album and preview tiles use MomentSignedImage for ready thumbnails", () => {
    const tile = readFileSync(join(here, "components", "MomentMediaTile.tsx"), "utf8");
    const album = readFileSync(join(here, "components", "MomentsAlbumScreen.tsx"), "utf8");
    const preview = readFileSync(
      join(here, "components", "MomentsPreviewCard.tsx"),
      "utf8",
    );
    assert.match(tile, /MomentSignedImage/);
    assert.match(tile, /preferThumbnail/);
    assert.match(tile, /thumbnailUrl/);
    assert.match(album, /MomentMediaTile/);
    assert.match(preview, /MomentMediaTile/);
  });

  it("detail uses processed display image via signed refresh helper", () => {
    const detail = readFileSync(
      join(here, "components", "MomentDetailScreen.tsx"),
      "utf8",
    );
    const signed = readFileSync(
      join(here, "components", "MomentSignedImage.tsx"),
      "utf8",
    );
    assert.match(detail, /preferThumbnail=\{false\}/);
    assert.match(detail, /displayMediaId/);
    assert.match(detail, /displayUrl/);
    assert.match(signed, /getMomentMediaSignedUrl/);
    assert.match(signed, /Photo unavailable/);
    assert.match(signed, /onError/);
  });

  it("renders server signed URL directly without hydration-sensitive freshness checks", () => {
    const signed = readFileSync(
      join(here, "components", "MomentSignedImage.tsx"),
      "utf8",
    );
    assert.match(signed, /useState<string \| null>\(initialUrl\)/);
    assert.match(signed, /if \(initialUrl\) return;/);
    assert.match(signed, /remountKey/);
    assert.match(signed, /resolveRefreshAttempt/);
    assert.match(signed, /resolveAfterRefreshFailed/);
    assert.match(signed, /onLoad/);
    assert.match(signed, /width=\{512\}/);
    assert.match(signed, /object-cover/);
    assert.match(signed, /Photo unavailable/);
    assert.doesNotMatch(signed, /isSignedUrlFresh/);
    assert.doesNotMatch(signed, /Date\.now/);
    assert.doesNotMatch(signed, /next\/image/);
  });

  it("logs only safe dev diagnostics for signed-image lifecycle", () => {
    const signed = readFileSync(
      join(here, "components", "MomentSignedImage.tsx"),
      "utf8",
    );
    const diagnostics = readFileSync(
      join(here, "momentMediaDevDiagnostics.ts"),
      "utf8",
    );
    assert.match(signed, /logMomentMediaDevDiagnostic/);
    assert.match(diagnostics, /hasInitialUrl/);
    assert.match(diagnostics, /refreshReturnedUrl/);
    assert.match(diagnostics, /feature: "moments"/);
    assert.doesNotMatch(diagnostics, /signedUrl|storage_path|token|caption/);
  });

  it("uses hydration-safe occurred-on formatting", () => {
    const album = readFileSync(
      join(here, "components", "MomentsAlbumScreen.tsx"),
      "utf8",
    );
    const preview = readFileSync(
      join(here, "components", "MomentsPreviewCard.tsx"),
      "utf8",
    );
    const detail = readFileSync(
      join(here, "components", "MomentDetailScreen.tsx"),
      "utf8",
    );
    assert.match(album, /formatOccurredOnShort/);
    assert.match(preview, /formatOccurredOnShort/);
    assert.match(detail, /formatOccurredOnLong/);
    assert.doesNotMatch(album, /toLocaleDateString/);
    assert.doesNotMatch(preview, /toLocaleDateString/);
    assert.doesNotMatch(detail, /toLocaleDateString/);
  });
});

describe("Baby Moments UI — preview card layout", () => {
  const preview = readFileSync(
    join(here, "components", "MomentsPreviewCard.tsx"),
    "utf8",
  );

  it("uses a horizontal featured row for a single ready photo", () => {
    assert.match(preview, /photoCount === 1/);
    assert.match(preview, /FeaturedPreviewRow/);
    assert.match(preview, /min-\[340px\]:flex-row/);
    assert.match(preview, /aspect="portrait"/);
    assert.match(preview, /w-24 shrink-0 sm:w-28/);
  });

  it("shows caption clamped to two lines beside the thumbnail", () => {
    assert.match(preview, /line-clamp-2/);
    assert.match(preview, /previewPrimaryText/);
    assert.match(preview, /previewMetaLine/);
  });

  it("keeps a compact empty state with count label and add button", () => {
    assert.match(preview, /photoCount === 0/);
    assert.match(preview, /PreviewEmptyBody/);
    assert.match(preview, /The little things worth keeping\./);
    assert.doesNotMatch(preview, /MomentsEmptyState/);
    assert.doesNotMatch(preview, /grid-cols-3/);
  });

  it("stacks preview content below 340px without horizontal overflow", () => {
    assert.match(preview, /min-w-0 overflow-hidden/);
    assert.match(preview, /min-\[340px\]:flex-row/);
    assert.match(preview, /flex-col/);
  });

  it("separates thumbnail, caption, and add button without overlap", () => {
    assert.match(preview, /border-t border-white\/\[0\.06\]/);
    assert.match(preview, /min-h-11/);
    assert.match(preview, /Add a moment/);
  });

  it("limits multi-photo preview to two compact thumbnails plus overflow copy", () => {
    assert.match(preview, /MultiPreviewRow/);
    assert.match(preview, /slice\(0, 2\)/);
    assert.match(preview, /more in album/);
  });

  it("keeps View all and ready-only count label in the header", () => {
    assert.match(preview, /View all/);
    assert.match(preview, /formatMomentPhotoCount\(photoCount\)/);
    assert.match(preview, /PreviewHeader/);
  });
});

describe("Baby Moments UI — privacy", () => {
  it("does not log signed URLs in markup helpers", () => {
    assert.equal(
      shouldExposeSignedUrlInMarkup("https://example.supabase.co/storage/v1/object/sign/bucket/path?token=abc"),
      true,
    );
    assert.equal(shouldExposeSignedUrlInMarkup("Private moment photo"), false);
  });

  it("keeps signed upload URL out of rendered markup", () => {
    const src = readFileSync(join(here, "components", "NewMomentScreen.tsx"), "utf8");
    assert.match(src, /fetch\(slot\.data\.signedUploadUrl/);
    assert.doesNotMatch(src, /\{slot\.data\.signedUploadUrl\}/);
    assert.doesNotMatch(src, /originalPath/);
    assert.doesNotMatch(src, /storage_path/);
  });

  it("never renders storage paths in album, preview, or signed image markup", () => {
    for (const file of [
      "MomentMediaTile.tsx",
      "MomentSignedImage.tsx",
      "MomentsAlbumScreen.tsx",
      "MomentsPreviewCard.tsx",
      "MomentDetailScreen.tsx",
    ]) {
      const src = readFileSync(join(here, "components", file), "utf8");
      assert.doesNotMatch(src, /storage_path/);
      assert.doesNotMatch(src, /thumbnail_path/);
      assert.doesNotMatch(src, /display\.webp/);
      assert.doesNotMatch(src, /moments-private/);
    }
  });
});

describe("Baby Moments UI — derived age display", () => {
  it("formats age at occurred date for album items", () => {
    const result = formatBabyAgeAtDate({
      dateOfBirth: "2024-01-15",
      dueDate: null,
      occurredOn: "2024-04-20",
    });
    assert.equal(result.kind, "exact");
    assert.match(result.label ?? "", /month/);
  });
});

describe("Baby Moments UI — access control", () => {
  it("returns notFound when moment is not linked to baby", () => {
    const pages = readFileSync(join(here, "server", "pages.tsx"), "utf8");
    assert.match(pages, /verifyMomentAccess/);
    assert.match(pages, /notFound\(\)/);
  });

  it("loads baby only within authenticated parent family", () => {
    const access = readFileSync(join(here, "access.ts"), "utf8");
    assert.match(access, /\.eq\("family_id", familyId\)/);
    assert.match(access, /\.is\("deleted_at", null\)/);
  });
});
