import { CalmScreen } from "@/components/calm/CalmScreen";
import { requireAppUser } from "@/lib/auth/require-app-user";

export default async function CalmPage() {
  await requireAppUser();
  return <CalmScreen />;
}
