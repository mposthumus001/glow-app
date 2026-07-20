import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import { getAppNavItems, resolveActiveNav } from "../../components/shell/nav.ts";
import { isFamilyAlbumEnabled } from "./config.ts";
import { formatFamilyDate } from "./formatFamilyDate.ts";
import { buildSharedFamilyListItems } from "./queries.ts";
import {
  mapFamilyRpcError,
  validateCreateSharedFamilyInput,
} from "./validation.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..", "..");

function readSrc(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}

describe("isFamilyAlbumEnabled", () => {
  it("1. Family nav hidden when flag is off", () => {
    assert.equal(isFamilyAlbumEnabled({}), false);
    const items = getAppNavItems({ NEXT_PUBLIC_FAMILY_ALBUM_ENABLED: "false" });
    assert.equal(
      items.some((item) => item.id === "family"),
      false,
    );
  });

  it("2. Family nav visible when flag is on", () => {
    assert.equal(
      isFamilyAlbumEnabled({ NEXT_PUBLIC_FAMILY_ALBUM_ENABLED: "true" }),
      true,
    );
    const items = getAppNavItems({ NEXT_PUBLIC_FAMILY_ALBUM_ENABLED: "true" });
    assert.equal(
      items.some((item) => item.id === "family" && item.href === "/family"),
      true,
    );
    assert.equal(
      items.some((item) => item.href.includes("/baby/") && item.id === "family"),
      false,
    );
    const ids = items.map((item) => item.id);
    assert.equal(ids.indexOf("family"), ids.indexOf("baby") + 1);
  });
});

describe("family routes gate", () => {
  it("3. Disabled route is unavailable", () => {
    const pages = readSrc("src/features/family/server/pages.tsx");
    assert.match(pages, /isFamilyAlbumEnabled\(\)/);
    assert.match(pages, /notFound\(\)/);
    assert.doesNotMatch(pages, /redirect\("\/baby"\)/);
  });
});

describe("family empty state and roles", () => {
  it("4. Empty state renders correctly", () => {
    const empty = readSrc(
      "src/features/family/components/FamilyEmptyState.tsx",
    );
    assert.match(empty, /Create a private family space/);
    assert.match(empty, /Create a family/);
    assert.doesNotMatch(empty, /comment|reaction/i);
  });

  it("5. Owned family shows Owner", () => {
    const items = buildSharedFamilyListItems({
      memberships: [
        { shared_family_id: "f1", role: "owner", status: "active" },
      ],
      families: [
        {
          id: "f1",
          name: "Parkers",
          status: "active",
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-02T00:00:00Z",
        },
      ],
      memberCounts: { f1: 1 },
    });
    assert.equal(items[0]?.roleLabel, "Owner");
  });

  it("6. Joined family shows Member", () => {
    const items = buildSharedFamilyListItems({
      memberships: [
        { shared_family_id: "f2", role: "member", status: "active" },
      ],
      families: [
        {
          id: "f2",
          name: "Cousins",
          status: "active",
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-02T00:00:00Z",
        },
      ],
      memberCounts: { f2: 3 },
    });
    assert.equal(items[0]?.roleLabel, "Member");
  });

  it("7. Removed membership is excluded", () => {
    const items = buildSharedFamilyListItems({
      memberships: [
        { shared_family_id: "f1", role: "member", status: "removed" },
        { shared_family_id: "f2", role: "owner", status: "active" },
      ],
      families: [
        {
          id: "f1",
          name: "Gone",
          status: "active",
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-02T00:00:00Z",
        },
        {
          id: "f2",
          name: "Keep",
          status: "active",
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-03T00:00:00Z",
        },
      ],
      memberCounts: { f1: 2, f2: 1 },
    });
    assert.equal(items.length, 1);
    assert.equal(items[0]?.name, "Keep");
  });

  it("8. Archived family is excluded", () => {
    const items = buildSharedFamilyListItems({
      memberships: [
        { shared_family_id: "f1", role: "owner", status: "active" },
      ],
      families: [
        {
          id: "f1",
          name: "Archived",
          status: "archived",
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-02T00:00:00Z",
        },
      ],
      memberCounts: { f1: 1 },
    });
    assert.equal(items.length, 0);
  });

  it("9. Duplicate membership joins do not duplicate cards", () => {
    const items = buildSharedFamilyListItems({
      memberships: [
        { shared_family_id: "f1", role: "owner", status: "active" },
        { shared_family_id: "f1", role: "owner", status: "active" },
      ],
      families: [
        {
          id: "f1",
          name: "Once",
          status: "active",
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-02T00:00:00Z",
        },
      ],
      memberCounts: { f1: 1 },
    });
    assert.equal(items.length, 1);
  });
});

describe("create family validation and actions", () => {
  it("10. Create form trims the name", () => {
    const parsed = validateCreateSharedFamilyInput({ name: "  Parkers  " });
    assert.equal(parsed.ok, true);
    if (parsed.ok) assert.equal(parsed.value.name, "Parkers");
  });

  it("11. Empty name is rejected", () => {
    const parsed = validateCreateSharedFamilyInput({ name: "   " });
    assert.equal(parsed.ok, false);
  });

  it("12. Overlong name is rejected", () => {
    const parsed = validateCreateSharedFamilyInput({ name: "a".repeat(81) });
    assert.equal(parsed.ok, false);
  });

  it("13. Double submit is prevented", () => {
    const screen = readSrc(
      "src/features/family/components/CreateFamilyScreen.tsx",
    );
    assert.match(screen, /submittingRef/);
    assert.match(screen, /if \(submittingRef\.current \|\| isPending\) return/);
    assert.match(screen, /disabled=\{isSaving\}/);
  });

  it("14. Successful create redirects to family detail", () => {
    const screen = readSrc(
      "src/features/family/components/CreateFamilyScreen.tsx",
    );
    assert.match(screen, /router\.push\(`\/family\/\$\{result\.data\.sharedFamilyId\}`\)/);
    assert.match(screen, /createSharedFamilyAction/);
  });

  it("15. Database errors map to safe copy", () => {
    assert.equal(
      mapFamilyRpcError("transaction_failed"),
      "Something didn't work just now. Please try again.",
    );
    assert.equal(mapFamilyRpcError("invalid_name"), "Please enter a family name.");
    assert.doesNotMatch(mapFamilyRpcError("PGRST301"), /PGRST|SQL|relation/i);
  });
});

