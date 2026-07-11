import Link from "next/link";
import {
  Baby,
  CircleHelp,
  Info,
  Leaf,
  Map,
  Scale,
  Settings,
  Shield,
  UserRound,
  Users,
} from "lucide-react";

import { GlowCard } from "@/components/ui";
import { GlowContainer } from "@/components/layout";
import { PageHeader } from "@/components/shell/PageHeader";
import { displayNameInitials } from "@/features/profile/validation";
import { cn } from "@/lib/utils/cn";

export type ProfileHomeProps = {
  displayName: string;
  email: string | null;
  mapVisibilityLabel: string;
  babySummary: string | null;
  circleSummary: string | null;
  appVersion: string;
};

type Section = {
  title: string;
  items: {
    href: string;
    title: string;
    description: string;
    icon: typeof Baby;
  }[];
};

/**
 * Profile / You landing — grouped rows, not a dense settings dashboard.
 */
export function ProfileHome({
  displayName,
  email,
  mapVisibilityLabel,
  babySummary,
  circleSummary,
  appVersion,
}: ProfileHomeProps) {
  const initials = displayNameInitials(displayName);

  const sections: Section[] = [
    {
      title: "You",
      items: [
        {
          href: "/profile/you",
          title: "Your profile",
          description: displayName,
          icon: UserRound,
        },
      ],
    },
    {
      title: "Baby",
      items: [
        {
          href: "/profile/baby",
          title: "Baby profile",
          description: babySummary ?? "Add or edit when you’re ready.",
          icon: Baby,
        },
      ],
    },
    {
      title: "Privacy",
      items: [
        {
          href: "/profile/atlas-privacy",
          title: "Atlas privacy",
          description: mapVisibilityLabel,
          icon: Map,
        },
        {
          href: "/profile/privacy",
          title: "Privacy summary",
          description: "How Glow handles your data (beta draft).",
          icon: Shield,
        },
      ],
    },
    {
      title: "Your Circle",
      items: [
        {
          href: "/profile/circle",
          title: "Circle information",
          description: circleSummary ?? "Your small private group.",
          icon: Users,
        },
      ],
    },
    {
      title: "Calm",
      items: [
        {
          href: "/profile/calm",
          title: "Calm preferences",
          description: "Volume, favourite, and device prefs.",
          icon: Leaf,
        },
      ],
    },
    {
      title: "Help and safety",
      items: [
        {
          href: "/profile/help",
          title: "Help & feedback",
          description: "Send a quiet note or report an issue.",
          icon: CircleHelp,
        },
        {
          href: "/profile/safety",
          title: "Safety",
          description: "Peer support limits and crisis contacts.",
          icon: Shield,
        },
        {
          href: "/profile/terms",
          title: "Terms",
          description: "Beta draft terms of use.",
          icon: Scale,
        },
      ],
    },
    {
      title: "Account",
      items: [
        {
          href: "/profile/account",
          title: "Account & session",
          description: email ? "Email, password, sign out, deletion" : "Sign out and account controls",
          icon: Settings,
        },
      ],
    },
    {
      title: "About Glow",
      items: [
        {
          href: "/profile/about",
          title: "About Glow",
          description: `Version ${appVersion} · private beta`,
          icon: Info,
        },
      ],
    },
  ];

  return (
    <div className="overflow-y-auto pt-safe">
      <GlowContainer size="md" as="div" className="pb-10 pt-6">
        <PageHeader
          title="You"
          subtitle="Your private space for profile, privacy, and trust."
        />

        <GlowCard padding="md" className="mb-8 border-white/[0.08]">
          <div className="flex items-center gap-4">
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-glow-primary/15 text-lg font-semibold text-glow-primary"
              aria-hidden="true"
            >
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xl font-semibold text-glow-text">
                {displayName}
              </p>
              <p className="mt-1 text-sm text-glow-text-tertiary">
                Private to you — never a public profile.
              </p>
            </div>
          </div>
        </GlowCard>

        <div className="space-y-8">
          {sections.map((section) => (
            <section key={section.title} aria-labelledby={`section-${section.title}`}>
              <h2
                id={`section-${section.title}`}
                className="mb-3 text-sm font-medium text-glow-text-secondary"
              >
                {section.title}
              </h2>
              <ul className="space-y-2">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-start gap-3 rounded-glow-card border border-white/[0.08] bg-glow-card/60 p-4",
                          "transition-colors hover:border-white/[0.12] hover:bg-glow-card",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glow-primary/50",
                        )}
                      >
                        <div
                          className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-glow-primary/10 text-glow-primary"
                          aria-hidden="true"
                        >
                          <Icon className="h-5 w-5" strokeWidth={1.75} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-glow-text">
                            {item.title}
                          </p>
                          <p className="mt-1 text-sm leading-relaxed text-glow-text-secondary">
                            {item.description}
                          </p>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </GlowContainer>
    </div>
  );
}
