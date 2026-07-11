import Link from "next/link";
import {
  Baby,
  CircleHelp,
  Heart,
  LogOut,
  Map,
  Shield,
  Users,
} from "lucide-react";

import { LogoutButton } from "@/components/auth/LogoutButton";
import { GlowCard } from "@/components/ui";
import { GlowContainer } from "@/components/layout";
import { PageHeader } from "@/components/shell/PageHeader";
import { cn } from "@/lib/utils/cn";

export type ProfileScreenProps = {
  displayName: string;
  /** Private to this settings page only — never shown elsewhere. */
  email: string | null;
  mapVisibilityLabel: string;
  babySummary: string | null;
  circleSummary: string | null;
};

type Entry = {
  href: string;
  title: string;
  description: string;
  icon: typeof Baby;
  external?: boolean;
};

/**
 * Profile / Settings foundation — private account context.
 */
export function ProfileScreen({
  displayName,
  email,
  mapVisibilityLabel,
  babySummary,
  circleSummary,
}: ProfileScreenProps) {
  const entries: Entry[] = [
    {
      href: "/baby",
      title: "Baby profile",
      description: babySummary ?? "Add or view your baby when you’re ready.",
      icon: Baby,
    },
    {
      href: "/profile#atlas-privacy",
      title: "Atlas privacy",
      description: mapVisibilityLabel,
      icon: Map,
    },
    {
      href: "/circle",
      title: "Your Circle",
      description: circleSummary ?? "Your small private group.",
      icon: Users,
    },
    {
      href: "/profile#help",
      title: "Help & feedback",
      description: "We’re listening — gently.",
      icon: CircleHelp,
    },
    {
      href: "/profile#privacy-safety",
      title: "Privacy & safety",
      description: "How Glow protects you and your family.",
      icon: Shield,
    },
  ];

  return (
    <div className="overflow-y-auto pt-safe">
      <GlowContainer size="md" as="div" className="pb-10 pt-6">
        <PageHeader
          title="You"
          subtitle="Your account, privacy, and the people you care for."
          action={<LogoutButton />}
        />

        <GlowCard padding="md" className="mb-6 border-white/[0.08]">
          <p className="text-sm text-glow-text-tertiary">Display name</p>
          <p className="mt-1 break-words text-xl font-semibold text-glow-text">
            {displayName}
          </p>
          {email ? (
            <div className="mt-5 border-t border-white/[0.06] pt-5">
              <p className="text-sm text-glow-text-tertiary">Email</p>
              <p className="mt-1 break-all text-sm text-glow-text-secondary">
                {email}
              </p>
              <p className="mt-2 text-xs text-glow-text-tertiary">
                Only visible to you on this page.
              </p>
            </div>
          ) : null}
        </GlowCard>

        <ul className="space-y-3">
          {entries.map((entry) => {
            const Icon = entry.icon;
            return (
              <li key={entry.href + entry.title}>
                <Link
                  href={entry.href}
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
                    <p className="font-medium text-glow-text">{entry.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-glow-text-secondary">
                      {entry.description}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>

        <section
          id="atlas-privacy"
          className="mt-8 scroll-mt-24"
          aria-labelledby="atlas-privacy-heading"
        >
          <GlowCard padding="md" className="border-white/[0.06]">
            <h2
              id="atlas-privacy-heading"
              className="text-base font-semibold text-glow-text"
            >
              Atlas privacy
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-glow-text-secondary">
              Current map visibility:{" "}
              <span className="text-glow-text">{mapVisibilityLabel}</span>.
              Editing this setting will arrive in a later sprint. Glow never
              shows exact addresses.
            </p>
          </GlowCard>
        </section>

        <section
          id="help"
          className="mt-4 scroll-mt-24"
          aria-labelledby="help-heading"
        >
          <GlowCard padding="md" className="border-white/[0.06]">
            <h2
              id="help-heading"
              className="flex items-center gap-2 text-base font-semibold text-glow-text"
            >
              <Heart className="h-4 w-4 text-glow-primary" aria-hidden="true" />
              Help & feedback
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-glow-text-secondary">
              In-app feedback is coming next. For now, reach out through your
              beta invite channel if something feels off.
            </p>
          </GlowCard>
        </section>

        <section
          id="privacy-safety"
          className="mt-4 scroll-mt-24"
          aria-labelledby="privacy-safety-heading"
        >
          <GlowCard padding="md" className="border-white/[0.06]">
            <h2
              id="privacy-safety-heading"
              className="text-base font-semibold text-glow-text"
            >
              Privacy & safety
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-glow-text-secondary">
              Glow is peer support — not emergency, medical, or crisis care. If
              you or someone else is in immediate danger, call{" "}
              <strong className="font-medium text-glow-text">000</strong>{" "}
              (Australia). For mental health support:{" "}
              <strong className="font-medium text-glow-text">
                Lifeline 13 11 14
              </strong>
              .
            </p>
            <div className="mt-5 flex items-center gap-2 border-t border-white/[0.06] pt-5">
              <LogOut
                className="h-4 w-4 text-glow-text-tertiary"
                aria-hidden="true"
              />
              <p className="text-sm text-glow-text-tertiary">
                Sign out anytime from the button above.
              </p>
            </div>
          </GlowCard>
        </section>
      </GlowContainer>
    </div>
  );
}
