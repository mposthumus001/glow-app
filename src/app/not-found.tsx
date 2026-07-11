import Link from "next/link";

import { GlowButton, GlowCard } from "@/components/ui";
import { GlowContainer } from "@/components/layout";

export default function NotFound() {
  return (
    <div className="min-h-dvh overflow-y-auto bg-glow-background pt-safe">
      <GlowContainer size="md" as="div" className="pb-10 pt-16">
        <h1 className="text-2xl font-semibold tracking-tight text-glow-text">
          This page isn&apos;t here
        </h1>
        <p className="mt-3 text-base leading-relaxed text-glow-text-secondary">
          The link may be old or mistyped. Your Glow home is still waiting.
        </p>
        <GlowCard padding="md" className="mt-8 border-white/[0.08]">
          <Link href="/">
            <GlowButton variant="primary" fullWidth>
              Back to Tonight
            </GlowButton>
          </Link>
        </GlowCard>
      </GlowContainer>
    </div>
  );
}
