"use client";

import { LogOut } from "lucide-react";
import { useTransition } from "react";

import { signOut } from "@/lib/auth/actions";
import { GlowButton } from "@/components/ui";

export function LogoutButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <GlowButton
      type="button"
      variant="ghost"
      size="sm"
      isLoading={isPending}
      leftIcon={<LogOut className="h-4 w-4" aria-hidden="true" />}
      onClick={() => startTransition(() => signOut())}
      aria-label="Sign out"
    >
      Sign Out
    </GlowButton>
  );
}
