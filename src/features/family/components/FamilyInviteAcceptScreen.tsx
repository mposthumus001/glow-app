"use client";

import Link from "next/link";
import { useTransition } from "react";

import { AuthShell } from "@/components/auth/AuthShell";
import { GlowButton } from "@/components/ui";
import { safeAuthNextPath } from "@/lib/auth/safe-auth-next";
import { createClient } from "@/lib/supabase/client";

import { buildInvitePath } from "../inviteUtils";
import type { InviteAcceptCategory } from "../types";

export type FamilyInviteAcceptScreenProps = {
  token: string;
  state:
    | "invalid"
    | "email_mismatch"
    | "expired"
    | "revoked"
    | "unavailable";
  message?: string;
};

export function FamilyInviteAcceptScreen({
  token,
  state,
  message,
}: FamilyInviteAcceptScreenProps) {
  const invitePath = safeAuthNextPath(buildInvitePath(token), "/family");

  const displayMessage = message ?? defaultMessage(state);

  return (
    <AuthShell
      title="Family invitation"
      subtitle="Private family album on Glow."
    >
      <p
        className="text-sm leading-relaxed text-glow-text-secondary"
        role="status"
      >
        {displayMessage}
      </p>

      {state === "email_mismatch" ? (
        <div className="mt-5">
          <InviteSignOutButton invitePath={invitePath} />
        </div>
      ) : null}

      {state === "expired" ||
      state === "revoked" ||
      state === "invalid" ||
      state === "unavailable" ? (
        <p className="mt-4 text-sm text-glow-text-tertiary">
          If you think this is a mistake, ask the family owner to send a new
          invitation.
        </p>
      ) : null}

      <div className="mt-5">
        <Link href="/family">
          <GlowButton type="button" variant="secondary" fullWidth className="min-h-11">
            Go to Family
          </GlowButton>
        </Link>
      </div>
    </AuthShell>
  );
}

function defaultMessage(state: InviteAcceptCategory | "signed_out"): string {
  switch (state) {
    case "email_mismatch":
      return "This invitation was sent to a different email address.";
    case "expired":
      return "This invitation has expired. Ask the family owner for a new one.";
    case "revoked":
      return "This invitation is no longer available.";
    case "invalid":
    case "unavailable":
      return "This invitation is no longer available.";
    default:
      return "This invitation is no longer available.";
  }
}

function InviteSignOutButton({ invitePath }: { invitePath: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <GlowButton
      type="button"
      variant="ghost"
      fullWidth
      className="min-h-11"
      isLoading={isPending}
      onClick={() =>
        startTransition(async () => {
          const supabase = createClient();
          await supabase.auth.signOut();
          window.location.href = `/login?next=${encodeURIComponent(invitePath)}`;
        })
      }
    >
      Sign out and try another email
    </GlowButton>
  );
}
