import { Headphones } from "lucide-react";

import { GlowContainer } from "@/components/layout";
import { PageHeader } from "@/components/shell/PageHeader";
import { GlowCard } from "@/components/ui";

export function CalmSoundsPreparation() {
  return (
    <div className="overflow-y-auto">
      <GlowContainer size="sm" as="div" className="pb-10 pt-6">
        <PageHeader
          title="Sounds"
          subtitle="A quiet audio space is on its way."
        />
        <GlowCard
          padding="lg"
          className="border-glow-secondary/15 bg-gradient-to-br from-glow-secondary/[0.08] to-glow-card"
        >
          <span
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.05] text-glow-text-secondary"
            aria-hidden="true"
          >
            <Headphones className="h-5 w-5" />
          </span>
          <p className="mt-5 text-lg font-semibold leading-relaxed text-glow-text">
            Soundscapes are still being prepared for the Glow beta.
          </p>
          <p className="mt-3 max-w-prose text-sm leading-relaxed text-glow-text-secondary">
            We are taking time to make this experience gentle and reliable.
            Support exercises are available now.
          </p>
        </GlowCard>
      </GlowContainer>
    </div>
  );
}
