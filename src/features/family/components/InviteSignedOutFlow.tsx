"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AuthShell } from "@/components/auth/AuthShell";
import { GlowButton } from "@/components/ui";
import { safeAuthNextPath } from "@/lib/auth/safe-auth-next";
import { createClient } from "@/lib/supabase/client";

import { acceptSharedFamilyInviteAction } from "../actions";
import { buildInvitePath } from "../inviteUtils";
import type { InviteAcceptCategory } from "../types";
import { mapInviteAcceptMessage } from "../validation";

import { FamilyInviteAcceptScreen } from "./FamilyInviteAcceptScreen";
import type { FamilyInviteAcceptScreenProps } from "./FamilyInviteAcceptScreen";

type Phase = "signed_out" | "accepting" | "resolved";

type ResolvedInviteState = FamilyInviteAcceptScreenProps["state"];

function mapCategoryToScreenState(
  category: InviteAcceptCategory,
): ResolvedInviteState {
  switch (category) {
    case "email_mismatch":
      return "email_mismatch";
    case "expired":
      return "expired";
    case "revoked":
      return "revoked";
    case "invalid":
      return "invalid";
    default:
      return "unavailable";
  }
}

export type InviteSignedOutFlowProps = {
  token: string;
};

/**
 * Signed-out invite landing with post-login acceptance for existing accounts.
 *
 * After password sign-in the browser may hold a session before the next server
 * render sees auth cookies. When a client session exists, accept via server
 * action (POST carries cookies) instead of waiting for a full SSR reload loop.
 */
export function InviteSignedOutFlow({ token }: InviteSignedOutFlowProps) {
  const invitePath = safeAuthNextPath(buildInvitePath(token), "/family");
  const loginHref = `/login?next=${encodeURIComponent(invitePath)}`;
  const signupHref = `/signup?next=${encodeURIComponent(invitePath)}`;

  const [phase, setPhase] = useState<Phase>("signed_out");
  const [resolvedState, setResolvedState] = useState<ResolvedInviteState>("unavailable");
  const [resolvedMessage, setResolvedMessage] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || cancelled) {
        return;
      }

      setPhase("accepting");

      const result = await acceptSharedFamilyInviteAction(token);

      if (cancelled) return;

      if (result.ok) {
        window.location.assign(`/family/${result.sharedFamilyId}`);
        return;
      }

      setResolvedState(mapCategoryToScreenState(result.category));
      setResolvedMessage(result.error);
      setPhase("resolved");
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  if (phase === "accepting") {
    return (
      <AuthShell
        title="Family invitation"
        subtitle="Private family album on Glow."
      >
        <p
          className="text-sm leading-relaxed text-glow-text-secondary"
          role="status"
          aria-live="polite"
        >
          Accepting your invitation…
        </p>
      </AuthShell>
    );
  }

  if (phase === "resolved") {
    return (
      <FamilyInviteAcceptScreen
        token={token}
        state={resolvedState}
        message={resolvedMessage ?? mapInviteAcceptMessage(resolvedState)}
      />
    );
  }

  return (
    <AuthShell
      title="Family invitation"
      subtitle="You've been invited to a private family space in Glow."
    >
      <p className="text-sm leading-relaxed text-glow-text-secondary">
        Sign in or create an account with the email address that received this
        invitation.
      </p>
      <div className="mt-5 flex flex-col gap-3">
        <Link href={loginHref}>
          <GlowButton type="button" variant="primary" fullWidth className="min-h-11">
            Sign in
          </GlowButton>
        </Link>
        <Link href={signupHref}>
          <GlowButton type="button" variant="secondary" fullWidth className="min-h-11">
            Create account
          </GlowButton>
        </Link>
      </div>
    </AuthShell>
  );
}
