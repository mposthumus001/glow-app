import { renderFamilyInviteAcceptPage } from "@/features/family/server/pages";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ token: string }>;
};

export default async function FamilyInviteAcceptPage({ params }: PageProps) {
  const { token } = await params;
  return renderFamilyInviteAcceptPage(token);
}
