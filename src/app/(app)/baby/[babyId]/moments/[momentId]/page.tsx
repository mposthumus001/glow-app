import { renderMomentDetailPage } from "@/features/moments/server/pages";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ babyId: string; momentId: string }>;
};

export default async function BabyMomentDetailPage({ params }: PageProps) {
  const { babyId, momentId } = await params;
  return renderMomentDetailPage(babyId, momentId);
}
