import Link from "next/link";

import { GlowCard } from "@/components/ui";
import { formatBabyAgeLine } from "@/lib/utils/baby-age";
import { cn } from "@/lib/utils/cn";

import type { BabyProfile } from "../types";
import {
  feedingMethodLabel,
  formatPrivateDate,
} from "../tracking/eventLogic";

export type BabyProfileCardProps = {
  baby: BabyProfile;
  className?: string;
};

export function BabyProfileCard({ baby, className }: BabyProfileCardProps) {
  const ageLine = formatBabyAgeLine({
    name: baby.name,
    dateOfBirth: baby.dateOfBirth,
    dueDate: baby.dueDate,
  });

  const dobLabel = formatPrivateDate(baby.dateOfBirth);
  const dueLabel = formatPrivateDate(baby.dueDate);
  const method = feedingMethodLabel(baby.feedingMethod);

  return (
    <GlowCard
      padding="md"
      className={cn("border-glow-primary/15 bg-glow-primary/[0.04]", className)}
    >
      <p className="text-sm font-medium text-glow-primary">Your baby</p>
      <h2 className="mt-1 text-xl font-semibold text-glow-text">{baby.name}</h2>
      {ageLine ? (
        <p className="mt-1 text-sm text-glow-text-secondary">
          {ageLine.replace(`${baby.name} · `, "")}
        </p>
      ) : null}

      <dl className="mt-4 space-y-2 text-sm">
        {dobLabel ? (
          <div className="flex justify-between gap-3">
            <dt className="text-glow-text-tertiary">Born</dt>
            <dd className="text-glow-text-secondary">{dobLabel}</dd>
          </div>
        ) : null}
        {!dobLabel && dueLabel ? (
          <div className="flex justify-between gap-3">
            <dt className="text-glow-text-tertiary">Due</dt>
            <dd className="text-glow-text-secondary">{dueLabel}</dd>
          </div>
        ) : null}
        {method ? (
          <div className="flex justify-between gap-3">
            <dt className="text-glow-text-tertiary">Feeding</dt>
            <dd className="text-glow-text-secondary">{method}</dd>
          </div>
        ) : null}
      </dl>

      <p className="mt-4 text-sm text-glow-text-tertiary">
        Private to your family.{" "}
        <Link
          href="/profile"
          className="text-glow-primary underline-offset-2 hover:underline"
        >
          Edit in You
        </Link>
      </p>
    </GlowCard>
  );
}
