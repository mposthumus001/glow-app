import { MomentsGridSkeleton } from "@/features/moments/components/MomentsGridSkeleton";
import { GlowContainer } from "@/components/layout";

export default function BabyMomentsLoading() {
  return (
    <div className="overflow-y-auto pt-safe">
      <GlowContainer size="md" as="div" className="pb-10 pt-6">
        <div className="mb-6 h-8 w-40 animate-pulse rounded-lg bg-white/[0.06]" />
        <MomentsGridSkeleton />
      </GlowContainer>
    </div>
  );
}
