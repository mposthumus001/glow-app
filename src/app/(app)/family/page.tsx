import { renderFamilyHomePage } from "@/features/family/server/pages";

export const dynamic = "force-dynamic";

export default async function FamilyHomePage() {
  return renderFamilyHomePage();
}
