import { GlowCard } from "@/components/ui";
import { GlowContainer } from "@/components/layout";
import { PageHeader } from "@/components/shell/PageHeader";
import { BabyProfileForm, ProfileBackLink } from "@/features/profile";
import { loadBabiesForFamily } from "@/features/baby";
import { requireAppUser } from "@/lib/auth/require-app-user";
import { createClient } from "@/lib/supabase/server";

export default async function ProfileBabyPage() {
  const { parent } = await requireAppUser();
  const supabase = await createClient();

  const babiesResult = parent.family_id
    ? await loadBabiesForFamily(supabase, parent.family_id)
    : { babies: [], error: null };

  const babies = babiesResult.babies.map((b) => ({
    id: b.id,
    name: b.name,
    dateOfBirth: b.dateOfBirth,
    dueDate: b.dueDate,
    feedingMethod: b.feedingMethod,
  }));

  return (
    <div className="overflow-y-auto pt-safe">
      <GlowContainer size="md" as="div" className="pb-10 pt-6">
        <ProfileBackLink />
        <PageHeader
          title="Baby profile"
          subtitle="Private to your family. Informational only — not medical advice."
        />
        <GlowCard padding="md" className="border-white/[0.08]">
          <BabyProfileForm babies={babies} />
        </GlowCard>
      </GlowContainer>
    </div>
  );
}
