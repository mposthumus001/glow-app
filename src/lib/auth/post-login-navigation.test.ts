import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import {
  buildAuthCallbackFailureLoginHref,
  buildLoginHrefWithNext,
  resolvePostAuthDestination,
} from "./post-login-navigation.ts";
import { safeAuthNextPath } from "./safe-auth-next.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..", "..");

function readSrc(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}

describe("post-login navigation", () => {
  it("preserves invite path through login href", () => {
    const token = "a".repeat(64);
    const invitePath = `/family/invite/${token}`;
    assert.equal(
      buildLoginHrefWithNext(invitePath),
      `/login?next=${encodeURIComponent(invitePath)}`,
    );
  });

  it("auth callback failure preserves invite next param", () => {
    const token = "b".repeat(64);
    const invitePath = `/family/invite/${token}`;
    assert.equal(
      buildAuthCallbackFailureLoginHref(invitePath),
      `/login?next=${encodeURIComponent(invitePath)}`,
    );
  });

  it("blocks external return paths", () => {
    assert.equal(resolvePostAuthDestination("https://evil.example"), "/");
    assert.equal(resolvePostAuthDestination("//evil.example"), "/");
    assert.equal(safeAuthNextPath("https://evil.example/phish"), "/");
  });

  it("allows family invite return paths", () => {
    const invitePath = `/family/invite/${"c".repeat(64)}`;
    assert.equal(resolvePostAuthDestination(invitePath), invitePath);
  });
});

describe("login form post-auth navigation", () => {
  it("uses hard navigation when next path is set", () => {
    const loginForm = readSrc("src/components/auth/LoginForm.tsx");
    assert.match(loginForm, /navigateAfterAuth\(nextPath\)/);
    assert.match(loginForm, /normalizeInviteEmail/);
  });

  it("invite signed-out screen accepts after client session is ready", () => {
    const flow = readSrc("src/features/family/components/InviteSignedOutFlow.tsx");
    assert.match(flow, /InviteSignedOutFlow/);
    assert.match(flow, /acceptSharedFamilyInviteAction/);
    assert.doesNotMatch(
      readSrc("src/features/family/components/FamilyInviteAcceptScreen.tsx"),
      /window\.location\.reload\(\)/,
    );
  });

  it("auth callback route preserves next on failure", () => {
    const callback = readSrc("src/app/auth/callback/route.ts");
    assert.match(callback, /buildAuthCallbackFailureLoginHref/);
  });
});
