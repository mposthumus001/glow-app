import { GlowCard } from "@/components/ui";
import { GlowContainer } from "@/components/layout";
import { PageHeader } from "@/components/shell/PageHeader";
import {
  ParentProfileForm,
  ProfileBackLink,
} from "@/features/profile";
import { requireAppUser } from "@/lib/auth/require-app-user";

export default async function ProfileYouPage() {
  const { parent } = await requireAppUser();

  return (
    <div className="overflow-y-auto pt-safe">
      <GlowContainer size="md" as="div" className="pb-10 pt-6">
        <ProfileBackLink />
        <PageHeader
          title="Your profile"
          subtitle="A few calm details — never a public profile."
        />
        <GlowCard padding="md" className="border-white/[0.08]">
          <ParentProfileForm
            displayName={parent.display_name}
            state={parent.state}
            feedingMethod={parent.feeding_method ?? "mixed"}
            firstChild={parent.first_child}
          />
        </GlowCard>
      </GlowContainer>
    </div>
  );
}
