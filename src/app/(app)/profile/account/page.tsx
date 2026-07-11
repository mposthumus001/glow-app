import { GlowCard } from "@/components/ui";
import { GlowContainer } from "@/components/layout";
import { PageHeader } from "@/components/shell/PageHeader";
import { AccountSettingsPanel, ProfileBackLink } from "@/features/profile";
import { requireAppUser } from "@/lib/auth/require-app-user";
import { createClient } from "@/lib/supabase/server";
import { APP_VERSION } from "@/lib/app-version";

export default async function ProfileAccountPage() {
  const { user } = await requireAppUser();
  const supabase = await createClient();

  const { data: pending } = await supabase
    .from("account_deletion_requests")
    .select("id")
    .eq("parent_id", user.id)
    .eq("status", "pending")
    .maybeSingle();

  return (
    <div className="overflow-y-auto pt-safe">
      <GlowContainer size="md" as="div" className="pb-10 pt-6">
        <ProfileBackLink />
        <PageHeader
          title="Account"
          subtitle="Email, session, password reset, and deletion requests."
        />
        <GlowCard padding="md" className="border-white/[0.08]">
          <AccountSettingsPanel
            email={user.email ?? null}
            appVersion={APP_VERSION}
            pendingDeletion={Boolean(pending)}
          />
        </GlowCard>
      </GlowContainer>
    </div>
  );
}
