import { GlowCard } from "@/components/ui";
import { GlowContainer } from "@/components/layout";
import { PageHeader } from "@/components/shell/PageHeader";
import { ProfileBackLink } from "@/features/profile/components/ProfileBackLink";
import { LEGAL_DRAFT_BANNER } from "@/features/profile/legal";

export function LegalDocumentPage({
  title,
  subtitle,
  sections,
}: {
  title: string;
  subtitle: string;
  sections: readonly { title: string; body: string }[];
}) {
  return (
    <div className="overflow-y-auto pt-safe">
      <GlowContainer size="md" as="div" className="pb-10 pt-6">
        <ProfileBackLink />
        <PageHeader title={title} subtitle={subtitle} />

        <GlowCard
          padding="md"
          className="mb-6 border-glow-accent/20 bg-glow-accent/[0.04]"
        >
          <p className="text-sm leading-relaxed text-glow-accent">
            {LEGAL_DRAFT_BANNER}
          </p>
        </GlowCard>

        <div className="space-y-4">
          {sections.map((section) => (
            <GlowCard
              key={section.title}
              padding="md"
              className="border-white/[0.06]"
            >
              <h2 className="text-base font-semibold text-glow-text">
                {section.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-glow-text-secondary">
                {section.body}
              </p>
            </GlowCard>
          ))}
        </div>
      </GlowContainer>
    </div>
  );
}
