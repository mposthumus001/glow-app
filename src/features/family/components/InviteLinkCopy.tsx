"use client";

import { useCallback, useId, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";

import { GlowButton } from "@/components/ui";
import { resolveInviteUrlForCopy } from "../inviteUtils";

export type InviteLinkCopyProps = {
  inviteUrl: string;
  /** Shown once after create — explains the link cannot be retrieved later. */
  showOneTimeNotice?: boolean;
};

export function InviteLinkCopy({
  inviteUrl,
  showOneTimeNotice = true,
}: InviteLinkCopyProps) {
  const inputId = useId();
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copyUrl = useCallback(async () => {
    setCopyError(null);
    const absolute = resolveInviteUrlForCopy(
      inviteUrl,
      typeof window !== "undefined" ? window.location.origin : undefined,
    );

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(absolute);
      } else {
        setCopyError("Copy isn't available in this browser. Select the link below.");
        return;
      }

      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      setCopied(true);
      resetTimerRef.current = setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopyError("Couldn't copy just now. Select the link below.");
    }
  }, [inviteUrl]);

  const displayUrl = resolveInviteUrlForCopy(
    inviteUrl,
    typeof window !== "undefined" ? window.location.origin : undefined,
  );

  return (
    <div className="space-y-3">
      {showOneTimeNotice ? (
        <p className="text-sm leading-relaxed text-glow-text-secondary">
          Copy this link now and send it to your invitee. For security, it cannot
          be shown again after you leave this page.
        </p>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
        <input
          id={inputId}
          readOnly
          value={displayUrl}
          aria-label="Invite link"
          className="min-h-11 min-w-0 flex-1 rounded-glow-input border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-glow-text-secondary"
          onFocus={(event) => event.currentTarget.select()}
        />
        <GlowButton
          type="button"
          variant="secondary"
          size="md"
          className="min-h-11 shrink-0"
          onClick={() => void copyUrl()}
          leftIcon={
            copied ? (
              <Check className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Copy className="h-4 w-4" aria-hidden="true" />
            )
          }
        >
          {copied ? "Copied" : "Copy invite link"}
        </GlowButton>
      </div>

      {copyError ? (
        <p className="text-sm text-glow-text-tertiary" role="status">
          {copyError}
        </p>
      ) : null}
    </div>
  );
}
