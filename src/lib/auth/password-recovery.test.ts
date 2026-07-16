import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildPasswordResetRedirectTo,
  mapPasswordUpdateError,
  PASSWORD_RESET_PATH,
  reduceRecoveryUi,
  submitPasswordReset,
  validateNewPassword,
} from "./password-recovery.ts";
import { safeAuthNextPath } from "./safe-auth-next.ts";

describe("buildPasswordResetRedirectTo", () => {
  it("uses /auth/reset-password as the final destination via PKCE callback", () => {
    assert.equal(
      buildPasswordResetRedirectTo("https://glow-app-six.vercel.app"),
      "https://glow-app-six.vercel.app/auth/callback?next=/auth/reset-password",
    );
    assert.equal(
      buildPasswordResetRedirectTo("http://localhost:3000/"),
      "http://localhost:3000/auth/callback?next=/auth/reset-password",
    );
    assert.match(
      buildPasswordResetRedirectTo("http://localhost:3000"),
      /\/auth\/reset-password$/,
    );
    assert.ok(
      buildPasswordResetRedirectTo("http://localhost:3000").includes(
        PASSWORD_RESET_PATH,
      ),
    );
  });
});

describe("reduceRecoveryUi", () => {
  it("PASSWORD_RECOVERY reveals the reset form", () => {
    assert.equal(
      reduceRecoveryUi("resolving", { type: "PASSWORD_RECOVERY" }),
      "ready",
    );
  });

  it("SIGNED_IN does not incorrectly trigger recovery UI", () => {
    assert.equal(
      reduceRecoveryUi("resolving", { type: "SIGNED_IN" }),
      "resolving",
    );
    assert.equal(
      reduceRecoveryUi("invalid", { type: "SIGNED_IN" }),
      "invalid",
    );
  });

  it("already-established recovery session enables the form", () => {
    assert.equal(
      reduceRecoveryUi("resolving", { type: "SESSION_PRESENT" }),
      "ready",
    );
  });

  it("missing/expired recovery session shows invalid-link state after timeout", () => {
    assert.equal(
      reduceRecoveryUi("resolving", { type: "RESOLVE_TIMEOUT" }),
      "invalid",
    );
  });

  it("SESSION_ABSENT alone does not flip ready or invalid while resolving", () => {
    assert.equal(
      reduceRecoveryUi("resolving", { type: "SESSION_ABSENT" }),
      "resolving",
    );
  });
});

describe("validateNewPassword", () => {
  it("rejects mismatched passwords", () => {
    assert.deepEqual(validateNewPassword("secret1", "secret2"), {
      ok: false,
      error: "Passwords do not match.",
    });
  });

  it("rejects short passwords", () => {
    assert.deepEqual(validateNewPassword("abc", "abc"), {
      ok: false,
      error: "Password needs at least 6 characters.",
    });
  });

  it("accepts matching passwords that meet the minimum length", () => {
    assert.deepEqual(validateNewPassword("secret1", "secret1"), {
      ok: true,
      password: "secret1",
    });
  });
});

describe("submitPasswordReset", () => {
  it("rejects mismatched passwords before calling updateUser", async () => {
    let updateCalled = false;
    const result = await submitPasswordReset(
      {
        hasRecoverySession: async () => true,
        updateUser: async () => {
          updateCalled = true;
          return { error: null };
        },
        signOut: async () => ({ error: null }),
      },
      "secret1",
      "secret2",
    );

    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error, "Passwords do not match.");
    }
    assert.equal(updateCalled, false);
  });

  it("calls updateUser for a valid password, then signs out", async () => {
    const calls: string[] = [];
    const result = await submitPasswordReset(
      {
        hasRecoverySession: async () => {
          calls.push("session");
          return true;
        },
        updateUser: async ({ password }) => {
          calls.push(`update:${password}`);
          return { error: null };
        },
        signOut: async () => {
          calls.push("signOut");
          return { error: null };
        },
      },
      "secret99",
      "secret99",
    );

    assert.deepEqual(result, { ok: true });
    assert.deepEqual(calls, ["session", "update:secret99", "signOut"]);
  });

  it("does not update when no recovery session exists", async () => {
    let updateCalled = false;
    const result = await submitPasswordReset(
      {
        hasRecoverySession: async () => false,
        updateUser: async () => {
          updateCalled = true;
          return { error: null };
        },
        signOut: async () => ({ error: null }),
      },
      "secret99",
      "secret99",
    );

    assert.equal(result.ok, false);
    assert.equal(updateCalled, false);
  });
});

describe("mapPasswordUpdateError", () => {
  it("maps rate-limit and weak-password errors calmly", () => {
    assert.match(mapPasswordUpdateError("rate limit exceeded"), /wait a moment/i);
    assert.match(mapPasswordUpdateError("Password should be at least 8 characters"), /stronger/i);
  });
});

describe("safeAuthNextPath", () => {
  it("allows the reset-password path", () => {
    assert.equal(safeAuthNextPath("/auth/reset-password"), "/auth/reset-password");
  });

  it("rejects unsafe next/callback paths", () => {
    assert.equal(safeAuthNextPath("https://evil.example"), "/");
    assert.equal(safeAuthNextPath("//evil.example"), "/");
    assert.equal(safeAuthNextPath("/\\evil.example"), "/");
    assert.equal(safeAuthNextPath("login"), "/");
    assert.equal(safeAuthNextPath("javascript:alert(1)"), "/");
    assert.equal(safeAuthNextPath("/auth/callback\n@evil.com"), "/");
  });
});
