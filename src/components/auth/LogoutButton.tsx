"use client";

import { LogOut } from "lucide-react";
import { useTransition } from "react";

import { signOut } from "@/lib/auth/actions";
import { getCalmPlayerService } from "@/features/calm";
import { getPresenceService } from "@/features/presence";
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
      onClick={() =>
        startTransition(async () => {
          getCalmPlayerService().handleLogout();
          await getPresenceService().markOffline();
          await signOut();
        })
      }
      aria-label="Sign out"
    >
      Sign Out
    </GlowButton>
  );
}
