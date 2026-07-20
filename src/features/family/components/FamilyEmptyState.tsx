import Link from "next/link";

import { GlowButton, GlowCard } from "@/components/ui";

export function FamilyEmptyState() {
  return (
    <div className="mx-auto w-full min-w-0 max-w-[520px]">
      <GlowCard padding="md" className="border-white/[0.08]">
        <div className="mx-auto flex w-full min-w-0 flex-col items-center text-center">
          <h2 className="text-lg font-semibold text-glow-text">
            Create a private family space
          </h2>
          <p className="mt-3 max-w-[32rem] text-base leading-relaxed text-glow-text-secondary">
            Invite the people you trust into a calm shared album — only what you
            choose to share appears here.
          </p>
          <div className="mt-6 flex w-full justify-center">
            <Link
              href="/family/new"
              className="inline-flex w-full max-w-sm justify-center sm:w-auto"
            >
              <GlowButton
                variant="primary"
                size="lg"
                fullWidth
                className="min-h-11 sm:w-auto sm:min-w-[12rem]"
              >
                Create a family
              </GlowButton>
            </Link>
          </div>
        </div>
      </GlowCard>
    </div>
  );
}
