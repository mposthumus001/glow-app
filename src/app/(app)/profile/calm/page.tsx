import { GlowCard } from "@/components/ui";
import { GlowContainer } from "@/components/layout";
import { PageHeader } from "@/components/shell/PageHeader";
import { CalmPreferencesPanel, ProfileBackLink } from "@/features/profile";
import { requireAppUser } from "@/lib/auth/require-app-user";

export default async function ProfileCalmPage() {
  await requireAppUser();

  return (
    <div className="overflow-y-auto pt-safe">
      <GlowContainer size="md" as="div" className="pb-10 pt-6">
        <ProfileBackLink />
        <PageHeader
          title="Calm preferences"
          subtitle="Device-local settings — Calm never autoplays."
        />
        <GlowCard padding="md" className="border-white/[0.08]">
          <CalmPreferencesPanel />
        </GlowCard>
      </GlowContainer>
    </div>
  );
}
