"use client";

import { useState } from "react";

import { GlowButton } from "@/components/ui";

const VERIFICATION_ERROR_MESSAGE = "Glow controlled Sentry verification error";

export function SentryVerificationTrigger() {
  const [shouldThrow, setShouldThrow] = useState(false);

  if (shouldThrow) {
    throw new Error(VERIFICATION_ERROR_MESSAGE);
  }

  return (
    <GlowButton
      type="button"
      variant="ghost"
      onClick={() => setShouldThrow(true)}
    >
      Trigger Sentry test error
    </GlowButton>
  );
}
