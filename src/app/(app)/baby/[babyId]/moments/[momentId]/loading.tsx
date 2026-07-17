import { GlowContainer } from "@/components/layout";

export default function BabyMomentDetailLoading() {
  return (
    <div className="overflow-y-auto pt-safe">
      <GlowContainer size="md" as="div" className="pb-10 pt-6">
        <div className="mb-4 h-5 w-32 animate-pulse rounded bg-white/[0.06]" />
        <div className="mb-5 h-10 w-56 animate-pulse rounded-lg bg-white/[0.06]" />
        <div className="mb-5 aspect-[4/3] animate-pulse rounded-2xl bg-white/[0.06]" />
        <div className="h-32 animate-pulse rounded-2xl bg-white/[0.06]" />
      </GlowContainer>
    </div>
  );
}
