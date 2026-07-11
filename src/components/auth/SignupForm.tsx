"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { AuthShell } from "@/components/auth/AuthShell";
import { GlowButton, GlowInput } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { calmAuthErrorMessage } from "@/lib/errors/calm-messages";

export function SignupForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirm_password") ?? "");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    startTransition(async () => {
      const supabase = createClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        setError(calmAuthErrorMessage(signUpError.message));
        return;
      }

      // Email confirmation may be required depending on Supabase project settings.
      if (!data.session) {
        setMessage(
          "Check your email to confirm your account, then sign in.",
        );
        return;
      }

      router.replace("/onboarding");
      router.refresh();
    });
  }

  return (
    <AuthShell
      title="Join Glow"
      subtitle="A calm space for parents, awake together."
      footer={
        <>
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-glow-primary-light hover:underline"
          >
            Sign in
          </Link>
        </>
      }
    >
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
          autoComplete="new-password"
          required
          minLength={6}
          placeholder="At least 6 characters"
        />
        <GlowInput
          label="Confirm password"
          name="confirm_password"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          placeholder="••••••••"
        />
        {error ? (
          <p className="rounded-glow-input bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="rounded-glow-input bg-glow-primary-muted px-3 py-2 text-sm text-glow-primary-light">
            {message}
          </p>
        ) : null}
        <GlowButton type="submit" fullWidth isLoading={isPending}>
          Create account
        </GlowButton>
      </form>
    </AuthShell>
  );
}
