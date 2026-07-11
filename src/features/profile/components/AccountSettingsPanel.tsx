"use client";

import { useActionState, useState, useTransition } from "react";

import { LogoutButton } from "@/components/auth/LogoutButton";
import { GlowButton, GlowInput, GlowTextarea } from "@/components/ui";
import {
  cancelAccountDeletion,
  requestAccountDeletion,
  sendPasswordResetEmail,
  type ProfileActionState,
} from "@/features/profile/actions";

const initial: ProfileActionState = {};

export function AccountSettingsPanel({
  email,
  appVersion,
  pendingDeletion,
}: {
  email: string | null;
  appVersion: string;
  pendingDeletion: boolean;
}) {
  const [deleteState, deleteAction, deletePending] = useActionState(
    requestAccountDeletion,
    initial,
  );
  const [cancelState, cancelAction, cancelPending] = useActionState(
    cancelAccountDeletion,
    initial,
  );
  const [resetPending, startReset] = useTransition();
  const [resetMessage, setResetMessage] = useState<ProfileActionState>({});

  return (
    <div className="space-y-8">
      <section aria-labelledby="account-email-heading">
        <h2
          id="account-email-heading"
          className="text-base font-semibold text-glow-text"
        >
          Email
        </h2>
        <p className="mt-2 break-all text-sm text-glow-text-secondary">
          {email ?? "No email on this account."}
        </p>
        <p className="mt-1 text-xs text-glow-text-tertiary">
          Only visible to you on this page.
        </p>
      </section>

      <section aria-labelledby="password-heading">
        <h2
          id="password-heading"
          className="text-base font-semibold text-glow-text"
        >
          Password
        </h2>
        <p className="mt-2 text-sm text-glow-text-secondary">
          We’ll email a secure reset link. Glow never shows or stores your
          password in the app.
        </p>
        <GlowButton
          type="button"
          variant="secondary"
          className="mt-4"
          isLoading={resetPending}
          disabled={!email}
          onClick={() =>
            startReset(async () => {
              const result = await sendPasswordResetEmail();
              setResetMessage(result);
            })
          }
        >
          Email me a reset link
        </GlowButton>
        {resetMessage.error ? (
          <p className="mt-3 text-sm text-glow-error" role="alert">
            {resetMessage.error}
          </p>
        ) : null}
        {resetMessage.success ? (
          <p className="mt-3 text-sm text-glow-success" role="status">
            {resetMessage.success}
          </p>
        ) : null}
      </section>

      <section aria-labelledby="session-heading">
        <h2
          id="session-heading"
          className="text-base font-semibold text-glow-text"
        >
          Session
        </h2>
        <p className="mt-2 text-sm text-glow-text-secondary">
          Sign out on this device when you’re done.
        </p>
        <div className="mt-4">
          <LogoutButton />
        </div>
      </section>

      <section aria-labelledby="version-heading">
        <h2
          id="version-heading"
          className="text-base font-semibold text-glow-text"
        >
          App version
        </h2>
        <p className="mt-2 text-sm text-glow-text-secondary">
          Glow {appVersion}
          {process.env.NODE_ENV !== "production" ? " · development" : ""}
        </p>
      </section>

      <section
        aria-labelledby="deletion-heading"
        className="rounded-glow-card border border-white/[0.08] p-5"
      >
        <h2
          id="deletion-heading"
          className="text-base font-semibold text-glow-text"
        >
          Account deletion
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-glow-text-secondary">
          During private beta, deletion is a request we process manually. Your
          Circle messages, presence, and baby logs may be retained until
          processing completes. Exact GPS is never stored.
        </p>

        {pendingDeletion ? (
          <form action={cancelAction} className="mt-5 space-y-3">
            <p className="text-sm text-glow-accent" role="status">
              You have a pending deletion request.
            </p>
            {cancelState.error ? (
              <p className="text-sm text-glow-error" role="alert">
                {cancelState.error}
              </p>
            ) : null}
            {cancelState.success ? (
              <p className="text-sm text-glow-success" role="status">
                {cancelState.success}
              </p>
            ) : null}
            <GlowButton
              type="submit"
              variant="secondary"
              isLoading={cancelPending}
            >
              Cancel request
            </GlowButton>
          </form>
        ) : (
          <form action={deleteAction} className="mt-5 flex flex-col gap-4">
            <GlowTextarea
              label="Optional reason"
              name="reason"
              maxLength={500}
              rows={3}
              hint="Helps us improve — never shared publicly."
            />
            <GlowInput
              label="Type DELETE to confirm"
              name="confirm"
              required
              autoComplete="off"
              hint="This does not delete your account immediately."
            />
            {deleteState.error ? (
              <p className="text-sm text-glow-error" role="alert">
                {deleteState.error}
              </p>
            ) : null}
            {deleteState.success ? (
              <p className="text-sm text-glow-success" role="status">
                {deleteState.success}
              </p>
            ) : null}
            <GlowButton
              type="submit"
              variant="ghost"
              className="border border-glow-error/30 text-glow-error"
              isLoading={deletePending}
            >
              Request account deletion
            </GlowButton>
          </form>
        )}
      </section>
    </div>
  );
}
