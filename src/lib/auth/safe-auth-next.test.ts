import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import {
  coerceAuthNextParam,
  safeAuthNextPath,
} from "./safe-auth-next.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..", "..");

function readSrc(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}

describe("safeAuthNextPath", () => {
  it("preserves family invite paths", () => {
    const token = "a".repeat(64);
    const invitePath = `/family/invite/${token}`;
    assert.equal(safeAuthNextPath(invitePath), invitePath);
  });

  it("blocks external and protocol-relative paths", () => {
    assert.equal(safeAuthNextPath("https://evil.example/phish"), "/");
    assert.equal(safeAuthNextPath("//evil.example"), "/");
  });

  it("uses first value when next is duplicated in query string", () => {
    const invitePath = `/family/invite/${"b".repeat(64)}`;
    assert.equal(safeAuthNextPath([invitePath, "/"]), invitePath);
  });

  it("coerces array and empty next params safely", () => {
    assert.equal(coerceAuthNextParam(undefined), null);
    assert.equal(coerceAuthNextParam(["", "  "]), null);
    assert.equal(coerceAuthNextParam(["/family"]), "/family");
  });
});

describe("existing-account invite return flow", () => {
  it("sign-in link preserves exact invite path via next param", () => {
    const flow = readSrc("src/features/family/components/InviteSignedOutFlow.tsx");
    assert.match(flow, /\/login\?next=\$\{encodeURIComponent\(invitePath\)\}/);
    assert.match(flow, /buildInvitePath\(token\)/);
  });

  it("post-login client session triggers accept server action", () => {
    const flow = readSrc("src/features/family/components/InviteSignedOutFlow.tsx");
    assert.match(flow, /acceptSharedFamilyInviteAction\(token\)/);
    assert.match(flow, /supabase\.auth\.getUser\(\)/);
    assert.match(flow, /Accepting your invitation/);
    assert.doesNotMatch(flow, /console\.(log|info|debug)/);
  });

  it("successful client accept hard-navigates to family detail", () => {
    const flow = readSrc("src/features/family/components/InviteSignedOutFlow.tsx");
    assert.match(flow, /window\.location\.assign\(`\/family\/\$\{result\.sharedFamilyId\}`\)/);
  });

  it("login form flushes session before hard navigation", () => {
    const loginForm = readSrc("src/components/auth/LoginForm.tsx");
    assert.match(loginForm, /await supabase\.auth\.getSession\(\)/);
    assert.match(loginForm, /navigateAfterAuth\(nextPath\)/);
  });

  it("login page coerces next search param arrays", () => {
    const login = readSrc("src/app/login/page.tsx");
    assert.match(login, /coerceAuthNextParam/);
    assert.match(login, /next\?: string \| string\[\]/);
  });

  it("auth callback preserves validated next path on success", () => {
    const callback = readSrc("src/app/auth/callback/route.ts");
    assert.match(callback, /\$\{origin\}\$\{next\}/);
    assert.match(callback, /safeAuthNextPath\(searchParams\.get\("next"\)/);
  });

  it("wrong-account mismatch preserves invite path on sign out", () => {
    const accept = readSrc(
      "src/features/family/components/FamilyInviteAcceptScreen.tsx",
    );
    assert.match(accept, /Sign out and try another email/);
    assert.match(accept, /encodeURIComponent\(invitePath\)/);
  });

  it("server invite page still accepts when SSR session is available", () => {
    const pages = readSrc("src/features/family/server/pages.tsx");
    assert.match(pages, /acceptSharedFamilyInviteAction\(trimmed\)/);
    assert.match(pages, /redirect\(`\/family\/\$\{result\.sharedFamilyId\}`\)/);
  });

  it("signed-out SSR path does not call accept before client session check", () => {
    const pages = readSrc("src/features/family/server/pages.tsx");
    const signedOutBlock = pages.slice(
      pages.indexOf("if (!user)"),
      pages.indexOf("const { data: parent }"),
    );
    assert.doesNotMatch(signedOutBlock, /acceptSharedFamilyInviteAction/);
    assert.match(signedOutBlock, /InviteSignedOutFlow/);
  });

  it("accept action normalises token before RPC", () => {
    const actions = readSrc("src/features/family/actions.ts");
    assert.match(actions, /normalizeInviteToken\(rawToken\)/);
  });

  it("accept monitoring never includes raw token", () => {
    const actions = readSrc("src/features/family/actions.ts");
    const acceptBlock = actions.slice(
      actions.indexOf("export async function acceptSharedFamilyInviteAction"),
      actions.indexOf("export async function revokeSharedFamilyInviteAction"),
    );
    assert.doesNotMatch(acceptBlock, /reportOperationalFailure\([\s\S]*rawToken/);
    assert.doesNotMatch(acceptBlock, /invite_token_hash/);
    assert.doesNotMatch(acceptBlock, /console\.(log|info|debug)/);
  });
});
