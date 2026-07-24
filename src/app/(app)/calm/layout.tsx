import { CalmSegmentNav } from "@/features/calm/components/CalmSegmentNav";

export default function CalmLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <CalmSegmentNav />
      {children}
    </>
  );
}
