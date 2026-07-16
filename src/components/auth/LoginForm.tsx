"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { AuthShell } from "@/components/auth/AuthShell";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { GlowButton, GlowInput } from "@/components/ui";
import { PASSWORD_RESET_SUCCESS_MESSAGE } from "@/lib/auth/password-recovery";
import { createClient } from "@/lib/supabase/client";
import { calmAuthErrorMessage } from "@/lib/errors/calm-messages";

export function LoginForm({
  passwordResetSuccess = false,
}: {
  passwordResetSuccess?: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    startTransition(async () => {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(calmAuthErrorMessage(signInError.message));
        return;
      }

      router.replace("/");
      router.refresh();
    });
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Private beta — sign in with your invited email."
      footer={
        <>
          Invited to the private beta?{" "}
          <Link
            href="/signup"
            className="font-medium text-glow-primary-light hover:underline"
          >
            Create your account
          </Link>
        </>
      }
    >
      {passwordResetSuccess ? (
        <p
          className="mb-4 rounded-glow-input bg-glow-primary/10 px-3 py-2 text-sm text-glow-primary-light"
          role="status"
        >
          {PASSWORD_RESET_SUCCESS_MESSAGE}
        </p>
      ) : null}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <GlowInput
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@email.com"
        />
        <GlowInput
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          minLength={6}
          placeholder="••••••••"
        />
        {error ? (
          <p className="rounded-glow-input bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        ) : null}
        <GlowButton type="submit" fullWidth isLoading={isPending}>
          Sign in
        </GlowButton>
      </form>
      <ForgotPasswordForm />
    </AuthShell>
  );
}
