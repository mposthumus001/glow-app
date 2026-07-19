import { renderNewMomentPage } from "@/features/moments/server/pages";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ babyId: string }>;
};

export default async function NewBabyMomentPage({ params }: PageProps) {
  const { babyId } = await params;
  return renderNewMomentPage(babyId);
}
