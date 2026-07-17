import Link from "next/link";

import { GlowCard } from "@/components/ui";
import { GlowContainer } from "@/components/layout";
import { PageHeader } from "@/components/shell/PageHeader";
import { ProfileBackLink } from "@/features/profile";
import { CIRCLE_NO_MATCH_HOLDING_MESSAGE } from "@/features/circles/assignment/assignmentLogic";
import { loadAssignedCircleForParent } from "@/features/circles/service/CircleRepository";
import { requireAppUser } from "@/lib/auth/require-app-user";

function circleTypeLabel(type: string | undefined): string {
  switch (type) {
    case "birth_month":
      return "Birth month group";
    case "age_band":
      return "Baby age band";
    case "feeding_method":
      return "Feeding preference";
    case "nicu":
      return "NICU support";
    case "twins":
      return "Twins / multiples";
    case "local":
      return "Local area";
    default:
      return "General support circle";
  }
}

export default async function ProfileCirclePage() {
  const { user } = await requireAppUser();
  const result = await loadAssignedCircleForParent(user.id);

  return (
    <div className="overflow-y-auto pt-safe">
      <GlowContainer size="md" as="div" className="pb-10 pt-6">
        <ProfileBackLink />
        <PageHeader
          title="Your Circle"
          subtitle="Private information about your small group — never a public directory."
        />

        {result.status === "error" ? (
          <GlowCard padding="md" className="border-white/[0.08]">
            <p className="text-sm text-glow-text-secondary">{result.message}</p>
          </GlowCard>
        ) : null}

        {result.status === "unassigned" ? (
          <GlowCard padding="md" className="border-white/[0.08]">
            <p className="text-base text-glow-text">
              Your Circle is on its way
            </p>
            <p className="mt-2 text-sm text-glow-text-secondary">
              {result.message ?? CIRCLE_NO_MATCH_HOLDING_MESSAGE}
            </p>
            <Link
              href="/circle"
              className="mt-4 inline-flex text-sm text-glow-primary underline-offset-2 hover:underline"
            >
              Open Your Circle
            </Link>
          </GlowCard>
        ) : null}

        {result.status === "assigned" ? (
          <div className="space-y-4">
            <GlowCard padding="md" className="border-white/[0.08]">
              <h2 className="text-xl font-semibold text-glow-text">
                {result.data.circle.name}
              </h2>
              {result.data.circle.description ? (
                <p className="mt-2 text-sm leading-relaxed text-glow-text-secondary">
                  {result.data.circle.description}
                </p>
              ) : (
                <p className="mt-2 text-sm text-glow-text-secondary">
                  A small private group for parents supporting one another.
                </p>
              )}
              <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-glow-text-tertiary">Members</dt>
                  <dd className="mt-1 text-glow-text">
                    {result.data.memberCount} of {result.data.circle.max_members}
                  </dd>
                </div>
                <div>
                  <dt className="text-glow-text-tertiary">Awake now</dt>
                  <dd className="mt-1 text-glow-text">
                    {result.data.onlineCount == null
                      ? "Quiet for now"
                      : result.data.onlineCount === 0
                        ? "No one else awake right now"
                        : `${result.data.onlineCount} awake`}
                  </dd>
                </div>
                <div>
                  <dt className="text-glow-text-tertiary">Theme</dt>
                  <dd className="mt-1 text-glow-text">
                    {circleTypeLabel(result.data.circle.circle_type)}
                  </dd>
                </div>
                <div>
                  <dt className="text-glow-text-tertiary">Status</dt>
                  <dd className="mt-1 capitalize text-glow-text">
                    {result.data.circle.status}
                  </dd>
                </div>
              </dl>
            </GlowCard>

            <GlowCard padding="md" className="border-white/[0.08]">
              <h2 className="text-base font-semibold text-glow-text">
                Safety in Circle
              </h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-glow-text-secondary">
                <li>Report a message discreetly — reports stay private.</li>
                <li>Hide a message for yourself only — others are unaffected.</li>
                <li>No public member directory or emails.</li>
                <li>
                  Glow is peer support — call 000 in emergencies; Lifeline 13 11
                  14 for mental health support.
                </li>
              </ul>
            </GlowCard>

            <GlowCard padding="md" className="border-white/[0.08]">
              <h2 className="text-base font-semibold text-glow-text">
                Leaving or rematching
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-glow-text-secondary">
                Self-service leave and rematch are not available in private beta.
                If your Circle doesn’t feel right, send feedback from Help &amp;
                feedback — we’ll help carefully without automatic churn.
              </p>
              <Link
                href="/profile/help"
                className="mt-4 inline-flex text-sm text-glow-primary underline-offset-2 hover:underline"
              >
                Open Help &amp; feedback
              </Link>
            </GlowCard>

            <Link
              href="/circle"
              className="inline-flex h-12 w-full items-center justify-center rounded-glow-button border border-white/[0.1] text-sm font-medium text-glow-text transition-colors hover:bg-glow-card"
            >
              Enter Your Circle
            </Link>
          </div>
        ) : null}
      </GlowContainer>
    </div>
  );
}
