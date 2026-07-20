import { renderFamilyDetailPage } from "@/features/family/server/pages";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ sharedFamilyId: string }>;
};

export default async function FamilyDetailPage({ params }: PageProps) {
  const { sharedFamilyId } = await params;
  return renderFamilyDetailPage(sharedFamilyId);
}
