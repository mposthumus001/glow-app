"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { AuthShell } from "@/components/auth/AuthShell";
import { GlowButton, GlowInput } from "@/components/ui";
import {
  PASSWORD_RESET_PATH,
  PASSWORD_RESET_SUCCESS_MESSAGE,
  PASSWORD_RESET_SUCCESS_QUERY,
  reduceRecoveryUi,
  submitPasswordReset,
  type RecoveryUiPhase,
} from "@/lib/auth/password-recovery";
import { createClient } from "@/lib/supabase/client";

const RESOLVE_TIMEOUT_MS = 8_000;

/**
 * Dedicated password-recovery UI.
 * Never renders the normal login form.
 *
 * Success policy: update password → sign out → redirect to login with a calm message.
 */
export function ResetPasswordForm() {
  const router = useRouter();
  const [phase, setPhase] = useState<RecoveryUiPhase>("resolving");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const readyRef = useRef(false);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    function markReady() {
      if (cancelled || readyRef.current) return;
      readyRef.current = true;
      setPhase((current) => reduceRecoveryUi(current, { type: "PASSWORD_RECOVERY" }));
    }

    function markReadyFromSession() {
      if (cancelled || readyRef.current) return;
      readyRef.current = true;
      setPhase((current) => reduceRecoveryUi(current, { type: "SESSION_PRESENT" }));
    }

    // If recovery lands directly on this route with a PKCE code, hand off to callback.
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    if (code) {
      const next = encodeURIComponent(PASSWORD_RESET_PATH);
      window.location.replace(
        `/auth/callback?code=${encodeURIComponent(code)}&next=${next}`,
      );
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;

      if (event === "PASSWORD_RECOVERY") {
        markReady();
        return;
      }

      // SIGNED_IN must not enable recovery UI by itself.
      if (event === "SIGNED_IN") {
        setPhase((current) => reduceRecoveryUi(current, { type: "SIGNED_IN" }));
        return;
      }

      if (event === "INITIAL_SESSION" && session) {
        markReadyFromSession();
      }
    });

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (session) {
        markReadyFromSession();
      }
    });

    const timeoutId = window.setTimeout(() => {
      if (cancelled || readyRef.current) return;
      setPhase((current) => reduceRecoveryUi(current, { type: "RESOLVE_TIMEOUT" }));
    }, RESOLVE_TIMEOUT_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirm_password") ?? "");

    startTransition(async () => {
      const supabase = createClient();
      const result = await submitPasswordReset(
        {
          hasRecoverySession: async () => {
            const { data } = await supabase.auth.getSession();
            return Boolean(data.session);
          },
          updateUser: (args) => supabase.auth.updateUser(args),
          signOut: () => supabase.auth.signOut(),
        },
        password,
        confirmPassword,
      );

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setPhase((current) => reduceRecoveryUi(current, { type: "SUCCESS" }));
      router.replace(`/login?${PASSWORD_RESET_SUCCESS_QUERY}`);
      router.refresh();
    });
  }

  if (phase === "resolving") {
    return (
      <AuthShell
        title="Checking your reset link"
        subtitle="One moment while Glow opens a secure password reset."
      >
        <p className="text-sm text-glow-text-secondary" role="status">
          Verifying your recovery session…
        </p>
      </AuthShell>
    );
  }

  if (phase === "invalid") {
    return (
      <AuthShell
        title="Reset link unavailable"
        subtitle="This link may have expired or already been used."
        footer={
          <Link
            href="/login"
            className="font-medium text-glow-primary-light hover:underline"
          >
            Back to sign in
          </Link>
        }
      >
        <p className="text-sm leading-relaxed text-glow-text-secondary" role="alert">
          Request a fresh reset link from the sign-in page. Links expire for your
          safety.
        </p>
      </AuthShell>
    );
  }

  if (phase === "success") {
    return (
      <AuthShell
        title="Password updated"
        subtitle="You can sign in with your new password."
      >
        <p className="text-sm text-glow-success" role="status">
          {PASSWORD_RESET_SUCCESS_MESSAGE}
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Choose a new password"
      subtitle="You opened a secure reset link. Enter a new password below."
      footer={
        <Link
          href="/login"
          className="font-medium text-glow-primary-light hover:underline"
        >
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <GlowInput
          label="New password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          placeholder="••••••••"
        />
        <GlowInput
          label="Confirm new password"
          name="confirm_password"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          placeholder="••••••••"
        />
        {error ? (
          <p
            className="rounded-glow-input bg-red-500/10 px-3 py-2 text-sm text-red-300"
            role="alert"
          >
            {error}
          </p>
        ) : null}
        <GlowButton type="submit" fullWidth isLoading={isPending} disabled={isPending}>
          Save new password
        </GlowButton>
      </form>
    </AuthShell>
  );
}
