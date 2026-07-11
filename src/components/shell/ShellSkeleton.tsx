import { GlowCard } from "@/components/ui";
import { GlowContainer } from "@/components/layout";
import { cn } from "@/lib/utils/cn";

function Pulse({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl bg-white/[0.06] motion-reduce:animate-none",
        className,
      )}
      aria-hidden="true"
    />
  );
}

/**
 * Calm route loading skeleton — no large spinner, no white flash.
 */
export function ShellSkeleton({
  label = "Loading…",
}: {
  label?: string;
}) {
  return (
    <div className="overflow-y-auto pt-safe" aria-busy="true">
      <GlowContainer size="md" as="div" className="pb-10 pt-8">
        <p className="sr-only" role="status">
          {label}
        </p>
        <Pulse className="h-8 w-40" />
        <Pulse className="mt-3 h-4 w-64 max-w-full" />

        <GlowCard padding="md" className="mt-8 border-white/[0.06]">
          <Pulse className="h-5 w-1/3" />
          <Pulse className="mt-4 h-4 w-full" />
          <Pulse className="mt-2 h-4 w-5/6" />
          <Pulse className="mt-6 h-32 w-full rounded-2xl" />
        </GlowCard>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <GlowCard padding="md" className="border-white/[0.06]">
            <Pulse className="h-4 w-1/2" />
            <Pulse className="mt-4 h-3 w-full" />
          </GlowCard>
          <GlowCard padding="md" className="border-white/[0.06]">
            <Pulse className="h-4 w-1/2" />
            <Pulse className="mt-4 h-3 w-full" />
          </GlowCard>
        </div>
      </GlowContainer>
    </div>
  );
}
