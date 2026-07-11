import { TonightScreen } from "@/components/tonight";
import { requireAppUser } from "@/lib/auth/require-app-user";

export default async function TonightPage() {
  const { parent } = await requireAppUser();

  return <TonightScreen displayName={parent.display_name} />;
}
