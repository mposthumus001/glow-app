import { Heart } from "lucide-react";

import { GlowCard } from "@/components/ui";
import { CIRCLE_NO_MATCH_HOLDING_MESSAGE } from "@/features/circles/assignment/assignmentLogic";
import { textStyles } from "@/lib/theme";
import { cn } from "@/lib/utils/cn";

export interface CircleUnassignedStateProps {
  message?: string;
}

export function CircleUnassignedState({
  message = CIRCLE_NO_MATCH_HOLDING_MESSAGE,
}: CircleUnassignedStateProps) {
  return (
    <section
      aria-labelledby="circle-unassigned-heading"
      className="flex flex-1 flex-col justify-center py-10"
    >
      <GlowCard padding="lg" className="border-white/[0.08] text-center">
        <div
          className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-glow-primary/15 text-glow-primary"
          aria-hidden="true"
        >
          <Heart className="h-6 w-6" strokeWidth={1.75} />
        </div>
        <h1
          id="circle-unassigned-heading"
          className={cn(textStyles.h2, "mt-5 text-xl")}
        >
          Your Circle is on its way
        </h1>
        <p className="mt-3 text-base leading-relaxed text-glow-text-secondary">
          {message}
        </p>
        <p className="mt-4 text-sm text-glow-text-tertiary">
          Private · Supportive · Never more than twelve
        </p>
      </GlowCard>
    </section>
  );
}
