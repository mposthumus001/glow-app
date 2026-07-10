import Link from "next/link";

import { GlowCard } from "@/components/ui";
import { textStyles } from "@/lib/theme";
import { cn } from "@/lib/utils/cn";

export interface CircleErrorStateProps {
  message?: string;
  onRetryHref?: string;
}

export function CircleErrorState({
  message = "We couldn't reach your Circle just now.",
  onRetryHref = "/circle",
}: CircleErrorStateProps) {
  return (
    <section
      aria-labelledby="circle-error-heading"
      className="flex flex-1 flex-col justify-center py-10"
      role="alert"
    >
      <GlowCard padding="lg" className="border-red-400/20 text-center">
        <h1
          id="circle-error-heading"
          className={cn(textStyles.h2, "text-xl")}
        >
          Something went quiet
        </h1>
        <p className="mt-3 text-base leading-relaxed text-glow-text-secondary">
          {message}
        </p>
        <Link
          href={onRetryHref}
          className={cn(
            "mt-6 inline-flex h-12 w-full items-center justify-center rounded-glow-button",
            "border border-glow-card-border bg-transparent text-base font-medium text-glow-text",
            "transition-colors duration-200 hover:bg-glow-card hover:border-glow-card-border-hover",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glow-primary/50",
            "focus-visible:ring-offset-2 focus-visible:ring-offset-glow-background",
          )}
        >
          Try again
        </Link>
      </GlowCard>
    </section>
  );
}
