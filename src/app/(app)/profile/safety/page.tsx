import { LegalDocumentPage } from "@/features/profile/components/LegalDocumentPage";
import { SAFETY_SECTIONS } from "@/features/profile/legal";
import { requireAppUser } from "@/lib/auth/require-app-user";

export default async function SafetyPage() {
  await requireAppUser();
  return (
    <LegalDocumentPage
      title="Safety"
      subtitle="Peer support limits and where to get urgent help."
      sections={SAFETY_SECTIONS}
    />
  );
}
