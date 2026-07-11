"use client";

import { useState, useTransition } from "react";

import { GlowButton, GlowInput } from "@/components/ui";
import { sendPasswordResetEmail } from "@/features/profile/actions";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="mt-6 rounded-glow-card border border-white/[0.08] p-4">
      <h2 className="text-sm font-semibold text-glow-text">Forgot password?</h2>
      <p className="mt-1 text-sm text-glow-text-secondary">
        Enter your email and we&apos;ll send a calm reset link.
      </p>
      <form
        className="mt-4 flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          setMessage(null);
          startTransition(async () => {
            const result = await sendPasswordResetEmail(email.trim());
            if (result.error) {
              setError(result.error);
              return;
            }
            setMessage(result.success ?? "Check your email for a reset link.");
          });
        }}
      >
        <GlowInput
          label="Email"
          name="forgot_email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@email.com"
        />
        {error ? (
          <p className="text-sm text-glow-error" role="alert">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="text-sm text-glow-success" role="status">
            {message}
          </p>
        ) : null}
        <GlowButton type="submit" variant="secondary" isLoading={pending}>
          Email reset link
        </GlowButton>
      </form>
    </div>
  );
}
