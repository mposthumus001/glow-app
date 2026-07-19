import { renderMomentsAlbumPage } from "@/features/moments/server/pages";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ babyId: string }>;
};

export default async function BabyMomentsPage({ params }: PageProps) {
  const { babyId } = await params;
  return renderMomentsAlbumPage(babyId);
}
