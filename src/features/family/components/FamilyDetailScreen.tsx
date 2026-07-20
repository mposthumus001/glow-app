import Link from "next/link";
import { ArrowLeft, Lock, Users } from "lucide-react";

import { GlowButton, GlowCard } from "@/components/ui";
import { textStyles } from "@/lib/theme";
import { cn } from "@/lib/utils/cn";

import type { SharedFamilyDetail } from "../types";
import {
  FAMILY_BACK_LINK_CLASS,
  FAMILY_CONTENT_CARD_CLASS,
  FAMILY_SECTION_STACK_CLASS,
} from "./familyPageLayout";
import { FamilyPageShell } from "./FamilyPageShell";
import { FamilyRoleBadge } from "./FamilyRoleBadge";

export type FamilyDetailScreenProps = {
  family: SharedFamilyDetail;
};

export function FamilyDetailScreen({ family }: FamilyDetailScreenProps) {
  const emptyCopy = family.isOwner
    ? "No Moments have been shared here yet."
    : "There are no shared Moments here yet.";

  return (
    <FamilyPageShell>
      <Link href="/family" className={FAMILY_BACK_LINK_CLASS}>
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to Family
      </Link>

      <header className="mb-4 space-y-3">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3 sm:gap-y-2">
          <div className="min-w-0 flex-1">
            <h1
              className={cn(
                textStyles.h1,
                "break-words text-[1.5rem] sm:text-[1.75rem]",
              )}
            >
              {family.name}
            </h1>
            <p className="mt-1.5 text-base leading-relaxed text-glow-text-secondary">
              Private family album
            </p>
          </div>
          <FamilyRoleBadge
            label={family.roleLabel}
            isOwner={family.isOwner}
            className="self-start"
          />
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-glow-text-secondary">
          <span className="inline-flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Private
          </span>
          <span>
            {family.memberCount}{" "}
            {family.memberCount === 1 ? "member" : "members"}
          </span>
        </div>
      </header>

      <div className={FAMILY_SECTION_STACK_CLASS}>
        {family.isOwner ? (
          <div className={FAMILY_CONTENT_CARD_CLASS}>
            <GlowCard
              padding="sm"
              className="border-white/[0.06] bg-white/[0.02]"
            >
              <p className="text-sm leading-relaxed text-glow-text-secondary">
                Invite the people you trust and manage who has access.
              </p>
              <div className="mt-4">
                <Link href={`/family/${family.id}/members`}>
                  <GlowButton
                    type="button"
                    variant="secondary"
                    size="md"
                    className="min-h-11"
                    leftIcon={<Users className="h-4 w-4" aria-hidden="true" />}
                  >
                    Manage members
                  </GlowButton>
                </Link>
              </div>
            </GlowCard>
          </div>
        ) : null}

        <div className={FAMILY_CONTENT_CARD_CLASS}>
          <GlowCard padding="sm" className="border-white/[0.08]">
            <div className="px-2 py-3 text-center sm:py-4">
              <p className="text-sm leading-relaxed text-glow-text-secondary">
                {emptyCopy}
              </p>
            </div>
          </GlowCard>
        </div>
      </div>
    </FamilyPageShell>
  );
}
