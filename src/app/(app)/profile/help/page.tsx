import Link from "next/link";

import { GlowCard } from "@/components/ui";
import { GlowContainer } from "@/components/layout";
import { PageHeader } from "@/components/shell/PageHeader";
import { FeedbackForm, ProfileBackLink } from "@/features/profile";
import { requireAppUser } from "@/lib/auth/require-app-user";
import { APP_VERSION } from "@/lib/app-version";

export default async function ProfileHelpPage() {
  await requireAppUser();

  return (
    <div className="overflow-y-auto pt-safe">
      <GlowContainer size="md" as="div" className="pb-10 pt-6">
        <ProfileBackLink />
        <PageHeader
          title="Help & feedback"
          subtitle="A quiet place to tell us what would help."
        />

        <div className="mb-6 space-y-3">
          <GlowCard padding="md" className="border-white/[0.06]">
            <h2 className="text-sm font-semibold text-glow-text">
              Circle safety
            </h2>
            <p className="mt-2 text-sm text-glow-text-secondary">
              Report or hide messages inside Your Circle. See{" "}
              <Link href="/profile/safety" className="text-glow-primary underline-offset-2 hover:underline">
                Safety
              </Link>{" "}
              for crisis contacts.
            </p>
          </GlowCard>
          <GlowCard padding="md" className="border-white/[0.06]">
            <h2 className="text-sm font-semibold text-glow-text">
              Calm / audio
            </h2>
            <p className="mt-2 text-sm text-glow-text-secondary">
              If a sound won’t play, try another category, check silent mode, or
              clear Calm preferences. Background playback can be unreliable on
              some phones — that’s a known beta limit.
            </p>
          </GlowCard>
          <GlowCard padding="md" className="border-white/[0.06]">
            <h2 className="text-sm font-semibold text-glow-text">
              Baby tracking
            </h2>
            <p className="mt-2 text-sm text-glow-text-secondary">
              Baby logs are informational only — not medical advice. Edit your
              baby profile under Baby in You.
            </p>
          </GlowCard>
        </div>

        <GlowCard padding="md" className="border-white/[0.08]">
          <h2 className="mb-4 text-base font-semibold text-glow-text">
            Send feedback
          </h2>
          <FeedbackForm appVersion={APP_VERSION} routeContext="/profile/help" />
        </GlowCard>
      </GlowContainer>
    </div>
  );
}
