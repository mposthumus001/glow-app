import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import { safeAuthNextPath } from "../../lib/auth/safe-auth-next.ts";
import {
  buildInvitePath,
  buildInviteUrl,
  isValidInviteEmail,
  isValidInviteTokenFormat,
  maskInviteEmail,
  memberDisplayName,
  normalizeInviteEmail,
} from "./inviteUtils.ts";
import { isFamilyAlbumEnabled } from "./config.ts";
import {
  mapInviteAcceptCategory,
  mapInviteAcceptMessage,
  mapInviteRpcError,
  validateCreateSharedFamilyInviteInput,
} from "./validation.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..", "..");

function readSrc(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}

describe("Sprint 9.4B — feature flag gates invite routes", () => {
  it("1. Invite accept page gates on isFamilyAlbumEnabled", () => {
    const pages = readSrc("src/features/family/server/pages.tsx");
    assert.match(pages, /renderFamilyInviteAcceptPage/);
    assert.match(pages, /isFamilyAlbumEnabled\(\)/);
    assert.match(pages, /notFound\(\)/);
  });

  it("2. Members page gates on isFamilyAlbumEnabled", () => {
    const pages = readSrc("src/features/family/server/pages.tsx");
    assert.match(pages, /renderFamilyMembersPage/);
    assert.match(pages, /isFamilyAlbumEnabled\(\)/);
  });

  it("3. Disabled flag returns unavailable from actions", () => {
    assert.equal(isFamilyAlbumEnabled({}), false);
    const actions = readSrc("src/features/family/actions.ts");
    assert.match(actions, /Family Album is not available yet/);
    assert.match(actions, /isFamilyAlbumEnabled\(\)/);
  });
});

