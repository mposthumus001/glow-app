import { cn } from "@/lib/utils/cn";

export function MomentsGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={cn(
            "aspect-square animate-pulse rounded-glow-card border border-white/[0.06] bg-white/[0.03] p-4",
          )}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}
