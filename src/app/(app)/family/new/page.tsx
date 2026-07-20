import { renderCreateFamilyPage } from "@/features/family/server/pages";

export const dynamic = "force-dynamic";

export default async function CreateFamilyPage() {
  return renderCreateFamilyPage();
}
