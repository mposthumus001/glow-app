import { LegalDocumentPage } from "@/features/profile/components/LegalDocumentPage";
import { TERMS_SECTIONS } from "@/features/profile/legal";
import { requireAppUser } from "@/lib/auth/require-app-user";

export default async function TermsPage() {
  await requireAppUser();
  return (
    <LegalDocumentPage
      title="Terms"
      subtitle="Draft terms for private beta use."
      sections={TERMS_SECTIONS}
    />
  );
}