describe("family detail access and copy", () => {
  it("16. Family detail requires active membership", () => {
    const pages = readSrc("src/features/family/server/pages.tsx");
    assert.match(pages, /getSharedFamilyDetail/);
    assert.match(pages, /if \(!family\) \{\s*notFound\(\)/);
  });

  it("17. Non-member cannot view another family", () => {
    const queries = readSrc("src/features/family/queries.ts");
    assert.match(queries, /\.eq\("parent_id", parentId\)/);
    assert.match(queries, /\.eq\("status", "active"\)/);
    assert.match(queries, /return null/);
  });

  it("18. Owner and member empty-state copy differs correctly", () => {
    const detail = readSrc(
      "src/features/family/components/FamilyDetailScreen.tsx",
    );
    assert.match(detail, /No Moments have been shared here yet\./);
    assert.match(detail, /There are no shared Moments here yet\./);
    assert.match(detail, /family\.isOwner/);
  });

  it("19. No emails or internal IDs appear in rendered markup patterns", () => {
    const home = readSrc(
      "src/features/family/components/FamilyHomeScreen.tsx",
    );
    const card = readSrc("src/features/family/components/FamilyCard.tsx");
    const detail = readSrc(
      "src/features/family/components/FamilyDetailScreen.tsx",
    );
    const empty = readSrc(
      "src/features/family/components/FamilyEmptyState.tsx",
    );
    for (const src of [home, card, detail, empty]) {
      assert.doesNotMatch(src, /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
      assert.doesNotMatch(src, /invited_email|invite_token|owner_parent_id/);
      // IDs must not be shown as visible text (keys/hrefs are fine).
      assert.doesNotMatch(src, />\s*\{family\.id\}\s*</);
      assert.doesNotMatch(src, /\{["'`]?[0-9a-f]{8}-[0-9a-f]{4}-/i);
      assert.doesNotMatch(src, /children:\s*family\.id/);
    }
  });

  it("20. Mobile layout has no horizontal overflow", () => {
    const home = readSrc(
      "src/features/family/components/FamilyHomeScreen.tsx",
    );
    const empty = readSrc(
      "src/features/family/components/FamilyEmptyState.tsx",
    );
    const create = readSrc(
      "src/features/family/components/CreateFamilyScreen.tsx",
    );
    const detail = readSrc(
      "src/features/family/components/FamilyDetailScreen.tsx",
    );
    for (const src of [home, empty, create, detail]) {
      assert.match(src, /overflow-x-hidden|min-w-0/);
    }
    assert.match(home, /overflow-x-hidden/);
    assert.match(create, /max-w-full/);
    assert.match(detail, /max-w-full/);
  });
});

describe("family home empty state layout", () => {
  it("constrains desktop page content to a centred column", () => {
    const home = readSrc(
      "src/features/family/components/FamilyHomeScreen.tsx",
    );
    assert.match(home, /max-w-\[960px\]/);
    assert.match(home, /min-w-0/);
  });

  it("centres empty-state content within a narrower inner width", () => {
    const empty = readSrc(
      "src/features/family/components/FamilyEmptyState.tsx",
    );
    assert.match(empty, /max-w-\[520px\]/);
    assert.match(empty, /items-center/);
    assert.match(empty, /text-center/);
    assert.match(empty, /justify-center/);
  });

  it("keeps the create CTA visible with an accessible tap target", () => {
    const empty = readSrc(
      "src/features/family/components/FamilyEmptyState.tsx",
    );
    assert.match(empty, /Create a family/);
    assert.match(empty, /variant="primary"/);
    assert.match(empty, /min-h-11/);
    assert.match(empty, /\/family\/new/);
  });

  it("uses full-width mobile behaviour within page gutters", () => {
    const empty = readSrc(
      "src/features/family/components/FamilyEmptyState.tsx",
    );
    assert.match(empty, /w-full min-w-0/);
    assert.match(empty, /fullWidth/);
    assert.match(empty, /sm:w-auto/);
  });
});

describe("family nav active state and dates", () => {
  it("marks Family active for nested family routes", () => {
    assert.equal(resolveActiveNav("/family"), "family");
    assert.equal(resolveActiveNav("/family/new"), "family");
    assert.equal(
      resolveActiveNav("/family/11111111-1111-1111-1111-111111111111"),
      "family",
    );
  });

  it("formats family dates hydration-safely", () => {
    assert.equal(formatFamilyDate("2026-07-20T15:30:00.000Z"), "20 Jul 2026");
  });

  it("keeps Family out of Baby Moments paths", () => {
    const nav = readSrc("src/components/shell/nav.ts");
    assert.match(nav, /href: "\/family"/);
    assert.doesNotMatch(nav, /href: "\/baby\/.*family/);
    assert.match(nav, /HeartHandshake/);
  });
});
