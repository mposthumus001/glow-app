import Link from "next/link";

import { GlowButton, GlowCard } from "@/components/ui";

export function FamilyEmptyState() {
  return (
    <GlowCard padding="md" className="border-white/[0.08]">
      <div className="mx-auto max-w-md text-center">
        <h2 className="text-lg font-semibold text-glow-text">
          Create a private family space
        </h2>
        <p className="mt-3 text-base leading-relaxed text-glow-text-secondary">
          Invite the people you trust into a calm shared album — only what you
          choose to share appears here.
        </p>
        <div className="mt-6">
          <Link href="/family/new" className="inline-block w-full sm:w-auto">
            <GlowButton variant="primary" size="lg" fullWidth>
              Create a family
            </GlowButton>
          </Link>
        </div>
      </div>
    </GlowCard>
  );
}
