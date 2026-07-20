import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";

import { GlowCard } from "@/components/ui";
import { GlowContainer } from "@/components/layout";
import { PageHeader } from "@/components/shell/PageHeader";
import { cn } from "@/lib/utils/cn";

import type { SharedFamilyDetail } from "../types";

export type FamilyDetailScreenProps = {
  family: SharedFamilyDetail;
};

export function FamilyDetailScreen({ family }: FamilyDetailScreenProps) {
  const emptyCopy = family.isOwner
    ? "No Moments have been shared here yet."
    : "There are no shared Moments here yet.";

  return (
    <div className="overflow-x-hidden overflow-y-auto pt-safe">
      <GlowContainer size="md" as="div" className="max-w-full pb-10 pt-6">
        <Link
          href="/family"
          className="mb-4 inline-flex min-h-11 items-center gap-1.5 text-sm text-glow-text-secondary transition-colors hover:text-glow-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glow-primary/40 rounded-lg"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Family
        </Link>

        <PageHeader
          title={family.name}
          subtitle="Private family album"
          action={
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2.5 py-1",
                "text-[11px] font-medium tracking-wide",
                family.isOwner
                  ? "bg-glow-primary/15 text-glow-primary-light"
                  : "bg-white/[0.06] text-glow-text-secondary",
              )}
            >
              {family.roleLabel}
            </span>
          }
        />

        <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-glow-text-secondary">
          <span className="inline-flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5" aria-hidden="true" />
            Private
          </span>
          <span>
            {family.memberCount}{" "}
            {family.memberCount === 1 ? "member" : "members"}
          </span>
        </div>

        {family.isOwner ? (
          <GlowCard
            padding="md"
            className="mb-5 border-white/[0.06] bg-white/[0.02]"
          >
            <p className="text-sm leading-relaxed text-glow-text-tertiary">
              Invites and sharing arrive in a later update. For now, this space
              is ready — your album stays empty until you choose what to share.
            </p>
          </GlowCard>
        ) : null}

        <GlowCard padding="md" className="border-white/[0.08]">
          <div className="py-6 text-center">
            <p className="text-base leading-relaxed text-glow-text-secondary">
              {emptyCopy}
            </p>
          </div>
        </GlowCard>
      </GlowContainer>
    </div>
  );
}
