import { LegalDocumentPage } from "@/features/profile/components/LegalDocumentPage";
import { PRIVACY_SECTIONS } from "@/features/profile/legal";
import { requireAppUser } from "@/lib/auth/require-app-user";

export default async function PrivacyPage() {
  await requireAppUser();
  return (
    <LegalDocumentPage
      title="Privacy"
      subtitle="A plain-language summary for private beta."
      sections={PRIVACY_SECTIONS}
    />
  );
}
