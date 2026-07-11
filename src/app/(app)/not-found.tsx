import Link from "next/link";

import { GlowButton, GlowCard } from "@/components/ui";
import { GlowContainer } from "@/components/layout";
import { PageHeader } from "@/components/shell/PageHeader";

export default function AppNotFound() {
  return (
    <div className="overflow-y-auto pt-safe">
      <GlowContainer size="md" as="div" className="pb-10 pt-6">
        <PageHeader
          title="This page isn't here"
          subtitle="The link may be old or mistyped. Your place in Glow is still here."
        />
        <GlowCard padding="md" className="border-white/[0.08]">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/">
              <GlowButton variant="primary" fullWidth>
                Back to Tonight
              </GlowButton>
            </Link>
            <Link href="/profile">
              <GlowButton variant="secondary" fullWidth>
                Go to You
              </GlowButton>
            </Link>
          </div>
        </GlowCard>
      </GlowContainer>
    </div>
  );
}
