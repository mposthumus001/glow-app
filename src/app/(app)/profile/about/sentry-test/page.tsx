// TODO: Remove /profile/about/sentry-test after Sentry verification is complete.

import { GlowCard } from "@/components/ui";
import { GlowContainer } from "@/components/layout";
import { PageHeader } from "@/components/shell/PageHeader";
import { ProfileBackLink } from "@/features/profile";
import { SentryVerificationTrigger } from "@/features/profile/components/SentryVerificationTrigger";
import { requireAppUser } from "@/lib/auth/require-app-user";

export default async function SentryVerificationPage() {
  await requireAppUser();

  return (
    <div className="overflow-y-auto pt-safe">
      <GlowContainer size="md" as="div" className="pb-10 pt-6">
        <ProfileBackLink href="/profile/about" label="Back to About" />
        <PageHeader
          title="Sentry verification"
          subtitle="Temporary route for private-beta error monitoring checks."
        />

        <GlowCard
          padding="md"
          className="mb-4 border-glow-accent/20 bg-glow-accent/[0.04]"
        >
          <p className="text-sm text-glow-accent">
            This page is for intentional test errors only. The button below
            throws a controlled error with no email, baby data, Circle content,
            or tokens. Remove this route after Sentry verification is complete.
          </p>
        </GlowCard>

        <SentryVerificationTrigger />
      </GlowContainer>
    </div>
  );
}
