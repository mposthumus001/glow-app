import { GlowCard } from "@/components/ui";
import { GlowContainer } from "@/components/layout";
import { PageHeader } from "@/components/shell/PageHeader";
import { AtlasPrivacyForm, ProfileBackLink } from "@/features/profile";
import { requireAppUser } from "@/lib/auth/require-app-user";

export default async function AtlasPrivacyPage() {
  const { parent } = await requireAppUser();

  return (
    <div className="overflow-y-auto pt-safe">
      <GlowContainer size="md" as="div" className="pb-10 pt-6">
        <ProfileBackLink />
        <PageHeader
          title="Atlas privacy"
          subtitle="Choose how you appear on the map. Exact GPS is never shown."
        />
        <GlowCard padding="md" className="border-white/[0.08]">
          <AtlasPrivacyForm
            mapVisibility={parent.map_visibility}
            suburbArea={parent.suburb_area}
          />
        </GlowCard>
      </GlowContainer>
    </div>
  );
}