describe("Sprint 9.4B — owner members page access", () => {
  it("4. Members page requires owner via getSharedFamilyMembersPageData", () => {
    const queries = readSrc("src/features/family/queries.ts");
    assert.match(queries, /getSharedFamilyMembersPageData/);
    assert.match(queries, /if \(!family\?\.isOwner\) return null/);
  });

  it("5. Non-owner receives notFound on members route", () => {
    const pages = readSrc("src/features/family/server/pages.tsx");
    assert.match(pages, /if \(!data\) \{\s*notFound\(\)/);
  });

  it("6. Owner detail shows Manage members link only for owners", () => {
    const detail = readSrc(
      "src/features/family/components/FamilyDetailScreen.tsx",
    );
    assert.match(detail, /family\.isOwner/);
    assert.match(detail, /\/family\/\$\{family\.id\}\/members/);
    assert.match(detail, /Manage members/);
  });
});

describe("Sprint 9.4B — invite email validation", () => {
  it("7. Trims and normalises invite email", () => {
    assert.equal(normalizeInviteEmail("  User@Example.COM  "), "user@example.com");
    const parsed = validateCreateSharedFamilyInviteInput({
      sharedFamilyId: "11111111-1111-1111-1111-111111111111",
      email: "  user@example.com  ",
    });
    assert.equal(parsed.ok, true);
    if (parsed.ok) assert.equal(parsed.value.email, "user@example.com");
  });

  it("8. Rejects empty email", () => {
    const parsed = validateCreateSharedFamilyInviteInput({
      sharedFamilyId: "11111111-1111-1111-1111-111111111111",
      email: "   ",
    });
    assert.equal(parsed.ok, false);
  });

  it("9. Rejects invalid email format", () => {
    assert.equal(isValidInviteEmail("not-an-email"), false);
    const parsed = validateCreateSharedFamilyInviteInput({
      sharedFamilyId: "11111111-1111-1111-1111-111111111111",
      email: "not-an-email",
    });
    assert.equal(parsed.ok, false);
  });

  it("10. Rejects self-invite without account enumeration", () => {
    const parsed = validateCreateSharedFamilyInviteInput({
      sharedFamilyId: "11111111-1111-1111-1111-111111111111",
      email: "owner@example.com",
      authEmail: "owner@example.com",
    });
    assert.equal(parsed.ok, false);
    if (!parsed.ok) {
      assert.match(parsed.error, /can't invite your own email/i);
      assert.doesNotMatch(parsed.error, /already exists|registered/i);
    }
  });
});

describe("Sprint 9.4B — invite RPC error mapping", () => {
  it("11. Duplicate pending invite uses calm copy", () => {
    assert.equal(
      mapInviteRpcError("invite_pending"),
      "An invitation is already pending for that email.",
    );
  });

  it("12. Already member uses safe copy", () => {
    assert.equal(
      mapInviteRpcError("already_member"),
      "That person is already in this family.",
    );
  });

  it("13. Forbidden maps to family not found", () => {
    assert.equal(mapInviteRpcError("forbidden"), "That family could not be found.");
    assert.doesNotMatch(mapInviteRpcError("forbidden"), /SQL|PGRST/i);
  });
});

describe("Sprint 9.4B — email masking and token format", () => {
  it("14. Masks invite email for pending list", () => {
    assert.equal(maskInviteEmail("morgan@example.com"), "m•••••@example.com");
  });

  it("15. Never exposes full email in masked output for long local parts", () => {
    const masked = maskInviteEmail("verylonglocal@example.com");
    assert.doesNotMatch(masked, /verylonglocal/);
    assert.match(masked, /@example\.com$/);
  });

  it("16. Accepts 64-char hex invite tokens", () => {
    const token = "a".repeat(64);
    assert.equal(isValidInviteTokenFormat(token), true);
  });

  it("17. Rejects malformed invite tokens", () => {
    assert.equal(isValidInviteTokenFormat(""), false);
    assert.equal(isValidInviteTokenFormat("abc"), false);
    assert.equal(isValidInviteTokenFormat("g".repeat(64)), false);
  });
});

describe("Sprint 9.4B — invite URL construction", () => {
  it("18. Builds relative invite path", () => {
    const token = "b".repeat(64);
    assert.equal(buildInvitePath(token), `/family/invite/${token}`);
  });

  it("19. Builds absolute invite URL from site env", () => {
    const token = "c".repeat(64);
    assert.equal(
      buildInviteUrl("https://glow.example", token),
      `https://glow.example/family/invite/${token}`,
    );
  });

  it("20. Falls back to relative path when site URL missing", () => {
    const token = "d".repeat(64);
    assert.equal(buildInviteUrl(undefined, token), `/family/invite/${token}`);
  });
});

describe("Sprint 9.4B — raw token handling", () => {
  it("21. Create action exposes raw token only in immediate action result", () => {
    const actions = readSrc("src/features/family/actions.ts");
    assert.match(actions, /rawToken: result\.invite_token/);
    assert.doesNotMatch(actions, /localStorage|sessionStorage/);
    assert.doesNotMatch(actions, /console\.(log|info|debug)/);
  });

  it("22. InviteLinkCopy documents one-time link visibility", () => {
    const copy = readSrc("src/features/family/components/InviteLinkCopy.tsx");
    assert.match(copy, /cannot\s+be shown again/i);
    assert.match(copy, /Copy invite link/);
  });

  it("23. Members screen keeps created invite in React state only", () => {
    const members = readSrc(
      "src/features/family/components/FamilyMembersScreen.tsx",
    );
    assert.match(members, /useState<CreateInviteResultData/);
    assert.doesNotMatch(members, /localStorage|sessionStorage/);
  });
});

describe("Sprint 9.4B — member roster privacy", () => {
  it("24. Falls back to Family member without display name", () => {
    assert.equal(memberDisplayName(null), "Family member");
    assert.equal(memberDisplayName("New parent"), "Family member");
  });

  it("25. Uses trimmed display name when present", () => {
    assert.equal(memberDisplayName("  Alex  "), "Alex");
  });

  it("26. Active members list does not expose member emails", () => {
    const members = readSrc(
      "src/features/family/components/FamilyMembersScreen.tsx",
    );
    assert.match(members, /member\.displayName/);
    assert.doesNotMatch(members, /invited_email/);
    assert.doesNotMatch(members, /member\.email/);
  });

  it("27. Pending invites show masked email only", () => {
    const members = readSrc(
      "src/features/family/components/FamilyMembersScreen.tsx",
    );
    assert.match(members, /invite\.maskedEmail/);
    assert.doesNotMatch(members, /invited_email_normalized/);
  });
});

describe("Sprint 9.4B — revoke and remove confirmations", () => {
  it("28. Revoke invite uses confirmation dialog", () => {
    const members = readSrc(
      "src/features/family/components/FamilyMembersScreen.tsx",
    );
    assert.match(members, /Revoke invitation\?/);
    assert.match(members, /revokeSharedFamilyInviteAction/);
  });

  it("29. Remove member uses confirmation dialog", () => {
    const members = readSrc(
      "src/features/family/components/FamilyMembersScreen.tsx",
    );
    assert.match(members, /Remove member\?/);
    assert.match(members, /removeSharedFamilyMemberAction/);
  });

  it("30. UI hides remove for self and owner role", () => {
    const members = readSrc(
      "src/features/family/components/FamilyMembersScreen.tsx",
    );
    assert.match(members, /member\.parentId !== currentUserId/);
    assert.match(members, /member\.role !== "owner"/);
  });
});

describe("Sprint 9.4B — invite acceptance flow", () => {
  it("31. Signed-out visitors see auth CTAs without processing token", () => {
    const accept = readSrc(
      "src/features/family/components/FamilyInviteAcceptScreen.tsx",
    );
    const pages = readSrc("src/features/family/server/pages.tsx");
    assert.match(accept, /state === "signed_out"/);
    assert.match(accept, /Sign in/);
    assert.match(accept, /Create account/);
    assert.match(pages, /state="signed_out"/);
    assert.match(pages, /if \(!user\)/);
    assert.doesNotMatch(accept, /family\.name/);
  });

  it("32. Successful accept redirects to family detail", () => {
    const pages = readSrc("src/features/family/server/pages.tsx");
    assert.match(pages, /redirect\(`\/family\/\$\{result\.sharedFamilyId\}`\)/);
    assert.match(pages, /acceptSharedFamilyInviteAction/);
  });

  it("33. Email mismatch shows sign-out option", () => {
    const accept = readSrc(
      "src/features/family/components/FamilyInviteAcceptScreen.tsx",
    );
    assert.match(accept, /email_mismatch/);
    assert.match(accept, /different email address/);
    assert.match(accept, /Sign out and try another email/);
  });

  it("34. Invalid token format avoids RPC call", () => {
    const pages = readSrc("src/features/family/server/pages.tsx");
    assert.match(pages, /if \(!isValidInviteTokenFormat\(trimmed\)\)/);
    assert.match(pages, /state="invalid"/);
  });
});

describe("Sprint 9.4B — auth redirect preservation", () => {
  it("35. Preserves invite path through login safely", () => {
    const token = "e".repeat(64);
    const invitePath = `/family/invite/${token}`;
    assert.equal(safeAuthNextPath(invitePath), invitePath);

    const login = readSrc("src/app/login/page.tsx");
    const loginForm = readSrc("src/components/auth/LoginForm.tsx");
    const onboarding = readSrc("src/lib/auth/complete-onboarding.ts");

    assert.match(login, /safeAuthNextPath\(params\.next\)/);
    assert.match(loginForm, /safeAuthNextPath\(nextPath\)/);
    assert.match(onboarding, /safeAuthNextPath\(asString\(formData, "next"\)\)/);
    assert.equal(safeAuthNextPath("https://evil.example/phish"), "/");
    assert.equal(safeAuthNextPath("//evil.example"), "/");
  });
});

describe("Sprint 9.4B — monitoring and accept categories", () => {
  it("36. Accept failures report safe response categories only", () => {
    const actions = readSrc("src/features/family/actions.ts");
    const acceptBlock = actions.slice(
      actions.indexOf("export async function acceptSharedFamilyInviteAction"),
      actions.indexOf("export async function revokeSharedFamilyInviteAction"),
    );
    assert.match(acceptBlock, /responseCategory: category/);
    assert.match(acceptBlock, /featureArea: "family"/);
    assert.match(acceptBlock, /operation: "accept_shared_family_invite"/);
    assert.doesNotMatch(acceptBlock, /reportOperationalFailure\([\s\S]*rawToken/);
    assert.doesNotMatch(acceptBlock, /invite_token_hash/);
  });

  it("37. Invite accept maps invalid_invite to email_mismatch when authenticated", () => {
    assert.equal(mapInviteAcceptCategory("invalid_invite", true), "email_mismatch");
    assert.equal(mapInviteAcceptCategory("invalid_invite", false), "invalid");
    assert.equal(
      mapInviteAcceptMessage("email_mismatch"),
      "This invitation was sent to a different email address.",
    );
  });
});
