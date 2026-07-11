import Link from "next/link";

import { GlowCard } from "@/components/ui";
import { GlowContainer } from "@/components/layout";
import { PageHeader } from "@/components/shell/PageHeader";
import { ProfileBackLink } from "@/features/profile";
import { ABOUT_MISSION, LEGAL_DRAFT_BANNER } from "@/features/profile/legal";
import { requireAppUser } from "@/lib/auth/require-app-user";
import { APP_VERSION } from "@/lib/app-version";

export default async function AboutPage() {
  await requireAppUser();

  return (
    <div className="overflow-y-auto pt-safe">
      <GlowContainer size="md" as="div" className="pb-10 pt-6">
        <ProfileBackLink />
        <PageHeader title="About Glow" subtitle={ABOUT_MISSION} />

        <GlowCard padding="md" className="mb-4 border-white/[0.08]">
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-glow-text-tertiary">App</dt>
              <dd className="mt-1 text-glow-text">Glow</dd>
            </div>
            <div>
              <dt className="text-glow-text-tertiary">Version</dt>
              <dd className="mt-1 text-glow-text">{APP_VERSION}</dd>
            </div>
            <div>
              <dt className="text-glow-text-tertiary">Status</dt>
              <dd className="mt-1 text-glow-text">Private beta</dd>
            </div>
            {process.env.NODE_ENV !== "production" ? (
              <div>
                <dt className="text-glow-text-tertiary">Environment</dt>
                <dd className="mt-1 text-glow-text">Development</dd>
              </div>
            ) : null}
          </dl>
        </GlowCard>

        <GlowCard
          padding="md"
          className="mb-4 border-glow-accent/20 bg-glow-accent/[0.04]"
        >
          <p className="text-sm text-glow-accent">{LEGAL_DRAFT_BANNER}</p>
        </GlowCard>

        <ul className="space-y-2 text-sm">
          {[
            { href: "/profile/privacy", label: "Privacy" },
            { href: "/profile/terms", label: "Terms" },
            { href: "/profile/safety", label: "Safety" },
            { href: "/profile/help", label: "Help & feedback" },
          ].map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="inline-flex min-h-11 items-center text-glow-primary underline-offset-2 hover:underline"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </GlowContainer>
    </div>
  );
}
