"use client";

import { Shield } from "lucide-react";

import { CRISIS_DISCLAIMER_COPY } from "@/features/circles/safety/reportLogic";
import { cn } from "@/lib/utils/cn";

export function CircleSafetyNote({ className }: { className?: string }) {
  return (
    <details
      className={cn(
        "rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3",
        className,
      )}
    >
      <summary
        className={cn(
          "flex cursor-pointer list-none items-center gap-2 text-sm",
          "text-glow-text-secondary marker:content-none",
          "[&::-webkit-details-marker]:hidden",
        )}
      >
        <Shield className="h-4 w-4 shrink-0 text-glow-primary/80" aria-hidden="true" />
        <span>Safety & support</span>
      </summary>
      <p className="mt-3 text-sm leading-relaxed text-glow-text-tertiary">
        {CRISIS_DISCLAIMER_COPY}
      </p>
      <p className="mt-2 text-xs leading-relaxed text-glow-text-tertiary">
        Reports are kept private. Glow does not automatically remove messages
        during beta — moderator review comes later.
      </p>
    </details>
  );
}
