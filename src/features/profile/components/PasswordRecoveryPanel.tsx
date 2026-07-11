"use client";

import { useActionState, useEffect, useState } from "react";

import { GlowButton, GlowInput } from "@/components/ui";
import {
  completePasswordReset,
  type ProfileActionState,
} from "@/features/profile/actions";
import { createClient } from "@/lib/supabase/client";

const initial: ProfileActionState = {};

/**
 * Shown after a password-recovery email link establishes a session.
 */
export function PasswordRecoveryPanel() {
  const [visible, setVisible] = useState(false);
  const [state, action, pending] = useActionState(completePasswordReset, initial);

  useEffect(() => {
    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setVisible(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <section
      aria-labelledby="password-recovery-heading"
      className="mt-6 rounded-glow-card border border-glow-primary/25 bg-glow-primary/5 p-5"
    >
      <h2
        id="password-recovery-heading"
        className="text-base font-semibold text-glow-text"
      >
        Choose a new password
      </h2>
      <p className="mt-2 text-sm text-glow-text-secondary">
        You opened a secure reset link. Enter a new password below.
      </p>

      <form action={action} className="mt-5 flex flex-col gap-4">
        <GlowInput
          label="New password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
        />
        <GlowInput
          label="Confirm new password"
          name="confirm_password"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
        />
        {state.error ? (
          <p className="text-sm text-glow-error" role="alert">
            {state.error}
          </p>
        ) : null}
        {state.success ? (
          <p className="text-sm text-glow-success" role="status">
            {state.success}
          </p>
        ) : null}
        <GlowButton type="submit" variant="primary" isLoading={pending}>
          Save new password
        </GlowButton>
      </form>
    </section>
  );
}
